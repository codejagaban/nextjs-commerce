import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createLocalReq, getPayload, type Payload } from 'payload'
import type { Cart, User } from '@/payload-types'
import Stripe from 'stripe'
import { orderWorkflowHandler } from '@/orders/endpoint'
import { sendShipmentNotification } from '@/email/shipmentNotification'
import { orderRefundHandler, reconcileRefundHandler } from '@/orders/refundEndpoint'
import { orderReturnHandler } from '@/orders/returnEndpoint'
import { syncStripeRefund } from '@/payments/refunds'

// Only the external Stripe transport is replaced in CI. All Payload endpoints,
// access checks, signatures, settlement transactions and inventory are real.
const intents = new Map<string, Stripe.PaymentIntent>()
const refunds = new Map<string, Stripe.Refund>()
let nextRefundStatus = 'succeeded'
let refundTimeout = false

async function operation(
  handler: typeof orderRefundHandler,
  id: number,
  data: Record<string, unknown>,
  user: User | undefined = admin,
  extra = {},
) {
  const req = await createLocalReq(
    {
      ...(user ? { user: { ...user, collection: 'users' as const } } : {}),
      req: { routeParams: { id: String(id), ...extra }, data },
    },
    payload,
  )
  return (await handler(req)) as Response
}

let payload: Payload
let customer: User
let outsider: User
let admin: User
const carts: number[] = []
const products: number[] = []
const sentEmails: Record<string, unknown>[] = []
const runID = randomUUID()
const signingSecret = process.env.STRIPE_WEBHOOKS_SIGNING_SECRET!
const signing = new Stripe('sk_test_signatures_only')

