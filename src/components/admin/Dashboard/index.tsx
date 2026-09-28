import config from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import Image from 'next/image'

import { AnalyticsControls } from '../AnalyticsControls'
import { AttentionQueue } from '../AttentionQueue'
import { IconAverage, IconOrders, IconProducts, IconRevenue, IconStock } from '../icons'
import { KpiStrip, type Kpi } from '../KpiStrip'
import { OrderHealth } from '../OrderHealth'
import { PopularProducts, type PopularProduct } from '../PopularProducts'
import { RecentOrders } from '../RecentOrders'
import { RevenueTrend } from '../RevenueTrend'
import { DEFAULT_CURRENCY_CODE } from '@/currencies'
import type { Media, Product } from '@/payload-types'
import {
  addCalendarDays,
  dateTimeInZone,
  DEFAULT_STORE_TIME_ZONE,
  zonedMidnight,
} from '@/utilities/storeTime'
import { analyticsWindow } from './analyticsRange'
import { getDashboardOrderData } from './queries'

import './index.scss'

const baseClass = 'store-overview'
const LOW_STOCK_AT = 25

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minor / 100)

/** Percentage change, or undefined when there is no previous period to compare against. */
const change = (now: number, before: number) =>
  before > 0 ? ((now - before) / before) * 100 : undefined

type StockRow = { alt?: string; image?: string; title: string; qty: number }

type DashboardFilters = {
  comparison?: string
  from?: string
  range?: string
  to?: string
}

