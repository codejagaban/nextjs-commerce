import { describe, expect, it } from 'vitest'
import type { Order } from '@/payload-types'
import {
  applyWorkflowCommand,
  parseWorkflowCommand,
  remainingItems,
  safeTrackingURL,
} from '@/orders/fulfillment'

const base = {
  id: 1,
  orderStatus: 'open',
  paymentStatus: 'paid',
  fulfillmentStatus: 'unfulfilled',
  returnStatus: 'none',
  items: [{ id: 'row-1', product: 1, quantity: 3 }],
  shipments: [],
} as unknown as Order
const input = {
  requestID: '4e46291a-8e8a-4bf7-9735-698c390d7d63',
  version: 0,
  action: 'ship',
  carrier: 'Royal Mail',
  trackingNumber: 'TEST123',
  items: [{ orderItemID: 'row-1', quantity: 1 }],
}
const now = '2026-10-24T12:00:00.000Z'

describe('shipment transitions', () => {
  it('supports partial shipments without changing money or order state', () => {
    const change = applyWorkflowCommand(base, parseWorkflowCommand(input), now, 'shipment-1')
    expect(change.fulfillmentStatus).toBe('partially_fulfilled')
    expect(change.paymentStatus).toBeUndefined()
    expect(remainingItems({ ...base, ...change })[0].remaining).toBe(2)
  })
  it('rejects overshipping and unknown order lines', () => {
    for (const items of [
      [{ orderItemID: 'row-1', quantity: 4 }],
      [{ orderItemID: 'other', quantity: 1 }],
    ]) {
      expect(() =>
        applyWorkflowCommand(base, parseWorkflowCommand({ ...input, items }), now, 's'),
      ).toThrow('exceeds')
    }
  })
  it('rejects negative, fractional, duplicate and empty quantities', () => {
    for (const items of [
      [],
      [{ orderItemID: 'row-1', quantity: -1 }],
      [{ orderItemID: 'row-1', quantity: 1.5 }],
      [...input.items, ...input.items],
    ]) {
      expect(() => parseWorkflowCommand({ ...input, items })).toThrow()
    }
  })
  it('blocks unpaid, cancelled and legacy fulfilled orders', () => {
    for (const change of [
      { paymentStatus: 'not_recorded' },
      { paymentStatus: 'refunded' },
      { orderStatus: 'cancelled' },
      { fulfillmentStatus: 'fulfilled' },
    ]) {
      expect(() =>
        applyWorkflowCommand(
          { ...base, ...change } as Order,
          parseWorkflowCommand(input),
          now,
          's',
        ),
      ).toThrow()
    }
  })
  it('requires all shipments delivered before completion and blocks shipped cancellation', () => {
    const shipped = {
      ...base,
      ...applyWorkflowCommand(
        base,
        parseWorkflowCommand({ ...input, items: [{ orderItemID: 'row-1', quantity: 3 }] }),
        now,
        's',
      ),
    }
    expect(shipped.fulfillmentStatus).toBe('shipped')
    expect(() =>
      applyWorkflowCommand(
        shipped,
        parseWorkflowCommand({ ...input, action: 'complete' }),
        now,
        '',
      ),
    ).toThrow('Deliver every')
    expect(() =>
      applyWorkflowCommand(shipped, parseWorkflowCommand({ ...input, action: 'cancel' }), now, ''),
    ).toThrow('require a return')
    const delivered = {
      ...shipped,
      ...applyWorkflowCommand(
        shipped,
        parseWorkflowCommand({ ...input, action: 'deliver', shipmentID: 's' }),
        now,
        '',
      ),
    }
    expect(delivered.fulfillmentStatus).toBe('delivered')
    expect(
      applyWorkflowCommand(
        delivered,
        parseWorkflowCommand({ ...input, action: 'complete' }),
        now,
        '',
      ),
    ).toEqual({ orderStatus: 'completed' })
  })
  it('accepts HTTPS tracking links but rejects executable and credential-bearing links', () => {
    expect(safeTrackingURL('https://tracking.example.com/test')).toContain('https://')
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,test',
      'http://tracking.example.com',
      'https://user:pass@tracking.example.com',
    ])
      expect(() => safeTrackingURL(url)).toThrow('HTTPS')
  })
})
