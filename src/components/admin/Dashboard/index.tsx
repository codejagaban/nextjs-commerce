import config from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { IconAverage, IconOrders, IconProducts, IconRevenue, IconStock } from '../icons'
import { KpiStrip, type Kpi } from '../KpiStrip'
import { OrderHealth, type StatusCount } from '../OrderHealth'
import { PopularProducts, type PopularProduct } from '../PopularProducts'
import { RevenueTrend } from '../RevenueTrend'
import { DEFAULT_CURRENCY_CODE } from '@/currencies'
import { summarizeOrderSales } from './metrics'

import './index.scss'

const baseClass = 'store-overview'
const WINDOW = 30
const LOW_STOCK_AT = 25

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minor / 100)

/** Percentage change, or undefined when there is no previous period to compare against. */
const change = (now: number, before: number) =>
  before > 0 ? ((now - before) / before) * 100 : undefined

type StockRow = { title: string; qty: number }

async function getOverview() {
  const payload = await getPayload({ config })

  const [orders, users, productCount, settings] = await Promise.all([
    payload.find({ collection: 'orders', limit: 0, pagination: false, depth: 0 }),
    payload.count({ collection: 'users' }),
    payload.count({ collection: 'products', where: { _status: { equals: 'published' } } }),
    payload.findGlobal({ slug: 'settings', depth: 0 }),
  ])
  const transactions = await payload.find({
    collection: 'transactions',
    limit: 0,
    pagination: false,
    depth: 0,
  })

  const currency = settings.currency || DEFAULT_CURRENCY_CODE
  // These orders still represent sold units. Fully refunded and cancelled
  // orders are excluded because this model cannot represent partial returns.
  const earning = orders.docs.filter(
    (order) =>
      (order.status === 'processing' || order.status === 'completed' || !order.status) &&
      (!order.currency || order.currency === currency),
  )

  const dayMs = 86400000
  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)
  const end = new Date(startOfToday.getTime() + dayMs)
  const windowStart = new Date(startOfToday.getTime() - (WINDOW - 1) * dayMs)
  const priorStart = new Date(windowStart.getTime() - WINDOW * dayMs)
  const current = summarizeOrderSales({
    currency,
    days: WINDOW,
    end,
    orders: orders.docs,
    start: windowStart,
  })
  const prior = summarizeOrderSales({
    currency,
    days: WINDOW,
    end: windowStart,
    orders: orders.docs,
    start: priorStart,
  })

  const statusCounts: StatusCount = { completed: 0, processing: 0, cancelled: 0, refunded: 0 }
  orders.docs.forEach((o) => {
    const key = String(o.status) as keyof StatusCount
    if (key in statusCounts) statusCounts[key] += 1
  })

  // --- best sellers by units, within the window ---
  const catalogue = await payload.find({ collection: 'products', depth: 0, limit: 200 })
  const titleFor = new Map(catalogue.docs.map((p) => [p.id, String(p.title ?? 'Untitled')]))
  const idOf = (rel: unknown) =>
    typeof rel === 'object' && rel !== null ? (rel as { id?: unknown }).id : rel

  const unitsByProduct = new Map<string, number>()
  earning.forEach((o) => {
    if (typeof o.createdAt !== 'string' || new Date(o.createdAt) < windowStart) return
    const items = Array.isArray(o.items) ? o.items : []
    items.forEach((item) => {
      const title = titleFor.get(idOf((item as { product?: unknown }).product) as never)
      if (!title) return
      const qty = Number((item as { quantity?: unknown }).quantity ?? 1)
      unitsByProduct.set(title, (unitsByProduct.get(title) ?? 0) + qty)
    })
  })
  const popular: PopularProduct[] = Array.from(unitsByProduct.entries())
    .map(([title, units]) => ({ title, units }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 5)

  /**
   * A product with variants keeps its stock on the variant rows and leaves the
   * parent at zero, so reading the parent for everything would report healthy
   * variant products as out of stock.
   */
  const [simple, variants] = await Promise.all([
    payload.find({
      collection: 'products',
      depth: 0,
      limit: 100,
      where: {
        and: [{ enableVariants: { not_equals: true } }, { inventory: { less_than: LOW_STOCK_AT } }],
      },
    }),
    payload.find({
      collection: 'variants',
      depth: 1,
      limit: 100,
      where: { inventory: { less_than: LOW_STOCK_AT } },
    }),
  ])
  const lowStock: StockRow[] = [
    ...simple.docs.map((p) => ({ title: String(p.title ?? 'Untitled'), qty: Number(p.inventory ?? 0) })),
    ...variants.docs.map((v) => ({
      title: String((typeof v.product === 'object' && v.product?.title) || v.title || 'Variant'),
      qty: Number(v.inventory ?? 0),
    })),
  ].sort((a, b) => a.qty - b.qty)

  return {
    currentDaily: current.dailyNetSales,
    currentRevenue: current.netSales,
    currentOrders: current.netOrders,
    currentAov: current.averageOrderValue,
    grossSales: current.grossSales,
    refunds: current.refunds,
    revenueChange: change(current.netSales, prior.netSales),
    ordersChange: change(current.netOrders, prior.netOrders),
    aovChange: change(current.averageOrderValue, prior.averageOrderValue),
    currency,
    customers: users.totalDocs,
    products: productCount.totalDocs,
    statusCounts,
    popular,
    lowStock,
    unfinishedPayments: transactions.docs.filter((t) => t.status === 'pending').length,
    windowStart,
    endLabel: startOfToday,
  }
}