async function getOverview(filters: DashboardFilters) {
  const payload = await getPayload({ config })

  const [users, productCount, settings] = await Promise.all([
    payload.count({ collection: 'users' }),
    payload.count({ collection: 'products', where: { _status: { equals: 'published' } } }),
    payload.findGlobal({ slug: 'settings', depth: 0 }),
  ])

  const currency = settings.currency || DEFAULT_CURRENCY_CODE
  const timeZone = settings.timeZone || DEFAULT_STORE_TIME_ZONE

  const window = analyticsWindow({
    comparison: filters.comparison,
    from: filters.from,
    now: new Date(),
    range: filters.range,
    timeZone,
    to: filters.to,
  })
  const orderData = await getDashboardOrderData({
    currency,
    days: window.days,
    end: window.end,
    payload,
    priorEnd: window.priorEnd,
    priorStart: window.priorStart,
    start: window.start,
    timeZone,
  })
  const { current, prior } = orderData

  // The database returns only the five winning IDs; Payload resolves their
  // display titles without loading the rest of the catalogue.
  const popularIDs = orderData.popular.map((item) => item.productID)
  const popularProducts = popularIDs.length
    ? await payload.find({
        collection: 'products',
        depth: 1,
        limit: popularIDs.length,
        where: { id: { in: popularIDs } },
      })
    : { docs: [] }
  const mediaFor = (product: Product) => {
    const media = product.gallery?.[0]?.image
    return typeof media === 'object' ? (media as Media) : undefined
  }
  const displayPrice = (product: Product) => {
    const value = product[`priceIn${currency}` as keyof Product]
    return typeof value === 'number' ? money(value, currency) : undefined
  }
  const productFor = new Map(popularProducts.docs.map((product) => [product.id, product]))
  const popular: PopularProduct[] = orderData.popular.flatMap((item) => {
    const product = productFor.get(item.productID)
    if (!product) return []
    const image = mediaFor(product)
    return [{
      alt: image?.alt,
      image: image?.sizes?.thumbnail?.url || image?.thumbnailURL || image?.url || undefined,
      price: displayPrice(product),
      title: String(product.title ?? 'Untitled'),
      units: item.units,
    }]
  })

  /**
   * A product with variants keeps its stock on the variant rows and leaves the
   * parent at zero, so reading the parent for everything would report healthy
   * variant products as out of stock.
   */
  const [simple, variants] = await Promise.all([
    payload.find({
      collection: 'products',
      depth: 1,
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
    ...simple.docs.map((p) => {
      const image = mediaFor(p)
      return {
        alt: image?.alt,
        image: image?.sizes?.thumbnail?.url || image?.thumbnailURL || image?.url || undefined,
        title: String(p.title ?? 'Untitled'),
        qty: Number(p.inventory ?? 0),
      }
    }),
    ...variants.docs.map((v) => ({
      ...(typeof v.product === 'object' && v.product
        ? (() => {
            const image = mediaFor(v.product)
            return {
              alt: image?.alt,
              image: image?.sizes?.thumbnail?.url || image?.thumbnailURL || image?.url || undefined,
            }
          })()
        : {}),
      title: String((typeof v.product === 'object' && v.product?.title) || v.title || 'Variant'),
      qty: Number(v.inventory ?? 0),
    })),
  ].sort((a, b) => a.qty - b.qty)

  return {
    currentDaily: current.dailyNetSales,
    attention: orderData.attention,
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
    recentOrders: orderData.recentOrders,
    lowStock,
    window,
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

export const Dashboard: React.FC<{
  adminPath: string
  filters?: DashboardFilters
  name?: string
}> = async ({ adminPath, filters = {}, name }) => {
  const s = await getOverview(filters)

  const kpis: Kpi[] = [
    {
      Icon: IconRevenue,
      label: 'Net sales',
      value: money(s.currentRevenue, s.currency),
      delta: s.revenueChange,
      compare: s.window.comparisonLabel,
    },
    {
      Icon: IconOrders,
      label: 'Orders',
      value: s.currentOrders.toLocaleString('en-US'),
      delta: s.ordersChange,
      compare: s.window.comparisonLabel,
    },
    {
      Icon: IconAverage,
      label: 'Average order',
      value: money(s.currentAov, s.currency),
      delta: s.aovChange,
      compare: s.window.comparisonLabel,
    },
    {
      Icon: IconProducts,
      label: 'Products live',
      value: String(s.products),
      compare: `${s.customers} customers`,
    },
  ]

  return (
    <section className={baseClass}>
      <div className={`${baseClass}__topline`}>
        <header className={`${baseClass}__greeting`}>
          <h2 className={`${baseClass}__hello`}>Good morning{name ? `, ${name}` : ''}</h2>
          <p className={`${baseClass}__date`}>Here’s what’s happening with your store today.</p>
        </header>

        <AnalyticsControls
          adminPath={adminPath}
          comparison={s.window.comparison}
          endDate={s.window.endDate}
          maxDate={s.window.todayDate}
          range={s.window.range}
          startDate={s.window.startDate}
        />
      </div>

      <KpiStrip items={kpis} />

      <AttentionQueue adminPath={adminPath} counts={s.attention} />

      <div className={`${baseClass}__split`}>
        <RevenueTrend
          comparisonLabel={s.window.comparisonLabel}
          current={{ label: s.window.rangeLabel, points: s.currentDaily }}
          currency={s.currency}
          dayLabels={dayLabelsFrom(s.window.start, s.currentDaily.length, s.timeZone)}
          delta={s.revenueChange}
          endLabel={dayLabel(new Date(s.window.end.getTime() - 1), s.timeZone)}
          startLabel={dayLabel(s.window.start, s.timeZone)}
          title="Revenue"
          total={money(s.currentRevenue, s.currency)}
        />
        <PopularProducts data={s.popular} />
      </div>

      <div className={`${baseClass}__lower`}>
        <RecentOrders adminPath={adminPath} orders={s.recentOrders} timeZone={s.timeZone} />
        <OrderHealth counts={s.statusCounts} />

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
                  <dt>
                    {row.image ? (
                      <Image alt={row.alt || ''} height={40} src={row.image} width={40} />
                    ) : (
                      <span aria-hidden="true" className={`${baseClass}__row-image`} />
                    )}
                    <span>{row.title}</span>
                  </dt>
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
