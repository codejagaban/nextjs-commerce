import type { Order, OrderStatus } from '@/payload-types'
import { dayKeysFrom, zonedDateKey } from '@/utilities/storeTime'

type SalesOrder = {
  amount?: number | null
  createdAt: string
  currency?: string | null
  discountTotal?: number | null
  productRefundTotal?: number | null
  shippingRefundTotal?: number | null
  shippingTotal?: number | null
  status?: OrderStatus
  orderStatus?: Order['orderStatus']
  paymentStatus?: Order['paymentStatus']
  subtotal?: number | null
  taxRefundTotal?: number | null
  taxTotal?: number | null
}

type SalesSummary = {
  averageOrderValue: number
  dailyNetSales: number[]
  discounts: number
  grossSales: number
  netOrders: number
  netSales: number
  productRefunds: number
  refunds: number
  shipping: number
  shippingRefunds: number
  taxes: number
  taxRefunds: number
  totalSales: number
}

/**
 * Summarize the value the store actually kept during one reporting window.
 *
 * Cancellation and refund are independent: cancelling an order does not make
 * received money disappear. Legacy imports retain their historical fallback.
 */
export function summarizeOrderSales({
  currency,
  days,
  end,
  orders,
  start,
  timeZone = 'UTC',
}: {
  currency: string
  days: number
  end: Date
  orders: SalesOrder[]
  start: Date
  timeZone?: string
}): SalesSummary {
  const dailyNetSales = new Array<number>(days).fill(0)
  const dayIndex = new Map(dayKeysFrom(start, days, timeZone).map((key, index) => [key, index]))
  let grossSales = 0
  let discounts = 0
  let productRefunds = 0
  let shipping = 0
  let shippingRefunds = 0
  let taxes = 0
  let taxRefunds = 0
  let netOrders = 0

  for (const order of orders) {
    const placed = new Date(order.createdAt)
    if (Number.isNaN(placed.getTime()) || placed < start || placed >= end) continue
    if (order.currency && order.currency !== currency) continue

    const status = order.status ?? 'processing'
    if (order.paymentStatus) {
      if (
        !['paid', 'partially_refunded', 'refunded'].includes(order.paymentStatus) &&
        !(order.paymentStatus === 'not_recorded' && order.orderStatus !== 'cancelled')
      )
        continue
    } else if (status === 'cancelled') continue

    const amount = typeof order.amount === 'number' ? order.amount : 0
    const subtotal = typeof order.subtotal === 'number' ? order.subtotal : amount
    const discountTotal = typeof order.discountTotal === 'number' ? order.discountTotal : 0
    const shippingTotal = typeof order.shippingTotal === 'number' ? order.shippingTotal : 0
    const taxTotal = typeof order.taxTotal === 'number' ? order.taxTotal : 0
    const productRefundTotal =
      typeof order.productRefundTotal === 'number'
        ? order.productRefundTotal
        : (order.paymentStatus ?? status) === 'refunded'
          ? amount
          : 0
    const shippingRefundTotal =
      typeof order.shippingRefundTotal === 'number' ? order.shippingRefundTotal : 0
    const taxRefundTotal = typeof order.taxRefundTotal === 'number' ? order.taxRefundTotal : 0

    grossSales += subtotal
    discounts += discountTotal
    shipping += shippingTotal
    shippingRefunds += shippingRefundTotal
    taxes += taxTotal
    taxRefunds += taxRefundTotal
    productRefunds += productRefundTotal

    const orderNetSales = Math.max(0, subtotal - discountTotal - productRefundTotal)
    if ((order.paymentStatus ?? status) === 'refunded' && orderNetSales === 0) continue

    netOrders += 1
    const index = dayIndex.get(zonedDateKey(placed, timeZone))
    if (index !== undefined) {
      dailyNetSales[index] += orderNetSales
    }
  }

  const refunds = productRefunds + shippingRefunds + taxRefunds
  const netSales = grossSales - discounts - productRefunds
  const totalSales = netSales + shipping - shippingRefunds + taxes - taxRefunds

  return {
    averageOrderValue: netOrders ? Math.round(totalSales / netOrders) : 0,
    dailyNetSales,
    discounts,
    grossSales,
    netOrders,
    netSales,
    productRefunds,
    refunds,
    shipping,
    shippingRefunds,
    taxes,
    taxRefunds,
    totalSales,
  }
}