const dayLabel = (d: Date) =>
  d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** One label per bucket, matching how the daily totals were bucketed. */
const dayLabelsFrom = (start: Date, count: number) =>
  Array.from({ length: count }, (_, i) =>
    new Date(start.getTime() + i * 86400000).toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }),
  )

export const Dashboard: React.FC<{ name?: string }> = async ({ name }) => {
  const s = await getOverview()

  const kpis: Kpi[] = [
    {
      Icon: IconRevenue,
      label: 'Net sales',
      value: money(s.currentRevenue, s.currency),
      delta: s.revenueChange,
      compare: `${money(s.grossSales, s.currency)} gross · ${money(s.refunds, s.currency)} refunded`,
    },
    { Icon: IconOrders, label: 'Orders', value: s.currentOrders.toLocaleString('en-US'), delta: s.ordersChange, compare: 'vs previous 30 days' },
    { Icon: IconAverage, label: 'Average order', value: money(s.currentAov, s.currency), delta: s.aovChange, compare: 'vs previous 30 days' },
    { Icon: IconProducts, label: 'Products live', value: String(s.products), compare: `${s.customers} customers` },
  ]

  return (
    <section className={baseClass}>
      <header className={`${baseClass}__greeting`}>
        <h2 className={`${baseClass}__hello`}>Hey{name ? `, ${name}` : ' there'}</h2>
        <p className={`${baseClass}__date`}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </header>

      <KpiStrip items={kpis} />

      <div className={`${baseClass}__split`}>
        <RevenueTrend
          current={{ label: 'Last 30 days', points: s.currentDaily }}
          currency={s.currency}
          dayLabels={dayLabelsFrom(s.windowStart, s.currentDaily.length)}
          delta={s.revenueChange}
          endLabel={dayLabel(s.endLabel)}
          startLabel={dayLabel(s.windowStart)}
          title="Net sales"
          total={money(s.currentRevenue, s.currency)}
        />
        <PopularProducts data={s.popular} />
      </div>

      <div className={`${baseClass}__columns`}>
        <OrderHealth counts={s.statusCounts} unfinishedPayments={s.unfinishedPayments} />

        <div className={`${baseClass}__panel`}>
          <h3 className={`${baseClass}__panel-heading`}>
            <IconStock className={`${baseClass}__panel-icon`} />
            Low stock <span className={`${baseClass}__panel-note`}>under {LOW_STOCK_AT}</span>
          </h3>
          {s.lowStock.length === 0 ? (
            <p className={`${baseClass}__empty`}>Everything is well stocked.</p>
          ) : (
            <dl className={`${baseClass}__rows`}>
              {s.lowStock.slice(0, 6).map((row, i) => (
                <div className={`${baseClass}__row`} key={`${row.title}-${i}`}>
                  <dt>{row.title}</dt>
                  <dd className={row.qty === 0 ? `${baseClass}__out` : undefined}>
                    {row.qty === 0 ? 'Out of stock' : `${row.qty} left`}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  )
}
