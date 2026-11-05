import type { Order } from '@/payload-types'
import { WorkflowError } from './fulfillment'

export type ReturnLine = { orderItemID: string; quantity: number; restock?: boolean }
export type ReturnCommand = {
  requestID: string
  version: number
  action: 'request' | 'receive'
  returnID?: string
  reason?: string
  items: ReturnLine[]
}
export function parseReturnCommand(value: unknown): ReturnCommand {
  const data = value as ReturnCommand
  if (
    !data ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      data.requestID ?? '',
    ) ||
    !Number.isSafeInteger(data.version) ||
    data.version < 0
  )
    throw new WorkflowError('A valid request ID and order version are required.')
  if (!['request', 'receive'].includes(data.action))
    throw new WorkflowError('Unknown return action.')
  if (!Array.isArray(data.items) || !data.items.length || data.items.length > 200)
    throw new WorkflowError('Choose at least one item.')
  const items = data.items
    .map((line) => {
      if (
        !line ||
        typeof line.orderItemID !== 'string' ||
        !line.orderItemID ||
        !Number.isSafeInteger(line.quantity) ||
        line.quantity <= 0 ||
        (line.restock !== undefined && typeof line.restock !== 'boolean')
      )
        throw new WorkflowError('Enter valid whole item quantities and restock choices.')
      return {
        orderItemID: line.orderItemID,
        quantity: line.quantity,
        restock: data.action === 'receive' && line.restock === true,
      }
    })
    .sort((a, b) => a.orderItemID.localeCompare(b.orderItemID))
  if (new Set(items.map((line) => line.orderItemID)).size !== items.length)
    throw new WorkflowError('Duplicate return items.')
  if (
    data.action === 'request' &&
    (typeof data.reason !== 'string' || !data.reason.trim() || data.reason.length > 500)
  )
    throw new WorkflowError('Enter a return reason, up to 500 characters.')
  if (data.action === 'receive' && typeof data.returnID !== 'string')
    throw new WorkflowError('Select a return.')
  return {
    requestID: data.requestID,
    version: data.version,
    action: data.action,
    items,
    ...(data.action === 'request' ? { reason: data.reason!.trim() } : { returnID: data.returnID }),
  }
}

export const returnableItems = (order: Order) =>
  (order.items ?? []).map((item) => {
    const shipped =
      order.fulfillmentStatus === 'fulfilled'
        ? item.quantity
        : (order.shipments ?? []).reduce(
            (total, shipment) =>
              total +
              shipment.items
                .filter((line) => line.orderItemID === item.id)
                .reduce((sum, line) => sum + line.quantity, 0),
            0,
          )
    const requested = (order.returns ?? []).reduce(
      (sum, row) =>
        sum +
        row.items
          .filter((line) => line.orderItemID === item.id)
          .reduce((total, line) => total + line.quantity, 0),
      0,
    )
    return { ...item, remaining: Math.max(0, shipped - requested) }
  })

export function applyReturn(order: Order, command: ReturnCommand, now: string, id: string) {
  const returns = structuredClone(order.returns ?? [])
  const restock: ReturnLine[] = []
  if (command.action === 'request') {
    if (order.orderStatus === 'cancelled' || order.inventoryRestockedAt)
      throw new WorkflowError('Cancelled orders cannot accept returns.', 409)
    const available = new Map(returnableItems(order).map((item) => [item.id, item.remaining]))
    for (const line of command.items)
      if (line.quantity > (available.get(line.orderItemID) ?? 0))
        throw new WorkflowError(
          'Return quantity exceeds shipped items not already in a return.',
          409,
        )
    returns.push({
      id,
      reason: command.reason!,
      requestedAt: now,
      items: command.items.map((line) => ({
        orderItemID: line.orderItemID,
        quantity: line.quantity,
        received: 0,
        restocked: 0,
      })),
    })
  } else {
    const row = returns.find((row) => row.id === command.returnID)
    if (!row) throw new WorkflowError('Return not found.', 404)
    for (const line of command.items) {
      const item = row.items.find((item) => item.orderItemID === line.orderItemID)
      if (!item || line.quantity > item.quantity - item.received)
        throw new WorkflowError('Received quantity exceeds outstanding return items.', 409)
      item.received += line.quantity
      if (line.restock) {
        item.restocked += line.quantity
        restock.push(line)
      }
    }
  }
  const received = returns.reduce(
    (sum, row) => sum + row.items.reduce((n, line) => n + line.received, 0),
    0,
  )
  const total = (order.items ?? []).reduce((sum, item) => sum + item.quantity, 0)
  const returnStatus: Order['returnStatus'] =
    received >= total && total > 0 ? 'returned' : received > 0 ? 'partially_returned' : 'requested'
  return { returns, returnStatus, restock }
}
