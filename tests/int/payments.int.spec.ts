import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createLocalReq, getPayload, type Payload } from 'payload'
import type { Cart, User } from '@/payload-types'
import Stripe from 'stripe'

// Only the external Stripe transport is replaced in CI. All Payload endpoints,
// access checks, signatures, settlement transactions and inventory are real.
const intents = new Map<string, Stripe.PaymentIntent>()

let payload: Payload
let customer: User
let outsider: User
const carts: number[] = []
const products: number[] = []
const sentEmails: Record<string, unknown>[] = []
const runID = randomUUID()
const signingSecret = process.env.STRIPE_WEBHOOKS_SIGNING_SECRET!
const signing = new Stripe('sk_test_signatures_only')

async function endpoint(path: string, data: Record<string, unknown>, user?: User) {
  const handler = payload.config.endpoints.find((e) => e.path === `/payments/stripe/${path}`)!
  const req = await createLocalReq(
    { ...(user ? { user: { ...user, collection: 'users' as const } } : {}), req: { data } },
    payload,
  )
  return handler.handler(req) as Promise<Response>
}

async function webhook(
  intent: Stripe.PaymentIntent,
  signature: 'valid' | 'invalid' | 'missing' = 'valid',
) {
  const body = JSON.stringify({
    id: `evt_${randomUUID()}`,
    type: 'payment_intent.succeeded',
    data: { object: intent },
  })
  const headers = new Headers()
  if (signature !== 'missing')
    headers.set(
      'stripe-signature',
      signing.webhooks.generateTestHeaderString({
        payload: body,
        secret: signature === 'valid' ? signingSecret : 'wrong-secret',
      }),
    )
  const req = await createLocalReq({ req: { headers, text: async () => body } }, payload)
  const handler = payload.config.endpoints.find((e) => e.path === '/payments/stripe/webhooks')!
  return handler.handler(req) as Promise<Response>
}

async function fixture(guest = false) {
  const product = await payload.create({
    collection: 'products',
    data: {
      title: `Payment ${runID}`,
      slug: `payment-${randomUUID()}`,
      _status: 'published',
      priceInUSDEnabled: true,
      priceInUSD: 2500,
      inventory: 10,
    },
  })
  products.push(product.id)
  const cart = await payload.create({
    collection: 'carts',
    data: {
      ...(guest ? { customerEmail: `guest-${runID}@example.com` } : { customer: customer.id }),
      currency: 'USD',
      items: [{ product: product.id, quantity: 2 }],
    },
  })
  carts.push(cart.id)
  const data = {
    cartID: cart.id,
    ...(guest ? { secret: cart.secret, customerEmail: `guest-${runID}@example.com` } : {}),
  }
  const user = guest ? undefined : customer
  const response = await endpoint('initiate', data, user)
  expect(response.status).toBe(200)
  const initiated = await response.json()
  const intent = intents.get(initiated.paymentIntentID)!
  return { product, cart, data: { ...data, paymentIntentID: intent.id }, user, intent }
}

async function verifySettlement(cart: Cart, productID: number) {
  const transactions = await payload.find({
    collection: 'transactions',
    depth: 0,
    where: { cart: { equals: cart.id }, status: { equals: 'succeeded' } },
  })
  expect(transactions.docs).toHaveLength(1)
  const transaction = transactions.docs[0]
  const orders = await payload.find({
    collection: 'orders',
    depth: 0,
    where: { transactions: { equals: transaction.id } },
  })
  expect(orders.docs).toHaveLength(1)
  expect(orders.docs[0].amount).toBe(5000)
  expect(orders.docs[0].currency).toBe('USD')
  expect(transaction.order).toBe(orders.docs[0].id)
  expect((await payload.findByID({ collection: 'products', id: productID })).inventory).toBe(8)
  const purchasedCart = await payload.findByID({ collection: 'carts', id: cart.id })
  expect(purchasedCart.purchasedAt).toBeTruthy()
  expect(purchasedCart.items).toHaveLength(0)
  return orders.docs[0]
}

