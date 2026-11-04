import { isDeepStrictEqual } from 'node:util'
import { APIError, type CollectionAfterChangeHook, type CollectionBeforeChangeHook } from 'payload'
import type { Order, Transaction } from '@/payload-types'
import { legacyOrderStates, paymentStateFor } from './states'

const managedFields = [
  'status',
  'orderStatus',
  'paymentStatus',
  'fulfillmentStatus',
  'returnStatus',
  'workflowVersion',
  'shipments',
  'workflowEvents',
  'returns',
  'productRefundTotal',
  'shippingRefundTotal',
  'taxRefundTotal',
  'amount',
  'currency',
  'subtotal',
  'discountTotal',
  'shippingTotal',
  'taxTotal',
] as const

/** REST/GraphQL/admin field edits cannot bypass the workflow or fabricate payment. */
export const guardOrderStates: CollectionBeforeChangeHook<Order> = ({
  data,
  originalDoc,
  operation,
  context,
}) => {
  if (operation === 'create') {
    Object.assign(data, legacyOrderStates(data.status), {
      paymentStatus: 'not_recorded',
      workflowVersion: 0,
    })
    data.shipments = []
    data.workflowEvents = []
    data.returns = []
    data.productRefundTotal = 0
    data.shippingRefundTotal = 0
    data.taxRefundTotal = 0
  } else if (!context.orderWorkflow) {
    for (const key of managedFields) {
      if (data[key] !== undefined && !isDeepStrictEqual(data[key], originalDoc?.[key])) {
        throw new APIError('Use the order workflow to change order states.', 400)
      }
    }
  }
  // Shipment line IDs and purchased quantities are immutable snapshots.
  if (operation === 'update' && data.items !== undefined && originalDoc) {
    const itemSnapshot = (items: Order['items']) =>
      (items ?? []).map((item) => ({
        id: item.id,
        product: typeof item.product === 'object' ? item.product?.id : item.product,
        variant: (typeof item.variant === 'object' ? item.variant?.id : item.variant) ?? null,
        quantity: item.quantity,
      }))
    if (!isDeepStrictEqual(itemSnapshot(data.items), itemSnapshot(originalDoc.items))) {
      throw new APIError('Purchased items cannot be changed. Use the fulfillment workflow.', 400)
    }
  }
  // Compatibility projection for the ecommerce plugin. Never use it as payment truth.
  const state = data.orderStatus ?? originalDoc?.orderStatus
  data.status =
    state === 'cancelled' ? 'cancelled' : state === 'completed' ? 'completed' : 'processing'
  return data
}

/** Runs in the settlement transaction, after the provider has validated payment. */
export const syncOrderPayment: CollectionAfterChangeHook<Transaction> = async ({ doc, req }) => {
  const orderID = typeof doc.order === 'object' ? doc.order?.id : doc.order
  if (!orderID) return doc
  const order = await req.payload.findByID({ collection: 'orders', id: orderID, depth: 0, req })
  const transactions = await req.payload.find({
    collection: 'transactions',
    req,
    depth: 0,
    pagination: false,
    limit: 0,
    where: { order: { equals: orderID } },
  })
  const refunds =
    (order.productRefundTotal ?? 0) + (order.shippingRefundTotal ?? 0) + (order.taxRefundTotal ?? 0)
  const paymentStatus = paymentStateFor(transactions.docs, order.amount ?? 0, refunds)
  if (paymentStatus !== order.paymentStatus) {
    await req.payload.update({
      collection: 'orders',
      id: orderID,
      req,
      context: { orderWorkflow: true },
      data: {
        paymentStatus,
        ...(paymentStatus === 'refunded'
          ? {
              productRefundTotal: Math.max(
                0,
                (order.subtotal ?? order.amount ?? 0) - (order.discountTotal ?? 0),
              ),
              shippingRefundTotal: order.shippingTotal ?? 0,
              taxRefundTotal: order.taxTotal ?? 0,
            }
          : {}),
      },
    })
  }
  return doc
}
