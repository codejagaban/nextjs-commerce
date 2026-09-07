import config from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { SalesChart, type DayPoint } from '../SalesChart'

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
  const paymentsSucceeded = transactions.docs.filter((t) => t.status === 'succeeded').length

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

  const DAYS = 30
  const dayKey = (d: Date) => d.toISOString().slice(0, 10)
  const buckets = new Map<string, DayPoint>()
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    buckets.set(dayKey(d), { date: dayKey(d), revenue: 0, orders: 0 })
  }
  earning.forEach((o) => {
    if (typeof o.createdAt !== 'string') return
    const b = buckets.get(o.createdAt.slice(0, 10))
    if (!b) return
    b.revenue += typeof o.amount === 'number' ? o.amount : 0
    b.orders += 1
  })

  return {
    activity: Array.from(buckets.values()),
    orderCount: orders.totalDocs,
    revenue,
    customers: users.totalDocs,
    products: products.totalDocs,
    carts: carts.totalDocs,
    paymentsPending,
    paymentsSucceeded,
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

      <SalesChart data={s.activity} />

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
        <div className={`${baseClass}__panel`}>
          <h3 className={`${baseClass}__panel-heading`}>
            Checkout attempts <span className={`${baseClass}__panel-note`}>via Stripe</span>
          </h3>
          <dl className={`${baseClass}__rows`}>
            <div className={`${baseClass}__row`}>
              <dt>Completed</dt>
              <dd>{s.paymentsSucceeded}</dd>
            </div>
            <div className={`${baseClass}__row`}>
              <dt>Started, not finished</dt>
              <dd>{s.paymentsPending}</dd>
            </div>
            <div className={`${baseClass}__row`}>
              <dt>Open carts</dt>
              <dd>{s.carts}</dd>
            </div>
          </dl>
        </div>

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
