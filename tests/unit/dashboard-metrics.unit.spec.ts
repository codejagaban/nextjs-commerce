import { describe, expect, it } from 'vitest'

import { summarizeOrderSales } from '@/components/admin/Dashboard/metrics'

const start = new Date('2026-09-01T00:00:00.000Z')
const end = new Date('2026-10-01T00:00:00.000Z')

describe('dashboard sales metrics', () => {
  it('separates gross sales, refunds, and net sales', () => {
    const result = summarizeOrderSales({
      currency: 'USD',
      days: 30,
      start,
      end,
      orders: [
        {
          amount: 5000,
          createdAt: '2026-09-02T12:00:00.000Z',
          currency: 'USD',
          status: 'processing',
        },
        {
          amount: 3000,
          createdAt: '2026-09-03T12:00:00.000Z',
          currency: 'USD',
          status: 'completed',
        },
        {
          amount: 2000,
          createdAt: '2026-09-04T12:00:00.000Z',
          currency: 'USD',
          status: 'refunded',
        },
        {
          amount: 9000,
          createdAt: '2026-09-05T12:00:00.000Z',
          currency: 'USD',
          status: 'cancelled',
        },
      ],
    })

    expect(result.grossSales).toBe(10_000)
    expect(result.refunds).toBe(2_000)
    expect(result.netSales).toBe(8_000)
    expect(result.netOrders).toBe(2)
    expect(result.averageOrderValue).toBe(4_000)
    expect(result.dailyNetSales.reduce((sum, amount) => sum + amount, 0)).toBe(8_000)
  })

  it('excludes other currencies and dates outside the reporting window', () => {
    const result = summarizeOrderSales({
      currency: 'GBP',
      days: 30,
      start,
      end,
      orders: [
        {
          amount: 2500,
          createdAt: '2026-09-10T12:00:00.000Z',
          currency: 'GBP',
          status: 'completed',
        },
        {
          amount: 5000,
          createdAt: '2026-09-11T12:00:00.000Z',
          currency: 'USD',
          status: 'completed',
        },
        {
          amount: 7000,
          createdAt: '2026-10-01T00:00:00.000Z',
          currency: 'GBP',
          status: 'completed',
        },
      ],
    })

    expect(result.netSales).toBe(2_500)
    expect(result.netOrders).toBe(1)
  })
})

