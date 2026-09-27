import { describe, expect, it } from 'vitest'

import { attentionCountsFrom } from '@/components/admin/Dashboard/queries'

describe('dashboard attention queue', () => {
  it('maps database counts into merchant actions', () => {
    expect(
      attentionCountsFrom({
        rows: [
          {
            failed_payments: '2',
            incomplete_checkouts: '3',
            out_of_stock_products: '4',
            out_of_stock_variants: '5',
            processing_orders: '6',
            stalled_payments: '7',
          },
        ],
      }),
    ).toEqual({
      failedPayments: 2,
      incompleteCheckouts: 3,
      outOfStockProducts: 4,
      outOfStockVariants: 5,
      processingOrders: 6,
      stalledPayments: 7,
    })
  })

  it('returns a safe empty queue when the database returns no row', () => {
    expect(attentionCountsFrom(undefined)).toEqual({
      failedPayments: 0,
      incompleteCheckouts: 0,
      outOfStockProducts: 0,
      outOfStockVariants: 0,
      processingOrders: 0,
      stalledPayments: 0,
    })
  })
})