async function workflow(id: number, data: Record<string, unknown>, user: User | undefined = admin) {
  const req = await createLocalReq(
    {
      ...(user ? { user: { ...user, collection: 'users' as const } } : {}),
      req: { routeParams: { id: String(id) }, data },
    },
    payload,
  )
  return (await orderWorkflowHandler(req)) as Response
}

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
  expect(orders.docs[0]).toMatchObject({
    orderStatus: 'open',
    paymentStatus: 'paid',
    fulfillmentStatus: 'unfulfilled',
    returnStatus: 'none',
  })
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
    vi.spyOn(
      Object.getPrototypeOf(signing.refunds) as Stripe.RefundsResource,
      'list',
    ).mockImplementation(((params: Stripe.RefundListParams) => ({
      autoPagingToArray: async () =>
        [...refunds.values()].filter((row) => row.payment_intent === params.payment_intent),
    })) as never)
    vi.spyOn(
      Object.getPrototypeOf(signing.refunds) as Stripe.RefundsResource,
      'retrieve',
    ).mockImplementation((async (id: string) => refunds.get(id)) as never)
    vi.spyOn(
      Object.getPrototypeOf(signing.refunds) as Stripe.RefundsResource,
      'create',
    ).mockImplementation((async (params: Stripe.RefundCreateParams) => {
      const existing = [...refunds.values()].find(
        (row) =>
          row.metadata?.commerce_refund ===
          (params.metadata as Record<string, string> | undefined)?.commerce_refund,
      )
      const row =
        existing ??
        ({
          id: `re_${randomUUID()}`,
          payment_intent: params.payment_intent,
          amount: params.amount,
          currency: 'usd',
          metadata: params.metadata,
          status: nextRefundStatus,
        } as Stripe.Refund)
      refunds.set(row.id, row)
      if (refundTimeout) {
        refundTimeout = false
        throw new Error('Timeout after provider accepted refund')
      }
      return row
    }) as never)
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
    admin = await payload.create({
      collection: 'users',
      data: {
        email: `fulfillment-admin-${runID}@example.com`,
        password: 'CommerceTest123!',
        roles: ['admin'],
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
        if (transaction.order)
          await payload.delete({
            collection: 'order-refunds',
            where: {
              order: {
                equals:
                  typeof transaction.order === 'object' ? transaction.order.id : transaction.order,
              },
            },
          })
        await payload.delete({
          collection: 'orders',
          where: { transactions: { equals: transaction.id } },
        })
        await payload.delete({ collection: 'transactions', id: transaction.id })
      }
      await payload.delete({ collection: 'carts', id: cart })
    }
    for (const id of products) await payload.delete({ collection: 'products', id })
    for (const user of [customer, outsider, admin])
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

    await expect(
      payload.update({ collection: 'orders', id: order.id, data: { status: 'completed' } }),
    ).rejects.toThrow('Use the order workflow')
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
      payload.update({
        collection: 'orders',
        id: order.id,
        context: { orderWorkflow: true },
        data: { orderStatus: 'cancelled' },
      }),
      payload.update({
        collection: 'orders',
        id: order.id,
        context: { orderWorkflow: true },
        data: { orderStatus: 'cancelled' },
      }),
    ])

    const terminalOrder = await payload.findByID({ collection: 'orders', id: order.id })
    expect(terminalOrder.inventoryRestockedAt).toBeTruthy()
    expect(terminalOrder.paymentStatus).toBe('paid')
    expect((await payload.findByID({ collection: 'products', id: f.product.id })).inventory).toBe(
      10,
    )

    await payload.update({
      collection: 'orders',
      id: order.id,
      context: { orderWorkflow: true },
      data: { orderStatus: 'cancelled' },
    })
    expect((await payload.findByID({ collection: 'products', id: f.product.id })).inventory).toBe(
      10,
    )
  })

  it('does not restock or change fulfillment when a payment is refunded', async () => {
    const f = await fixture()
    f.intent.status = 'succeeded'
    await webhook(f.intent)
    const order = await verifySettlement(f.cart, f.product.id)
    const transactionID = order.transactions![0] as number
    await payload.update({
      collection: 'transactions',
      id: transactionID,
      data: { status: 'refunded' },
    })
    expect(await payload.findByID({ collection: 'orders', id: order.id })).toMatchObject({
      orderStatus: 'open',
      paymentStatus: 'refunded',
      productRefundTotal: 5000,
      fulfillmentStatus: 'unfulfilled',
      returnStatus: 'none',
      inventoryRestockedAt: null,
    })
    expect((await payload.findByID({ collection: 'products', id: f.product.id })).inventory).toBe(8)
  })

  it('fulfills partial shipments, records tracking and delivery, and leaves payment and stock intact', async () => {
    const f = await fixture()
    f.intent.status = 'succeeded'
    await webhook(f.intent)
    let order = await verifySettlement(f.cart, f.product.id)
    const send = async (action: string, extras = {}) => {
      const response = await workflow(order.id, {
        requestID: randomUUID(),
        version: order.workflowVersion,
        action,
        notifyCustomer: false,
        ...extras,
      })
      expect(response.status).toBe(200)
      order = (await response.json()).order
    }
    await send('prepare')
    expect(order.fulfillmentStatus).toBe('preparing')
    await send('ship', {
      carrier: 'Royal Mail',
      trackingNumber: 'TEST-A',
      trackingURL: 'https://tracking.example.com/TEST-A',
      items: [{ orderItemID: order.items![0].id, quantity: 1 }],
    })
    expect(order.fulfillmentStatus).toBe('partially_fulfilled')
    await send('deliver', { shipmentID: order.shipments![0].id })
    expect(order.fulfillmentStatus).toBe('partially_fulfilled')
    await send('ship', {
      carrier: 'Royal Mail',
      items: [{ orderItemID: order.items![0].id, quantity: 1 }],
    })
    expect(order.fulfillmentStatus).toBe('shipped')
    await send('tracking', {
      shipmentID: order.shipments![1].id,
      carrier: 'Royal Mail',
      trackingNumber: 'TEST-B',
    })
    await send('deliver', { shipmentID: order.shipments![1].id })
    expect(order.fulfillmentStatus).toBe('delivered')
    await send('complete')
    expect(order.orderStatus).toBe('completed')
    expect(order.paymentStatus).toBe('paid')
    expect(order.workflowEvents).toHaveLength(7)
    expect((await payload.findByID({ collection: 'products', id: f.product.id })).inventory).toBe(8)
  })

  it('rejects unauthorized, stale, duplicate-key and over-quantity fulfillment writes', async () => {
    const f = await fixture()
    f.intent.status = 'succeeded'
    await webhook(f.intent)
    const order = await verifySettlement(f.cart, f.product.id)
    const command = {
      requestID: randomUUID(),
      version: order.workflowVersion,
      action: 'ship',
      notifyCustomer: false,
      carrier: 'Royal Mail',
      items: [{ orderItemID: order.items![0].id, quantity: 1 }],
    }
    expect((await workflow(order.id, command, outsider)).status).toBe(403)
    expect(
      (await workflow(order.id, { ...command, items: [{ orderItemID: 'foreign', quantity: 1 }] }))
        .status,
    ).toBe(409)
    expect((await payload.findByID({ collection: 'orders', id: order.id })).workflowVersion).toBe(0)
    const results = await Promise.all([
      workflow(order.id, command),
      workflow(order.id, { ...command, requestID: randomUUID() }),
    ])
    expect(results.map((r) => r.status).sort()).toEqual([200, 409])
    const winner = await results.find((r) => r.status === 200)!.json()
    const winningCommand =
      winner.order.workflowEvents[0].requestID === command.requestID
        ? command
        : { ...command, requestID: winner.order.workflowEvents[0].requestID }
    expect((await workflow(order.id, winningCommand)).status).toBe(200)
    expect((await workflow(order.id, { ...winningCommand, carrier: 'Other' })).status).toBe(409)
    const final = await payload.findByID({ collection: 'orders', id: order.id })
    expect(final.shipments).toHaveLength(1)
    await expect(
      payload.update({ collection: 'orders', id: order.id, data: { items: null } }),
    ).rejects.toThrow('Purchased items cannot be changed')
    await expect(
      payload.update({ collection: 'orders', id: order.id, data: { shipments: [] } }),
    ).rejects.toThrow('Use the order workflow')
    expect(
      (
        await workflow(order.id, {
          ...command,
          requestID: randomUUID(),
          version: final.workflowVersion,
          action: 'cancel',
        })
      ).status,
    ).toBe(409)
    expect((await payload.findByID({ collection: 'products', id: f.product.id })).inventory).toBe(8)
  })

  it('persists shipments when SMTP fails and retries the notification without shipping twice', async () => {
    const f = await fixture(true)
    f.intent.status = 'succeeded'
    await webhook(f.intent)
    const order = await verifySettlement(f.cart, f.product.id)
    const before = sentEmails.length
    vi.mocked(payload.sendEmail).mockRejectedValueOnce(new Error('SMTP unavailable'))
    const command = {
      requestID: randomUUID(),
      version: order.workflowVersion,
      action: 'ship',
      carrier: 'Royal Mail',
      trackingURL: 'https://tracking.example.com/TEST',
      items: [{ orderItemID: order.items![0].id, quantity: 2 }],
    }
    const response = await workflow(order.id, command)
    expect(response.status).toBe(200)
    expect((await response.json()).notificationStatus).toBe('failed')
    const entries = await payload.find({
      collection: 'shipment-notifications',
      where: { order: { equals: order.id } },
    })
    expect(entries.docs).toHaveLength(1)
    expect(entries.docs[0].status).toBe('failed')
    const sent = await Promise.all([
      sendShipmentNotification(payload, entries.docs[0].id),
      sendShipmentNotification(payload, entries.docs[0].id),
    ])
    expect(sent.sort()).toEqual(['sent', 'unchanged'])
    expect(sentEmails).toHaveLength(before + 1)
    expect(sentEmails.at(-1)?.text).toContain('Track shipment: https://tracking.example.com/TEST')
    expect(sentEmails.at(-1)?.text).toContain('accessToken=')
    expect((await workflow(order.id, command)).status).toBe(200)
    expect((await payload.findByID({ collection: 'orders', id: order.id })).shipments).toHaveLength(
      1,
    )
    expect(sentEmails).toHaveLength(before + 1)
  })

  it('issues partial and full refunds without restocking or changing fulfillment', async () => {
    const f = await fixture()
    f.intent.status = 'succeeded'
    await webhook(f.intent)
    let order = await verifySettlement(f.cart, f.product.id)
    const command = {
      requestID: randomUUID(),
      version: order.workflowVersion,
      productAmount: 2000,
      shippingAmount: 0,
      taxAmount: 0,
      reason: 'Partial refund',
    }
    expect((await operation(orderRefundHandler, order.id, command, outsider)).status).toBe(403)
    const response = await operation(orderRefundHandler, order.id, command)
    expect(await response.clone().json()).toMatchObject({
      refund: { status: 'succeeded', amount: 2000 },
    })
    expect(response.status).toBe(200)
    order = await payload.findByID({ collection: 'orders', id: order.id, depth: 0 })
    expect(order).toMatchObject({
      paymentStatus: 'partially_refunded',
      productRefundTotal: 2000,
      fulfillmentStatus: 'unfulfilled',
      returnStatus: 'none',
    })
    const calls = vi.mocked(signing.refunds.create).mock.calls.length
    expect((await operation(orderRefundHandler, order.id, command)).status).toBe(200)
    expect(vi.mocked(signing.refunds.create).mock.calls).toHaveLength(calls)
    expect(
      (await operation(orderRefundHandler, order.id, { ...command, productAmount: 1 })).status,
    ).toBe(409)
    expect(
      (
        await operation(orderRefundHandler, order.id, {
          ...command,
          requestID: randomUUID(),
          version: order.workflowVersion,
          productAmount: 3001,
        })
      ).status,
    ).toBe(409)
    expect(
      (
        await operation(orderRefundHandler, order.id, {
          ...command,
          requestID: randomUUID(),
          version: order.workflowVersion,
          productAmount: 3000,
        })
      ).status,
    ).toBe(200)
    expect(await payload.findByID({ collection: 'orders', id: order.id })).toMatchObject({
      paymentStatus: 'refunded',
      productRefundTotal: 5000,
    })
    expect((await payload.findByID({ collection: 'products', id: f.product.id })).inventory).toBe(8)
    await expect(
      payload.update({ collection: 'orders', id: order.id, data: { productRefundTotal: 0 } }),
    ).rejects.toThrow('Use the order workflow')
  })

  it('reserves pending refunds, reconciles success once, and uses signed refund webhooks', async () => {
    const f = await fixture()
    f.intent.status = 'succeeded'
    await webhook(f.intent)
    let order = await verifySettlement(f.cart, f.product.id)
    nextRefundStatus = 'pending'
    const command = {
      requestID: randomUUID(),
      version: order.workflowVersion,
      productAmount: 1000,
      shippingAmount: 0,
      taxAmount: 0,
      reason: 'Pending refund',
    }
    const response = await operation(orderRefundHandler, order.id, command)
    nextRefundStatus = 'succeeded'
    expect(response.status).toBe(200)
    const op = (await response.json()).refund
    order = await payload.findByID({ collection: 'orders', id: order.id, depth: 0 })
    expect(order.paymentStatus).toBe('paid')
    expect(
      (
        await operation(orderRefundHandler, order.id, {
          ...command,
          requestID: randomUUID(),
          version: order.workflowVersion,
        })
      ).status,
    ).toBe(409)
    const row = refunds.get(op.providerRefundID)!
    row.status = 'succeeded'
    const body = JSON.stringify({
      id: `evt_${randomUUID()}`,
      type: 'refund.updated',
      data: { object: row },
    })
    const headers = new Headers({
      'stripe-signature': signing.webhooks.generateTestHeaderString({
        payload: body,
        secret: signingSecret,
      }),
    })
    const req = await createLocalReq({ req: { headers, text: async () => body } }, payload)
    expect(
      (
        (await payload.config.endpoints
          .find((e) => e.path === '/payments/stripe/webhooks')!
          .handler(req)) as Response
      ).status,
    ).toBe(200)
    const results = await Promise.all([
      operation(reconcileRefundHandler, order.id, {}, admin, { refundID: String(op.id) }),
      operation(reconcileRefundHandler, order.id, {}, admin, { refundID: String(op.id) }),
    ])
    expect(results.map((r) => r.status)).toEqual([200, 200])
    expect(await payload.findByID({ collection: 'orders', id: order.id })).toMatchObject({
      productRefundTotal: 1000,
      paymentStatus: 'partially_refunded',
    })
  })

  it('recovers a refund accepted before timeout without issuing another', async () => {
    const f = await fixture()
    f.intent.status = 'succeeded'
    await webhook(f.intent)
    const order = await verifySettlement(f.cart, f.product.id)
    refundTimeout = true
    const command = {
      requestID: randomUUID(),
      version: order.workflowVersion,
      productAmount: 1000,
      shippingAmount: 0,
      taxAmount: 0,
      reason: 'Connection failure test',
    }
    expect((await operation(orderRefundHandler, order.id, command)).status).toBe(502)
    const count = refunds.size
    expect((await operation(orderRefundHandler, order.id, command)).status).toBe(200)
    expect(refunds.size).toBe(count)
    expect(
      (await payload.findByID({ collection: 'orders', id: order.id })).productRefundTotal,
    ).toBe(1000)
  })

  it('allows one concurrent refund reservation and records a failed provider refund without money totals', async () => {
    const f = await fixture()
    f.intent.status = 'succeeded'
    await webhook(f.intent)
    const order = await verifySettlement(f.cart, f.product.id)
    nextRefundStatus = 'failed'
    const command = {
      version: order.workflowVersion,
      productAmount: 1000,
      shippingAmount: 0,
      taxAmount: 0,
      reason: 'Failure test',
    }
    const results = await Promise.all([
      operation(orderRefundHandler, order.id, { ...command, requestID: randomUUID() }),
      operation(orderRefundHandler, order.id, { ...command, requestID: randomUUID() }),
    ])
    nextRefundStatus = 'succeeded'
    expect(results.map((r) => r.status).sort()).toEqual([200, 409])
    expect(await payload.findByID({ collection: 'orders', id: order.id })).toMatchObject({
      productRefundTotal: 0,
      paymentStatus: 'paid',
    })
  })

  it('corrects a refund that later fails at the provider without touching goods', async () => {
    const f = await fixture()
    f.intent.status = 'succeeded'
    await webhook(f.intent)
    const order = await verifySettlement(f.cart, f.product.id)
    const response = await operation(orderRefundHandler, order.id, {
      requestID: randomUUID(),
      version: order.workflowVersion,
      productAmount: 1000,
      shippingAmount: 0,
      taxAmount: 0,
      reason: 'Late failure',
    })
    expect(response.status).toBe(200)
    const op = (await response.json()).refund
    refunds.get(op.providerRefundID)!.status = 'failed'
    await syncStripeRefund(payload, op.providerRefundID)
    await syncStripeRefund(payload, op.providerRefundID)
    expect(await payload.findByID({ collection: 'orders', id: order.id })).toMatchObject({
      productRefundTotal: 0,
      paymentStatus: 'paid',
      fulfillmentStatus: 'unfulfilled',
    })
    expect((await payload.findByID({ collection: 'products', id: f.product.id })).inventory).toBe(8)
  })

  it('never reissues an ambiguous request after the safe provider retry window', async () => {
    const f = await fixture()
    f.intent.status = 'succeeded'
    await webhook(f.intent)
    const order = await verifySettlement(f.cart, f.product.id)
    const op = await payload.create({
      collection: 'order-refunds',
      data: {
        order: order.id,
        transaction: order.transactions![0] as number,
        actor: admin.id,
        requestID: randomUUID(),
        requestHash: 'old-reservation',
        reason: 'Old uncertain attempt',
        paymentIntentID: f.intent.id,
        currency: 'USD',
        productAmount: 1000,
        shippingAmount: 0,
        taxAmount: 0,
        amount: 1000,
        status: 'submitting',
      },
    })
    await payload.db.updateOne({
      collection: 'order-refunds',
      id: op.id,
      data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() },
    })
    const calls = vi.mocked(signing.refunds.create).mock.calls.length
    expect(
      (await operation(reconcileRefundHandler, order.id, {}, admin, { refundID: String(op.id) }))
        .status,
    ).toBe(409)
    expect(vi.mocked(signing.refunds.create).mock.calls).toHaveLength(calls)
    expect((await payload.findByID({ collection: 'order-refunds', id: op.id })).status).toBe(
      'needs_review',
    )
    expect(
      (await operation(reconcileRefundHandler, order.id, {}, outsider, { refundID: String(op.id) }))
        .status,
    ).toBe(403)
  })

  it('blocks new money movement when Stripe contains an unallocated external refund', async () => {
    const f = await fixture()
    f.intent.status = 'succeeded'
    await webhook(f.intent)
    const order = await verifySettlement(f.cart, f.product.id)
    const id = `re_external_${randomUUID()}`
    refunds.set(id, {
      id,
      payment_intent: f.intent.id,
      amount: 500,
      currency: 'usd',
      status: 'succeeded',
      metadata: {},
    } as Stripe.Refund)
    const calls = vi.mocked(signing.refunds.create).mock.calls.length
    const response = await operation(orderRefundHandler, order.id, {
      requestID: randomUUID(),
      version: order.workflowVersion,
      productAmount: 1000,
      shippingAmount: 0,
      taxAmount: 0,
      reason: 'External reconciliation required',
    })
    expect(response.status).toBe(409)
    expect(vi.mocked(signing.refunds.create).mock.calls).toHaveLength(calls)
    expect(
      (await payload.findByID({ collection: 'orders', id: order.id })).productRefundTotal,
    ).toBe(0)
  })

  it('receives returns and restores selected stock exactly once independently of payment', async () => {
    const f = await fixture()
    f.intent.status = 'succeeded'
    await webhook(f.intent)
    let order = await verifySettlement(f.cart, f.product.id)
    await workflow(order.id, {
      requestID: randomUUID(),
      version: order.workflowVersion,
      action: 'ship',
      notifyCustomer: false,
      carrier: 'Royal Mail',
      items: [{ orderItemID: order.items![0].id, quantity: 2 }],
    })
    order = await payload.findByID({ collection: 'orders', id: order.id, depth: 0 })
    const command = {
      requestID: randomUUID(),
      version: order.workflowVersion,
      action: 'request',
      reason: 'Wrong size',
      items: [{ orderItemID: order.items![0].id, quantity: 2 }],
    }
    expect((await operation(orderReturnHandler, order.id, command, outsider)).status).toBe(403)
    const response = await operation(orderReturnHandler, order.id, command)
    expect(response.status).toBe(200)
    order = (await response.json()).order
    const receive = {
      requestID: randomUUID(),
      version: order.workflowVersion,
      action: 'receive',
      returnID: order.returns![0].id,
      items: [{ orderItemID: order.items![0].id, quantity: 1, restock: true }],
    }
    const results = await Promise.all([
      operation(orderReturnHandler, order.id, receive),
      operation(orderReturnHandler, order.id, { ...receive, requestID: randomUUID() }),
    ])
    expect(results.map((r) => r.status).sort()).toEqual([200, 409])
    const winningResponse = await results.find((r) => r.status === 200)!.json()
    const winningCommand =
      winningResponse.order.workflowEvents.at(-1).requestID === receive.requestID
        ? receive
        : { ...receive, requestID: winningResponse.order.workflowEvents.at(-1).requestID }
    expect((await operation(orderReturnHandler, order.id, winningCommand)).status).toBe(200)
    order = await payload.findByID({ collection: 'orders', id: order.id, depth: 0 })
    expect(order).toMatchObject({
      returnStatus: 'partially_returned',
      paymentStatus: 'paid',
      fulfillmentStatus: 'shipped',
    })
    expect(order.workflowEvents!.at(-1)!.details).toMatchObject({
      items: [{ quantity: 1, restock: true }],
    })
    expect((await payload.findByID({ collection: 'products', id: f.product.id })).inventory).toBe(9)
    expect(
      (
        await operation(orderReturnHandler, order.id, {
          ...receive,
          requestID: randomUUID(),
          version: order.workflowVersion,
          items: [{ ...receive.items[0], restock: false }],
        })
      ).status,
    ).toBe(200)
    expect((await payload.findByID({ collection: 'orders', id: order.id })).returnStatus).toBe(
      'returned',
    )
    expect((await payload.findByID({ collection: 'products', id: f.product.id })).inventory).toBe(9)
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
