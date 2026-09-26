import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { getPayload } from 'payload'
import { setTimeout as delay } from 'node:timers/promises'
import Stripe from 'stripe'

if (
  !process.env.DATABASE_URL?.endsWith('/commerce_test') ||
  !process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
) {
  throw new Error('Disposable commerce_test database and Stripe test mode are required.')
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const { default: config } = await import('../../src/payload.config')
const payload = await getPayload({ config })
const runID = randomUUID()
const email = `stripe-${runID}@example.com`
let exitCode = 0
try {
  const user = await payload.create({
    collection: 'users',
    data: {
      email,
      password: 'CommerceTest123!',
      roles: ['customer'],
    },
  })
  await payload.create({
    collection: 'addresses',
    data: {
      customer: user.id,
      firstName: 'Test',
      lastName: 'Shopper',
      addressLine1: '123 Test Street',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
    },
  })
  const product = await payload.create({
    collection: 'products',
    data: {
      title: `Stripe verification ${runID}`,
      slug: `stripe-${runID}`,
      _status: 'published',
      priceInUSDEnabled: true,
      priceInUSD: 2500,
      inventory: 10,
    },
  })
  const cart = await payload.create({
    collection: 'carts',
    data: {
      customer: user.id,
      currency: 'USD',
      items: [{ product: product.id, quantity: 1 }],
    },
  })
  const login = await fetch('http://localhost:3002/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'CommerceTest123!' }),
  })
  assert.equal(login.status, 200)
  const { token } = await login.json()
  const call = async (path: string, data: Record<string, unknown>) => {
    const response = await fetch(`http://localhost:3002/api/payments/stripe/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
      body: JSON.stringify(data),
    })
    const body = await response.json()
    assert.equal(response.status, 200, `${path}: ${JSON.stringify(body)}`)
    return body
  }
  const payment = await call('initiate', { cartID: cart.id })
  // A second initiation must remain safe before either attempt is paid.
  const abandoned = await call('initiate', { cartID: cart.id })
  await stripe.paymentIntents.cancel(abandoned.paymentIntentID)
  const intent = await stripe.paymentIntents.confirm(payment.paymentIntentID, {
    payment_method: 'pm_card_visa',
    return_url: 'http://localhost:3002/checkout/confirm-order',
  })
  assert.equal(intent.livemode, false)
  assert.equal(intent.status, 'succeeded')
  console.log(
    'Stripe test payment succeeded. Waiting for real webhook delivery, without browser confirmation.',
  )
  console.log(JSON.stringify({ browserTestEmail: email, productSlug: product.slug }))
  let orderID: number | undefined
  for (let attempt = 0; attempt < 60; attempt++) {
    const result = await payload.find({
      collection: 'transactions',
      depth: 0,
      where: { 'stripe.paymentIntentID': { equals: intent.id } },
    })
    const transaction = result.docs[0]
    if (transaction?.status === 'succeeded' && typeof transaction.order === 'number') {
      orderID = transaction.order
      break
    }
    await delay(1000)
  }
  assert(orderID, 'Real Stripe webhook did not settle the order within 60 seconds.')
  const confirmed = await call('confirm-order', { cartID: cart.id, paymentIntentID: intent.id })
  assert.equal(confirmed.orderID, orderID)
  const events = await stripe.events.list({ type: 'payment_intent.succeeded', limit: 100 })
  const event = events.data.find(
    (event) => event.type === 'payment_intent.succeeded' && event.data.object.id === intent.id,
  )
  assert(event, 'Stripe success event not found.')
  const body = JSON.stringify(event)
  const replay = await fetch('http://localhost:3002/api/payments/stripe/webhooks', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': stripe.webhooks.generateTestHeaderString({
        payload: body,
        secret: process.env.STRIPE_WEBHOOKS_SIGNING_SECRET!,
      }),
    },
  })
  assert.equal(replay.status, 200)
  const order = await payload.findByID({ collection: 'orders', id: orderID, depth: 0 })
  assert.equal(order.amount, 2500)
  assert.equal(order.currency, 'USD')
  assert.equal(order.customer, user.id)
  assert.equal((await payload.findByID({ collection: 'products', id: product.id })).inventory, 9)
  const purchasedCart = await payload.findByID({ collection: 'carts', id: cart.id })
  assert(purchasedCart.purchasedAt)
  assert.equal(purchasedCart.items?.length, 0)
  const orders = await payload.find({
    collection: 'orders',
    where: { customer: { equals: user.id } },
  })
  assert.equal(orders.docs.length, 1)
  console.log(
    JSON.stringify({
      orderID,
      paymentIntentID: intent.id,
      stripeStatus: intent.status,
      webhook: 'delivered',
      duplicateDelivery: 'safe',
      inventory: 9,
      currency: order.currency,
      amount: order.amount,
    }),
  )
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Stripe verification failed')
  exitCode = 1
} finally {
  await payload.destroy()
}
process.exit(exitCode)
