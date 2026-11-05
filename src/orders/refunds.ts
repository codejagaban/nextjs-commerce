import type { Order, OrderRefund } from '@/payload-types'
import { WorkflowError } from './fulfillment'

export type RefundCommand = {
  requestID: string
  version: number
  productAmount: number
  shippingAmount: number
  taxAmount: number
  reason: string
}
export function parseRefundCommand(value: unknown): RefundCommand {
  const data = value as RefundCommand
  if (
    !data ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      data.requestID ?? '',
    ) ||
    !Number.isSafeInteger(data.version) ||
    data.version < 0
  )
    throw new WorkflowError('A valid request ID and order version are required.')
  const components = [data.productAmount, data.shippingAmount, data.taxAmount]
  if (
    components.some((n) => !Number.isSafeInteger(n) || n < 0) ||
    !Number.isSafeInteger(components.reduce((a, b) => a + b, 0)) ||
    components.every((n) => n === 0)
  )
    throw new WorkflowError('Refund amounts must be positive whole minor currency units in total.')
  if (typeof data.reason !== 'string' || !data.reason.trim() || data.reason.length > 500)
    throw new WorkflowError('Enter a refund reason, up to 500 characters.')
  return {
    requestID: data.requestID,
    version: data.version,
    productAmount: data.productAmount,
    shippingAmount: data.shippingAmount,
    taxAmount: data.taxAmount,
    reason: data.reason.trim(),
  }
}
export function refundBalance(order: Order) {
  return {
    productAmount: Math.max(
      0,
      (order.subtotal ?? order.amount ?? 0) -
        (order.discountTotal ?? 0) -
        (order.productRefundTotal ?? 0),
    ),
    shippingAmount: Math.max(0, (order.shippingTotal ?? 0) - (order.shippingRefundTotal ?? 0)),
    taxAmount: Math.max(0, (order.taxTotal ?? 0) - (order.taxRefundTotal ?? 0)),
  }
}
export function validateRefund(order: Order, command: RefundCommand, operations: OrderRefund[]) {
  if (!['paid', 'partially_refunded'].includes(order.paymentStatus))
    throw new WorkflowError('Only recorded, settled payments can be refunded.', 409)
  if (operations.some((op) => !['succeeded', 'failed', 'canceled'].includes(op.status)))
    throw new WorkflowError('Resolve the outstanding refund before starting another.', 409)
  const balance = refundBalance(order)
  for (const key of ['productAmount', 'shippingAmount', 'taxAmount'] as const)
    if (command[key] > balance[key])
      throw new WorkflowError('Refund exceeds the remaining refundable component.', 409)
  const total = command.productAmount + command.shippingAmount + command.taxAmount
  const refunded =
    (order.productRefundTotal ?? 0) + (order.shippingRefundTotal ?? 0) + (order.taxRefundTotal ?? 0)
  if (total > (order.amount ?? 0) - refunded)
    throw new WorkflowError('Refund exceeds the amount paid.', 409)
  return total
}
