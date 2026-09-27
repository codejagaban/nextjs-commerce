import { describe, expect, it } from 'vitest'

import { recentOrdersFrom } from '@/components/admin/Dashboard/queries'

describe('recent dashboard orders', () => {
  it('normalizes bounded order rows for display', () => {
    expect(
      recentOrdersFrom({
        rows: [
          {
            amount: '7600',
            created_at: '2026-09-27T10:00:00.000Z',
            currency: 'GBP',
            customer: 'Trust Jamin',
            fulfillment_status: 'processing',
            id: 319,
            payment_status: 'succeeded',
          },
        ],
      }),
    ).toEqual([
      {
        createdAt: '2026-09-27T10:00:00.000Z',
        currency: 'GBP',
        customer: 'Trust Jamin',
        fulfillmentStatus: 'processing',
        id: 319,
        paymentStatus: 'succeeded',
        total: 7600,
      },
    ])
  })

  it('labels missing legacy payment data without pretending it succeeded', () => {
    expect(
      recentOrdersFrom({
        rows: [
          {
            amount: null,
            created_at: new Date('2026-09-27T10:00:00.000Z'),
            currency: null,
            customer: null,
            fulfillment_status: null,
            id: 1,
            payment_status: null,
          },
        ],
      })[0],
    ).toMatchObject({
      currency: 'USD',
      customer: 'Guest customer',
      fulfillmentStatus: 'processing',
      paymentStatus: 'not_recorded',
      total: 0,
    })
  })
})
