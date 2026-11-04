import Stripe from 'stripe'
import {
  createLocalReq,
  initTransaction,
  commitTransaction,
  killTransaction,
  type Payload,
} from 'payload'
import type { OrderRefund } from '@/payload-types'
import { WorkflowError } from '@/orders/fulfillment'

const stripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) throw new WorkflowError('Stripe is not configured.', 503)
  return new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 1, timeout: 15000 })
}
const relationID = (value: number | { id: number }) =>
  typeof value === 'object' ? value.id : value

/** Fetch current provider state, not an out-of-order webhook snapshot. Never issue money here. */
export async function reconcileRefund(
  payload: Payload,
  operation: OrderRefund,
  refund: Stripe.Refund,
) {
  const intent =
    typeof refund.payment_intent === 'object' ? refund.payment_intent?.id : refund.payment_intent
  if (
    intent !== operation.paymentIntentID ||
    refund.amount !== operation.amount ||
    refund.currency.toUpperCase() !== operation.currency.toUpperCase() ||
    refund.metadata?.commerce_refund !== operation.requestID ||
    (operation.providerRefundID && operation.providerRefundID !== refund.id)
  )
    throw new Error('Provider refund does not match the reserved operation.')
  const req = await createLocalReq({}, payload)
  const owns = await initTransaction(req)
  if (!owns) throw new Error('Refund reconciliation needs a transaction.')
  try {
    const orderID = relationID(operation.order)
    // Serializes refund totals with returns, cancellation, and other workflow actions.
    await payload.db.updateOne({
      collection: 'orders',
      id: orderID,
      req,
      data: { workflowVersion: { $inc: 1 } },
    })
    const current = await payload.findByID({
      collection: 'order-refunds',
      id: operation.id,
      req,
      depth: 0,
    })
    const providerStatus = refund.status ?? 'pending'
    if (!['pending', 'requires_action', 'succeeded', 'failed', 'canceled'].includes(providerStatus))
      throw new Error('Unsupported provider refund status.')
    const status = providerStatus as OrderRefund['status']
    const updated = await payload.update({
      collection: 'order-refunds',
      id: operation.id,
      req,
      data: { providerRefundID: refund.id, status },
    })
    const contribution = Number(status === 'succeeded') - Number(current.status === 'succeeded')
    if (contribution !== 0) {
      const order = await payload.findByID({ collection: 'orders', id: orderID, req, depth: 0 })
      const productRefundTotal =
        (order.productRefundTotal ?? 0) + contribution * current.productAmount
      const shippingRefundTotal =
        (order.shippingRefundTotal ?? 0) + contribution * current.shippingAmount
      const taxRefundTotal = (order.taxRefundTotal ?? 0) + contribution * current.taxAmount
      if ([productRefundTotal, shippingRefundTotal, taxRefundTotal].some((amount) => amount < 0))
        throw new Error('Refund reconciliation would produce negative totals.')
      if (productRefundTotal + shippingRefundTotal + taxRefundTotal > (order.amount ?? 0))
        throw new Error(
          'Refund totals exceed the recorded payment. Manual reconciliation required.',
        )
      await payload.update({
        collection: 'orders',
        id: orderID,
        req,
        context: { orderWorkflow: true },
        data: {
          productRefundTotal,
          shippingRefundTotal,
          taxRefundTotal,
          paymentStatus:
            productRefundTotal + shippingRefundTotal + taxRefundTotal >= (order.amount ?? 0)
              ? 'refunded'
              : productRefundTotal + shippingRefundTotal + taxRefundTotal > 0
                ? 'partially_refunded'
                : 'paid',
          workflowEvents: [
            ...(order.workflowEvents ?? []),
            {
              action: `refund_${status}`,
              actor: relationID(current.actor),
              occurredAt: new Date().toISOString(),
              requestID: `refund:${status}:${current.requestID}`,
              requestHash: current.requestHash,
            },
          ],
        },
      })
    }
    await commitTransaction(req)
    return updated
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}

/** Durable request + provider idempotency. Ambiguous old requests never reissue money. */
export async function executeRefund(payload: Payload, operation: OrderRefund) {
  if (['succeeded', 'failed', 'canceled'].includes(operation.status)) return operation
  const stripe = stripeClient()
  if (operation.providerRefundID)
    return reconcileRefund(
      payload,
      operation,
      await stripe.refunds.retrieve(operation.providerRefundID),
    )
  const providerRefunds = await stripe.refunds
    .list({ payment_intent: operation.paymentIntentID, limit: 100 })
    .autoPagingToArray({ limit: 10000 })
  if (providerRefunds.length >= 10000)
    throw new WorkflowError(
      'Refund history exceeds the automatic reconciliation limit. Reconcile with Stripe manually.',
      409,
    )
  const existing = providerRefunds.find(
    (row) => row.metadata?.commerce_refund === operation.requestID,
  )
  if (existing) return reconcileRefund(payload, operation, existing)
  const activeExternal = providerRefunds.filter(
    (row) => !['failed', 'canceled'].includes(row.status ?? 'pending'),
  )
  const local = await payload.find({
    collection: 'order-refunds',
    depth: 0,
    pagination: false,
    limit: 0,
    where: { order: { equals: relationID(operation.order) } },
  })
  const knownIDs = new Set(local.docs.map((row) => row.providerRefundID).filter(Boolean))
  // Dashboard-originated refunds need financial allocation before another app refund.
  if (activeExternal.some((row) => !knownIDs.has(row.id)))
    throw new WorkflowError(
      'Stripe has an unallocated refund. Reconcile it before issuing another.',
      409,
    )
  if (Date.now() - Date.parse(operation.createdAt) >= 23 * 60 * 60 * 1000) {
    await payload.update({
      collection: 'order-refunds',
      id: operation.id,
      data: { status: 'needs_review' },
    })
    throw new WorkflowError(
      'This refund is too old to safely resubmit. Check Stripe and reconcile it manually.',
      409,
    )
  }
  const refund = await stripe.refunds.create(
    {
      payment_intent: operation.paymentIntentID,
      amount: operation.amount,
      reason: 'requested_by_customer',
      metadata: {
        commerce_refund: operation.requestID,
        commerce_order: String(relationID(operation.order)),
      },
    },
    { idempotencyKey: `commerce-refund:${operation.requestID}` },
  )
  return reconcileRefund(payload, operation, refund)
}

export async function syncStripeRefund(payload: Payload, refundID: string) {
  const stripe = stripeClient()
  const refund = await stripe.refunds.retrieve(refundID)
  if (!refund.metadata?.commerce_refund) return // External refunds require explicit allocation.
  const operations = await payload.find({
    collection: 'order-refunds',
    depth: 0,
    limit: 1,
    where: { requestID: { equals: refund.metadata.commerce_refund } },
  })
  if (!operations.docs.length) return
  await reconcileRefund(payload, operations.docs[0], refund)
}
