import config from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { IconAverage, IconOrders, IconProducts, IconRevenue, IconStock } from '../icons'
import { KpiStrip, type Kpi } from '../KpiStrip'
import { OrderHealth } from '../OrderHealth'
import { PopularProducts, type PopularProduct } from '../PopularProducts'
import { RevenueTrend } from '../RevenueTrend'
import { DEFAULT_CURRENCY_CODE } from '@/currencies'
import {
  addCalendarDays,
  dateTimeInZone,
  DEFAULT_STORE_TIME_ZONE,
  reportingWindow,
  zonedMidnight,
} from '@/utilities/storeTime'
import { getDashboardOrderData } from './queries'

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

  const [users, productCount, settings] = await Promise.all([
    payload.count({ collection: 'users' }),
    payload.count({ collection: 'products', where: { _status: { equals: 'published' } } }),
    payload.findGlobal({ slug: 'settings', depth: 0 }),
  ])

  const currency = settings.currency || DEFAULT_CURRENCY_CODE
  const timeZone = settings.timeZone || DEFAULT_STORE_TIME_ZONE

  const { end, priorStart, start: windowStart, today: startOfToday } = reportingWindow({
    days: WINDOW,
    now: new Date(),
    timeZone,
  })
  const orderData = await getDashboardOrderData({
    currency,
    days: WINDOW,
    end,
    payload,
    priorStart,
    start: windowStart,
    timeZone,
  })
  const { current, prior } = orderData

  // The database returns only the five winning IDs; Payload resolves their
  // display titles without loading the rest of the catalogue.
  const popularIDs = orderData.popular.map((item) => item.productID)
  const popularProducts = popularIDs.length
    ? await payload.find({
        collection: 'products',
        depth: 0,
        limit: popularIDs.length,
        where: { id: { in: popularIDs } },
      })
    : { docs: [] }
  const titleFor = new Map(
    popularProducts.docs.map((product) => [product.id, String(product.title ?? 'Untitled')]),
  )
  const popular: PopularProduct[] = orderData.popular.flatMap((item) => {
    const title = titleFor.get(item.productID)
    return title ? [{ title, units: item.units }] : []
  })

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
    discounts: current.discounts,
    grossSales: current.grossSales,
    productRefunds: current.productRefunds,
    refunds: current.refunds,
    shipping: current.shipping,
    shippingRefunds: current.shippingRefunds,
    taxes: current.taxes,
    taxRefunds: current.taxRefunds,
    totalSales: current.totalSales,
    revenueChange: change(current.netSales, prior.netSales),
    ordersChange: change(current.netOrders, prior.netOrders),
    aovChange: change(current.averageOrderValue, prior.averageOrderValue),
    currency,
    timeZone,
    customers: users.totalDocs,
    products: productCount.totalDocs,
    statusCounts: orderData.statusCounts,
    popular,
    lowStock,
    unfinishedPayments: orderData.unfinishedPayments,
    windowStart,
    endLabel: startOfToday,
  }
}

const dayLabel = (d: Date, timeZone: string) =>
  d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone })

/** One label per bucket, matching how the daily totals were bucketed. */
const dayLabelsFrom = (start: Date, count: number, timeZone: string) => {
  const localStart = dateTimeInZone(start, timeZone)
  const startDate = { year: localStart.year, month: localStart.month, day: localStart.day }
  return Array.from({ length: count }, (_, i) =>
    zonedMidnight(addCalendarDays(startDate, i), timeZone).toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone,
    }),
  )
}

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
            timeZone: s.timeZone,
          })}
        </p>
      </header>

      <KpiStrip items={kpis} />

      <div className={`${baseClass}__split`}>
        <RevenueTrend
          breakdown={[
            { label: 'Gross sales', value: money(s.grossSales, s.currency) },
            { label: 'Discounts', value: money(s.discounts, s.currency) },
            { label: 'Product returns', value: money(s.productRefunds, s.currency) },
            {
              label: 'Net shipping',
              value: money(s.shipping - s.shippingRefunds, s.currency),
            },
            { label: 'Net tax', value: money(s.taxes - s.taxRefunds, s.currency) },
            { label: 'Total sales', value: money(s.totalSales, s.currency) },
          ]}
          current={{ label: 'Last 30 days', points: s.currentDaily }}
          currency={s.currency}
          dayLabels={dayLabelsFrom(s.windowStart, s.currentDaily.length, s.timeZone)}
          delta={s.revenueChange}
          endLabel={dayLabel(s.endLabel, s.timeZone)}
          startLabel={dayLabel(s.windowStart, s.timeZone)}
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
