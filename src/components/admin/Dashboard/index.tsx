import config from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { OrderHealth, type StatusCount } from '../OrderHealth'
import { RevenueByWeek, type WeekPoint } from '../RevenueByWeek'

import './index.scss'

const baseClass = 'store-overview'

/** Prices are stored in minor units. */
const money = (minor: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minor / 100)

const LOW_STOCK_AT = 25

type StockRow = { title: string; qty: number }

async function getOverview() {
  const payload = await getPayload({ config })

  const [orders, users, products, carts, transactions] = await Promise.all([
    payload.find({ collection: 'orders', limit: 0, pagination: false, depth: 0 }),
    payload.count({ collection: 'users' }),
    payload.count({ collection: 'products', where: { _status: { equals: 'published' } } }),
    payload.count({ collection: 'carts' }),
    payload.find({ collection: 'transactions', limit: 0, pagination: false, depth: 0 }),
  ])

  // Cancelled orders were never money in the till, so they stay out of revenue.
  const earning = orders.docs.filter((o) => o.status !== 'cancelled')
  const revenue = earning.reduce((sum, o) => sum + (typeof o.amount === 'number' ? o.amount : 0), 0)

  const paymentsPending = transactions.docs.filter((t) => t.status === 'pending').length

  /**
   * Stock lives on the variant when a product has them — the parent row is left
   * at zero by design. Reading the parent for every product would report every
   * variant product as out of stock, which is wrong and alarming.
   */
  const [simple, variants] = await Promise.all([
    payload.find({
      collection: 'products',
      depth: 0,
      limit: 100,
      where: { and: [{ enableVariants: { not_equals: true } }, { inventory: { less_than: LOW_STOCK_AT } }] },
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

  /** Monday-anchored weeks, oldest first, covering the last 13 complete weeks. */
  const WEEKS = 13
  const startOfWeek = (d: Date) => {
    const x = new Date(d)
    x.setUTCHours(0, 0, 0, 0)
    // getUTCDay: 0 = Sunday, so shift back to the preceding Monday.
    x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7))
    return x
  }
  const thisWeek = startOfWeek(new Date())
  const weeks = new Map<string, WeekPoint>()
  for (let i = WEEKS; i >= 1; i--) {
    const w = new Date(thisWeek)
    w.setUTCDate(w.getUTCDate() - i * 7)
    const key = w.toISOString().slice(0, 10)
    weeks.set(key, { weekStart: key, revenue: 0, orders: 0 })
  }
  earning.forEach((o) => {
    if (typeof o.createdAt !== 'string') return
    const key = startOfWeek(new Date(o.createdAt)).toISOString().slice(0, 10)
    const bucket = weeks.get(key)
    if (!bucket) return
    bucket.revenue += typeof o.amount === 'number' ? o.amount : 0
    bucket.orders += 1
  })
  const weekly = Array.from(weeks.values())

  const statusCounts: StatusCount = { completed: 0, processing: 0, cancelled: 0, refunded: 0 }
  orders.docs.forEach((o) => {
    const key = String(o.status) as keyof StatusCount
    if (key in statusCounts) statusCounts[key] += 1
  })

  return {
    weekly,
    statusCounts,
    orderCount: orders.totalDocs,
    revenue,
    customers: users.totalDocs,
    products: products.totalDocs,
    carts: carts.totalDocs,
    paymentsPending,
    lowStock,
  }
}

export const Dashboard: React.FC = async () => {
  const s = await getOverview()

  const stats = [
    { label: 'Revenue', value: money(s.revenue), hint: 'from completed orders' },
    { label: 'Orders', value: String(s.orderCount), hint: 'all time' },
    { label: 'Customers', value: String(s.customers), hint: 'registered accounts' },
    { label: 'Products live', value: String(s.products), hint: 'published' },
  ]

  return (
    <section className={baseClass}>
      <h2 className={`${baseClass}__heading`}>Store overview</h2>

      <div className={`${baseClass}__stats`}>
        {stats.map((stat) => (
          <div className={`${baseClass}__stat`} key={stat.label}>
            <span className={`${baseClass}__stat-label`}>{stat.label}</span>
            <span className={`${baseClass}__stat-value`}>{stat.value}</span>
            <span className={`${baseClass}__stat-hint`}>{stat.hint}</span>
          </div>
        ))}
      </div>

      <RevenueByWeek data={s.weekly} />

      {s.orderCount === 0 && (
        <div className={`${baseClass}__notice`}>
          <p>
            <strong>No orders yet.</strong> Revenue and order figures fill in here once a customer
            completes checkout.
          </p>
          {s.paymentsPending > 0 && (
            <p>
              {s.paymentsPending} payment{s.paymentsPending === 1 ? '' : 's'} started without
              finishing, and {s.carts} cart{s.carts === 1 ? '' : 's'} {s.carts === 1 ? 'is' : 'are'}{' '}
              still open. If that number keeps climbing while orders stay at zero, checkout is
              failing rather than simply being quiet.
            </p>
          )}
        </div>
      )}

      <div className={`${baseClass}__columns`}>
        <OrderHealth counts={s.statusCounts} unfinishedPayments={s.paymentsPending} />

        <div className={`${baseClass}__panel`}>
          <h3 className={`${baseClass}__panel-heading`}>
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
