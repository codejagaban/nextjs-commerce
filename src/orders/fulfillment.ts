import type { Order } from '@/payload-types'

export class WorkflowError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message)
  }
}
type Shipment = NonNullable<Order['shipments']>[number]
export type WorkflowCommand = {
  requestID: string
  version: number
  action: 'prepare' | 'ship' | 'tracking' | 'deliver' | 'complete' | 'cancel'
  shipmentID?: string
  carrier?: string
  trackingNumber?: string
  trackingURL?: string
  notifyCustomer: boolean
  items?: { orderItemID: string; quantity: number }[]
}
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new WorkflowError('Invalid request.')
  return value as Record<string, unknown>
}
const text = (value: unknown, max: number, required = false) => {
  if (value == null && !required) return ''
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()))
    throw new WorkflowError('A required value is missing or too long.')
  return value.trim()
}
export const safeTrackingURL = (value: string): string => {
  if (!value) return ''
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error()
    return url.toString()
  } catch {
    throw new WorkflowError('Tracking links must use HTTPS and contain no login details.')
  }
}
export const parseWorkflowCommand = (value: unknown): WorkflowCommand => {
  const data = record(value)
  const requestID = text(data.requestID, 36, true)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestID))
    throw new WorkflowError('A valid request ID is required.')
  if (!Number.isSafeInteger(data.version) || Number(data.version) < 0)
    throw new WorkflowError('An order version is required.')
  if (
    !['prepare', 'ship', 'tracking', 'deliver', 'complete', 'cancel'].includes(String(data.action))
  )
    throw new WorkflowError('Unknown order action.')
  if (data.notifyCustomer !== undefined && typeof data.notifyCustomer !== 'boolean')
    throw new WorkflowError('Invalid notification preference.')
  const result: WorkflowCommand = {
    requestID,
    version: Number(data.version),
    action: data.action as WorkflowCommand['action'],
    notifyCustomer: data.notifyCustomer !== false,
  }
  if (result.action === 'deliver' || result.action === 'tracking')
    result.shipmentID = text(data.shipmentID, 36, true)
  if (result.action === 'ship' || result.action === 'tracking') {
    result.carrier = text(data.carrier, 100, true)
    result.trackingNumber = text(data.trackingNumber, 150)
    result.trackingURL = safeTrackingURL(text(data.trackingURL, 2048))
  }
  if (result.action === 'ship') {
    if (!Array.isArray(data.items) || !data.items.length || data.items.length > 200)
      throw new WorkflowError('Select at least one item to ship.')
    result.items = data.items
      .map((item) => {
        const row = record(item)
        if (!Number.isSafeInteger(row.quantity) || Number(row.quantity) <= 0)
          throw new WorkflowError('Shipment quantities must be positive whole numbers.')
        return { orderItemID: text(row.orderItemID, 100, true), quantity: Number(row.quantity) }
      })
      .sort((a, b) => a.orderItemID.localeCompare(b.orderItemID))
    if (new Set(result.items.map((item) => item.orderItemID)).size !== result.items.length)
      throw new WorkflowError('An item can appear only once per shipment.')
  }
  return result
}
export const remainingItems = (order: Pick<Order, 'items' | 'shipments'>) =>
  (order.items ?? []).map((item) => ({
    ...item,
    remaining:
      item.quantity -
      (order.shipments ?? []).reduce(
        (sum, shipment) =>
          sum +
          (shipment.items ?? [])
            .filter((row) => row.orderItemID === item.id)
            .reduce((total, row) => total + row.quantity, 0),
        0,
      ),
  }))
export const fulfillmentStateFor = (
  items: Order['items'],
  shipments: Order['shipments'],
): Order['fulfillmentStatus'] => {
  if (!shipments?.length) return 'unfulfilled'
  if (remainingItems({ items, shipments }).some((item) => item.remaining > 0))
    return 'partially_fulfilled'
  return shipments.every((shipment) => shipment.deliveredAt) ? 'delivered' : 'shipped'
}
/** Pure transition logic. Only the transactional endpoint may persist the result. */
export const applyWorkflowCommand = (
  order: Order,
  command: WorkflowCommand,
  now: string,
  shipmentID: string,
): Partial<Order> => {
  if (order.orderStatus === 'cancelled')
    throw new WorkflowError('Cancelled orders cannot be fulfilled.', 409)
  const shipments = [...(order.shipments ?? [])]
  if (command.action === 'tracking' || command.action === 'deliver') {
    const index = shipments.findIndex((shipment) => shipment.id === command.shipmentID)
    if (index < 0) throw new WorkflowError('Shipment not found.', 404)
    if (command.action === 'deliver') {
      if (shipments[index].deliveredAt)
        throw new WorkflowError('This shipment is already delivered.', 409)
      shipments[index] = { ...shipments[index], deliveredAt: now }
    } else {
      shipments[index] = {
        ...shipments[index],
        carrier: command.carrier!,
        trackingNumber: command.trackingNumber,
        trackingURL: command.trackingURL,
      }
    }
    return { shipments, fulfillmentStatus: fulfillmentStateFor(order.items, shipments) }
  }
  if (order.orderStatus !== 'open') throw new WorkflowError('This order is already completed.', 409)
  if (command.action === 'cancel') {
    if (shipments.length || !['unfulfilled', 'preparing'].includes(order.fulfillmentStatus))
      throw new WorkflowError(
        'Shipped goods require a return. This order cannot be cancelled.',
        409,
      )
    return { orderStatus: 'cancelled' }
  }
  if (command.action === 'complete') {
    if (!['delivered', 'fulfilled'].includes(order.fulfillmentStatus))
      throw new WorkflowError('Deliver every shipment before completing the order.', 409)
    return { orderStatus: 'completed' }
  }
  if (!['paid', 'partially_refunded'].includes(order.paymentStatus))
    throw new WorkflowError('Only orders with recorded payment can be prepared or shipped.', 409)
  if (command.action === 'prepare') {
    if (order.fulfillmentStatus !== 'unfulfilled')
      throw new WorkflowError('This order is already in fulfillment.', 409)
    return { fulfillmentStatus: 'preparing' }
  }
  if (order.fulfillmentStatus === 'fulfilled')
    throw new WorkflowError('This legacy order is already fulfilled.', 409)
  const remaining = new Map(remainingItems(order).map((item) => [item.id, item.remaining]))
  for (const item of command.items ?? []) {
    if (!remaining.has(item.orderItemID) || item.quantity > remaining.get(item.orderItemID)!)
      throw new WorkflowError('Shipment quantity exceeds the remaining order quantity.', 409)
  }
  const shipment: Shipment = {
    id: shipmentID,
    carrier: command.carrier!,
    trackingNumber: command.trackingNumber,
    trackingURL: command.trackingURL,
    shippedAt: now,
    items: command.items!,
  }
  shipments.push(shipment)
  return { shipments, fulfillmentStatus: fulfillmentStateFor(order.items, shipments) }
}