describe('Stripe settlement and webhooks', () => {
  beforeAll(async () => {
    vi.spyOn(
      Object.getPrototypeOf(signing.customers) as Stripe.CustomersResource,
      'list',
    ).mockImplementation((async () => ({ data: [{ id: 'cus_test_commerce' }] })) as never)
    vi.spyOn(
      Object.getPrototypeOf(signing.paymentIntents) as Stripe.PaymentIntentsResource,
      'create',
    ).mockImplementation((async (data: Stripe.PaymentIntentCreateParams) => {
      const id = `pi_${randomUUID()}`
      const intent = {
        ...data,
        id,
        status: 'requires_payment_method',
        livemode: false,
        client_secret: `${id}_secret_test`,
      } as Stripe.PaymentIntent
      intents.set(id, intent)
      return intent
    }) as never)
    vi.spyOn(
      Object.getPrototypeOf(signing.paymentIntents) as Stripe.PaymentIntentsResource,
      'retrieve',
    ).mockImplementation((async (id: string) => intents.get(id)) as never)
    const { default: config } = await import('@/payload.config')
    payload = await getPayload({ config })
    vi.spyOn(payload, 'sendEmail').mockImplementation(async (message) => {
      sentEmails.push(message as Record<string, unknown>)
      return {} as never
    })
    customer = await payload.create({
      collection: 'users',
      data: {
        email: `payment-${runID}@example.com`,
        password: 'CommerceTest123!',
        roles: ['customer'],
      },
    })
    outsider = await payload.create({
      collection: 'users',
      data: {
        email: `outsider-${runID}@example.com`,
        password: 'CommerceTest123!',
        roles: ['customer'],
      },
    })
  })
  afterAll(async () => {
    if (!payload) return
    for (const cart of carts) {
      const transactions = await payload.find({
        collection: 'transactions',
        where: { cart: { equals: cart } },
        limit: 100,
      })
      for (const transaction of transactions.docs) {
        await payload.delete({
          collection: 'orders',
          where: { transactions: { equals: transaction.id } },
        })
        await payload.delete({ collection: 'transactions', id: transaction.id })
      }
      await payload.delete({ collection: 'carts', id: cart })
    }
    for (const id of products) await payload.delete({ collection: 'products', id })
    for (const user of [customer, outsider])
      if (user) await payload.delete({ collection: 'users', id: user.id })
    await payload.destroy()
    vi.restoreAllMocks()
  })

  it('gives retries distinct rows while keeping the Stripe snapshot equal to stored items', async () => {
    const f = await fixture()
    const second = await endpoint('initiate', f.data, f.user)
    expect(second.status).toBe(200)
    const transactions = await payload.find({
      collection: 'transactions',
      depth: 0,
      where: { cart: { equals: f.cart.id } },
    })
    expect(transactions.docs).toHaveLength(2)
    expect(new Set(transactions.docs.map((t) => t.items![0].id)).size).toBe(2)
    expect(transactions.docs[0].items![0].id).not.toBe(f.cart.items![0].id)
    f.intent.status = 'succeeded'
    const confirmation = await endpoint('confirm-order', f.data, f.user)
    expect(confirmation.status).toBe(200)
    await verifySettlement(f.cart, f.product.id)
  })

  for (const guest of [false, true])
    it(`settles ${guest ? 'guest' : 'customer'} orders through webhook alone and tolerates retries`, async () => {
      const f = await fixture(guest)
      const emailsBeforeSettlement = sentEmails.length
      f.intent.status = 'succeeded'
      expect((await webhook(f.intent)).status).toBe(200)
      const order = await verifySettlement(f.cart, f.product.id)
      expect(order.accessToken).toBeTruthy()
      expect(sentEmails).toHaveLength(emailsBeforeSettlement + 1)
      expect(sentEmails.at(-1)).toMatchObject({
        subject: `Order #${order.id} confirmed`,
        to: guest ? `guest-${runID}@example.com` : customer.email,
      })
      expect(sentEmails.at(-1)?.html).toContain(`Order #${order.id}`)
      expect(sentEmails.at(-1)?.text).toContain('Payment has been received')
      expect((await webhook(f.intent)).status).toBe(200)
      const confirmation = await endpoint('confirm-order', f.data, f.user)
      expect(confirmation.status).toBe(200)
      expect((await confirmation.json()).orderID).toBe(order.id)
      await verifySettlement(f.cart, f.product.id)
      expect(sentEmails).toHaveLength(emailsBeforeSettlement + 1)
    })

  it('handles the webhook and browser confirmation arriving together', async () => {
    const f = await fixture()
    f.intent.status = 'succeeded'
    const results = await Promise.all([
      webhook(f.intent),
      endpoint('confirm-order', f.data, f.user),
    ])
    expect(results.map((r) => r.status)).toEqual([200, 200])
    await verifySettlement(f.cart, f.product.id)
  })

  it('restores paid inventory once when terminal order updates race', async () => {
    const f = await fixture()
    f.intent.status = 'succeeded'
    expect((await webhook(f.intent)).status).toBe(200)
    const order = await verifySettlement(f.cart, f.product.id)

    await payload.update({ collection: 'orders', id: order.id, data: { status: 'completed' } })
    expect((await payload.findByID({ collection: 'products', id: f.product.id })).inventory).toBe(8)
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { inventoryRestockedAt: '2000-01-01T00:00:00.000Z' },
    })
    expect(
      (await payload.findByID({ collection: 'orders', id: order.id })).inventoryRestockedAt,
    ).toBeNull()

    await Promise.all([
      payload.update({ collection: 'orders', id: order.id, data: { status: 'cancelled' } }),
      payload.update({ collection: 'orders', id: order.id, data: { status: 'refunded' } }),
    ])

    const terminalOrder = await payload.findByID({ collection: 'orders', id: order.id })
    expect(terminalOrder.inventoryRestockedAt).toBeTruthy()
    expect((await payload.findByID({ collection: 'products', id: f.product.id })).inventory).toBe(
      10,
    )

    await payload.update({ collection: 'orders', id: order.id, data: { status: 'refunded' } })
    expect((await payload.findByID({ collection: 'products', id: f.product.id })).inventory).toBe(
      10,
    )
  })

  it('keeps the order successful when email fails and retries delivery', async () => {
    const f = await fixture()
    const emailsBeforeSettlement = sentEmails.length
    vi.mocked(payload.sendEmail).mockRejectedValueOnce(new Error('SMTP unavailable'))
    f.intent.status = 'succeeded'

    expect((await webhook(f.intent)).status).toBe(200)
    const order = await verifySettlement(f.cart, f.product.id)
    expect(sentEmails).toHaveLength(emailsBeforeSettlement)
    expect(
      (await payload.findByID({ collection: 'orders', id: order.id })).confirmationEmailSentAt,
    ).toBeNull()

    expect((await endpoint('confirm-order', f.data, f.user)).status).toBe(200)
    expect(sentEmails).toHaveLength(emailsBeforeSettlement + 1)
    expect(
      (await payload.findByID({ collection: 'orders', id: order.id })).confirmationEmailSentAt,
    ).toBeTruthy()
  })

  it('rejects missing and invalid webhook signatures without creating an order', async () => {
    const f = await fixture()
    f.intent.status = 'succeeded'
    expect((await webhook(f.intent, 'missing')).status).toBe(400)
    expect((await webhook(f.intent, 'invalid')).status).toBe(400)
    expect((await payload.findByID({ collection: 'products', id: f.product.id })).inventory).toBe(
      10,
    )
  })

  it('does not settle an unpaid intent or a payment with the wrong amount', async () => {
    const f = await fixture()
    expect((await endpoint('confirm-order', f.data, f.user)).status).toBe(500)
    f.intent.status = 'succeeded'
    f.intent.amount = 1
    expect((await endpoint('confirm-order', f.data, f.user)).status).toBe(500)
    expect((await payload.findByID({ collection: 'products', id: f.product.id })).inventory).toBe(
      10,
    )
  })

  it('does not allow a different customer to confirm a payment', async () => {
    const f = await fixture()
    f.intent.status = 'succeeded'
    await expect(endpoint('confirm-order', f.data, outsider)).rejects.toThrow()
    expect((await payload.findByID({ collection: 'products', id: f.product.id })).inventory).toBe(
      10,
    )
  })
})
