import { describe, expect, it } from 'vitest'
import { legacyOrderStates, paymentStateFor } from '@/orders/states'

describe('independent order states', () => {
  it('does not invent delivery or returns from legacy status', () => {
    expect(legacyOrderStates('completed')).toEqual({
      orderStatus: 'completed',
      fulfillmentStatus: 'fulfilled',
      returnStatus: 'none',
    })
    expect(legacyOrderStates('refunded')).toEqual({
      orderStatus: 'open',
      fulfillmentStatus: 'unfulfilled',
      returnStatus: 'none',
    })
  })
  it('requires transaction evidence instead of guessing paid for demo orders', () => {
    expect(paymentStateFor([])).toBe('not_recorded')
    expect(paymentStateFor([{ status: 'processing' }])).toBe('pending')
    expect(paymentStateFor([{ status: 'failed' }])).toBe('failed')
    expect(paymentStateFor([{ status: 'expired' }])).toBe('cancelled')
  })
  it('separates partial and full refunds from fulfillment', () => {
    expect(paymentStateFor([{ status: 'succeeded' }], 2000, 0)).toBe('paid')
    expect(paymentStateFor([{ status: 'succeeded' }], 2000, 500)).toBe('partially_refunded')
    expect(paymentStateFor([{ status: 'succeeded' }], 2000, 2000)).toBe('refunded')
    expect(paymentStateFor([{ status: 'refunded' }])).toBe('refunded')
  })
})
