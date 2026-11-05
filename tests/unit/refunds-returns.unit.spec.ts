import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import type { Order, OrderRefund } from '@/payload-types'
import { parseRefundCommand, refundBalance, validateRefund } from '@/orders/refunds'
import { applyReturn, parseReturnCommand, returnableItems } from '@/orders/returns'

const order = {
  id: 1,
  amount: 2100,
  subtotal: 2000,
  discountTotal: 200,
  shippingTotal: 200,
  taxTotal: 100,
  paymentStatus: 'paid',
  orderStatus: 'open',
  fulfillmentStatus: 'shipped',
  items: [{ id: 'line', product: 1, quantity: 2 }],
  shipments: [{ items: [{ orderItemID: 'line', quantity: 2 }] }],
  returns: [],
} as unknown as Order
const refund = {
  requestID: randomUUID(),
  version: 0,
  productAmount: 900,
  shippingAmount: 100,
  taxAmount: 50,
  reason: 'Customer requested',
}
describe('Refund accounting', () => {
  it('caps discounted product, shipping, tax and total independently', () => {
    expect(refundBalance(order)).toEqual({
      productAmount: 1800,
      shippingAmount: 200,
      taxAmount: 100,
    })
    expect(validateRefund(order, parseRefundCommand(refund), [])).toBe(1050)
    for (const delta of [{ productAmount: 1801 }, { shippingAmount: 201 }, { taxAmount: 101 }])
      expect(() => validateRefund(order, { ...refund, ...delta }, [])).toThrow(
        'remaining refundable',
      )
    expect(() => validateRefund({ ...order, paymentStatus: 'refunded' }, refund, [])).toThrow(
      'settled payments',
    )
  })
  it('rejects fractional, negative, zero and malformed requests', () => {
    for (const delta of [
      { productAmount: 0.1 },
      { shippingAmount: -1 },
      { productAmount: 0, shippingAmount: 0, taxAmount: 0 },
      { requestID: 'bad' },
      { reason: '' },
    ])
      expect(() => parseRefundCommand({ ...refund, ...delta })).toThrow()
  })
  it('reserves unresolved refunds and permits a new request after a confirmed failure', () => {
    expect(() => validateRefund(order, refund, [{ status: 'pending' } as OrderRefund])).toThrow(
      'outstanding refund',
    )
    expect(validateRefund(order, refund, [{ status: 'failed' } as OrderRefund])).toBe(1050)
    expect(refundBalance({ ...order, productRefundTotal: 900 })).toMatchObject({
      productAmount: 900,
    })
  })
})
describe('Physical returns', () => {
  const command = parseReturnCommand({
    requestID: randomUUID(),
    version: 0,
    action: 'request',
    reason: 'Wrong item',
    items: [{ orderItemID: 'line', quantity: 2 }],
  })
  it('accepts only shipped quantities not already requested', () => {
    const result = applyReturn(order, command, '2026-11-04T12:00:00Z', 'return')
    expect(result.returnStatus).toBe('requested')
    expect(result.restock).toEqual([])
    expect(returnableItems({ ...order, returns: result.returns })[0].remaining).toBe(0)
    expect(() => applyReturn({ ...order, returns: result.returns }, command, '', '')).toThrow(
      'exceeds shipped',
    )
    expect(() => applyReturn({ ...order, shipments: [] }, command, '', '')).toThrow(
      'exceeds shipped',
    )
  })
  it('receives partially, restocks only selected goods, and rejects duplicate receipt quantities', () => {
    const requested = applyReturn(order, command, '2026-11-04T12:00:00Z', 'return')
    const receive = parseReturnCommand({
      requestID: randomUUID(),
      version: 1,
      action: 'receive',
      returnID: 'return',
      items: [{ orderItemID: 'line', quantity: 1, restock: true }],
    })
    const partial = applyReturn({ ...order, returns: requested.returns }, receive, '', '')
    expect(partial).toMatchObject({
      returnStatus: 'partially_returned',
      restock: [{ quantity: 1 }],
    })
    const final = applyReturn(
      { ...order, returns: partial.returns },
      { ...receive, items: [{ orderItemID: 'line', quantity: 1, restock: false }] },
      '',
      '',
    )
    expect(final.returnStatus).toBe('returned')
    expect(final.returns[0].items[0]).toMatchObject({ received: 2, restocked: 1 })
    expect(() => applyReturn({ ...order, returns: final.returns }, receive, '', '')).toThrow(
      'exceeds outstanding',
    )
    expect(order.paymentStatus).toBe('paid')
  })
  it('rejects duplicate lines and nonboolean restock input', () => {
    expect(() =>
      parseReturnCommand({ ...command, items: [...command.items, ...command.items] }),
    ).toThrow('Duplicate')
    expect(() =>
      parseReturnCommand({ ...command, items: [{ ...command.items[0], restock: 'yes' }] }),
    ).toThrow('restock')
  })
})
