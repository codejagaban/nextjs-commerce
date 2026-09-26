import { randomUUID } from 'node:crypto'
import { stripeAdapter } from '@payloadcms/plugin-ecommerce/payments/stripe'
import type { PaymentAdapter } from '@payloadcms/plugin-ecommerce/types'
import { createLocalReq } from 'payload'

type StripeAdapterArgs = Parameters<typeof stripeAdapter>[0]
type WebhookHandler = NonNullable<StripeAdapterArgs['webhooks']>[string]

/** A verified Stripe notification can settle an order even after the tab closes. */
export const settleStripePayment: WebhookHandler = async ({ event, req }) => {
  if (event.type !== 'payment_intent.succeeded') return
  const transactions = await req.payload.find({
    collection: 'transactions',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    where: { 'stripe.paymentIntentID': { equals: event.data.object.id } },
  })
  // A Stripe account may also receive payments from other applications.
  if (!transactions.docs.length) return
  if (transactions.docs.length !== 1) throw new Error('Ambiguous Stripe transaction.')
  const transaction = transactions.docs[0]
  const cartID = typeof transaction.cart === 'object' ? transaction.cart?.id : transaction.cart
  if (!cartID) throw new Error('Stripe transaction has no cart.')
  const cart = await req.payload.findByID({
    collection: 'carts',
    id: cartID,
    depth: 0,
    overrideAccess: true,
  })
  const customerID =
    typeof transaction.customer === 'object' ? transaction.customer?.id : transaction.customer
  const customer = customerID
    ? await req.payload.findByID({
        collection: 'users',
        id: customerID,
        depth: 0,
        overrideAccess: true,
      })
    : undefined
  const confirm = req.payload.config.endpoints.find(
    (endpoint) => endpoint.path === '/payments/stripe/confirm-order' && endpoint.method === 'post',
  )
  if (!confirm) throw new Error('Stripe confirmation endpoint is missing.')

  // Use a fresh internal request, never the webhook caller's user or input.
  // Reuse Payload's settlement validation, atomic claim, inventory update and
  // database transaction instead of maintaining a second order-creation path.
  const settlementReq = await createLocalReq(
    {
      ...(customer ? { user: { ...customer, collection: 'users' as const } } : {}),
      req: {
        data: {
          cartID,
          paymentIntentID: event.data.object.id,
          ...(!customer ? { customerEmail: transaction.customerEmail, secret: cart.secret } : {}),
        },
      },
    },
    req.payload,
  )
  const response = await confirm.handler(settlementReq)
  if (!response?.ok) throw new Error('Stripe order settlement failed; retry this webhook.')
}

export const storeStripeAdapter = (options: StripeAdapterArgs): PaymentAdapter => {
  const base = stripeAdapter({
    ...options,
    webhooks: { ...options.webhooks, 'payment_intent.succeeded': settleStripePayment },
  })
  return {
    ...base,
    initiatePayment: (args) =>
      base.initiatePayment({
        ...args,
        data: {
          ...args.data,
          cart: {
            ...args.data.cart,
            // Each attempt gets its own row IDs, shared by the Stripe snapshot
            // and transaction. Reusing cart IDs breaks retry; stripping them
            // after snapshot creation breaks Payload's settlement validation.
            items: args.data.cart.items?.map((item) => ({ ...item, id: randomUUID() })),
          },
        },
      }),
    endpoints: base.endpoints?.map((endpoint) => ({
      ...endpoint,
      handler: (req) => {
        if (!options.webhookSecret) {
          return Response.json({ message: 'Stripe webhook is not configured.' }, { status: 503 })
        }
        if (!req.headers.get('stripe-signature')) {
          return Response.json({ message: 'Stripe signature is required.' }, { status: 400 })
        }
        return endpoint.handler(req)
      },
    })),
  }
}
