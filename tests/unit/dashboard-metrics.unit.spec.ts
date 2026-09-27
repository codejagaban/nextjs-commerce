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

  it('reports discounts, shipping, tax, and partial refunds separately', () => {
    const result = summarizeOrderSales({
      currency: 'USD',
      days: 30,
      start,
      end,
      orders: [
        {
          amount: 10_500,
          createdAt: '2026-09-12T12:00:00.000Z',
          currency: 'USD',
          discountTotal: 1_000,
          productRefundTotal: 2_000,
          shippingRefundTotal: 200,
          shippingTotal: 500,
          status: 'completed',
          subtotal: 10_000,
          taxRefundTotal: 100,
          taxTotal: 1_000,
        },
      ],
    })

    expect(result.grossSales).toBe(10_000)
    expect(result.discounts).toBe(1_000)
    expect(result.productRefunds).toBe(2_000)
    expect(result.shippingRefunds).toBe(200)
    expect(result.taxRefunds).toBe(100)
    expect(result.refunds).toBe(2_300)
    expect(result.netSales).toBe(7_000)
    expect(result.shipping).toBe(500)
    expect(result.taxes).toBe(1_000)
    expect(result.totalSales).toBe(8_200)
    expect(result.averageOrderValue).toBe(8_200)
    expect(result.dailyNetSales.reduce((sum, amount) => sum + amount, 0)).toBe(7_000)
  })
})
