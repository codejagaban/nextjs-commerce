import type { OrderStatus } from '@/payload-types'

type SalesOrder = {
  amount?: number | null
  createdAt: string
  currency?: string | null
  status?: OrderStatus
}

type SalesSummary = {
  averageOrderValue: number
  dailyNetSales: number[]
  grossSales: number
  netOrders: number
  netSales: number
  refunds: number
}

/**
 * Summarize the value the store actually kept during one reporting window.
 *
 * An order marked refunded still belongs in gross sales because a sale happened,
 * but the same amount is removed again as a refund. Cancelled orders were never
 * sales. The current ecommerce model only supports whole-order refunds, so this
 * intentionally does not pretend that partial-refund data exists.
 */
export function summarizeOrderSales({
  currency,
  days,
  end,
  orders,
  start,
}: {
  currency: string
  days: number
  end: Date
  orders: SalesOrder[]
  start: Date
}): SalesSummary {
  const dailyNetSales = new Array<number>(days).fill(0)
  let grossSales = 0
  let refunds = 0
  let netOrders = 0

  for (const order of orders) {
    const placed = new Date(order.createdAt)
    if (Number.isNaN(placed.getTime()) || placed < start || placed >= end) continue
    if (order.currency && order.currency !== currency) continue

    const status = order.status ?? 'processing'
    if (status === 'cancelled') continue

    const amount = typeof order.amount === 'number' ? order.amount : 0
    grossSales += amount

    if (status === 'refunded') {
      refunds += amount
      continue
    }

    netOrders += 1
    const index = Math.floor((placed.getTime() - start.getTime()) / 86_400_000)
    if (index >= 0 && index < days) dailyNetSales[index] += amount
  }

  const netSales = grossSales - refunds

  return {
    averageOrderValue: netOrders ? Math.round(netSales / netOrders) : 0,
    dailyNetSales,
    grossSales,
    netOrders,
    netSales,
    refunds,
  }
}

