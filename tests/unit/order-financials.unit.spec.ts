import { describe, expect, it } from 'vitest'

import { withOrderFinancialSnapshot } from '@/payments/orderFinancials'

describe('order financial snapshots', () => {
  it('treats the charged amount as subtotal when checkout has no adjustments', () => {
    expect(withOrderFinancialSnapshot({ amount: 7600, status: 'processing' })).toMatchObject({
      amount: 7600,
      discountTotal: 0,
      productRefundTotal: 0,
      shippingTotal: 0,
      shippingRefundTotal: 0,
      status: 'processing',
      subtotal: 7600,
      taxRefundTotal: 0,
      taxTotal: 0,
    })
  })

  it('preserves a reconciled financial breakdown', () => {
    expect(
      withOrderFinancialSnapshot({
        amount: 10_500,
        discountTotal: 1_000,
        shippingTotal: 500,
        subtotal: 10_000,
        taxTotal: 1_000,
      }),
    ).toMatchObject({
      amount: 10_500,
      discountTotal: 1_000,
      productRefundTotal: 0,
      shippingTotal: 500,
      shippingRefundTotal: 0,
      subtotal: 10_000,
      taxRefundTotal: 0,
      taxTotal: 1_000,
    })
  })

  it('rejects a breakdown that differs from the provider charge', () => {
    expect(() =>
      withOrderFinancialSnapshot({
        amount: 10_000,
        discountTotal: 1_000,
        subtotal: 10_000,
      }),
    ).toThrow('Order financial breakdown does not match the charged amount.')
  })
})
