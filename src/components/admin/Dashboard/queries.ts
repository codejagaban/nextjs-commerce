import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import type { StatusCount } from '../OrderHealth'
import { dayKeysFrom } from '@/utilities/storeTime'

export type SalesAggregate = {
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

export type AttentionCounts = {
  failedPayments: number
  incompleteCheckouts: number
  outOfStockProducts: number
  outOfStockVariants: number
  processingOrders: number
  stalledPayments: number
}

export type RecentOrder = {
  createdAt: string
  currency: string
  customer: string
  fulfillmentStatus: string
  id: number
  paymentStatus: string
  total: number
}

type SalesRow = {
  day: string
  discounts: string | number | null
  gross_sales: string | number | null
  net_orders: string | number | null
  net_sales: string | number | null
  period: 'current' | 'prior'
  product_refunds: string | number | null
  shipping: string | number | null
  shipping_refunds: string | number | null
  taxes: string | number | null
  tax_refunds: string | number | null
  total_sales: string | number | null
}

type StatusRow = { count: string | number; status: keyof StatusCount }
type ProductRow = { product_id: number; units: string | number }
type AttentionRow = {
  failed_payments: string | number
  incomplete_checkouts: string | number
  out_of_stock_products: string | number
  out_of_stock_variants: string | number
  processing_orders: string | number
  stalled_payments: string | number
}
type RecentOrderRow = {
  amount: string | number | null
  created_at: Date | string
  currency: string | null
  customer: string | null
  fulfillment_status: string | null
  id: number
  payment_status: string | null
}

const rowsFrom = <T>(result: unknown): T[] => {
  if (typeof result !== 'object' || result === null || !('rows' in result)) return []
  return Array.isArray(result.rows) ? (result.rows as T[]) : []
}

const amount = (value: string | number | null | undefined): number => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export const attentionCountsFrom = (result: unknown): AttentionCounts => {
  const row = rowsFrom<AttentionRow>(result)[0]
  return {
    failedPayments: amount(row?.failed_payments),
    incompleteCheckouts: amount(row?.incomplete_checkouts),
    outOfStockProducts: amount(row?.out_of_stock_products),
    outOfStockVariants: amount(row?.out_of_stock_variants),
    processingOrders: amount(row?.processing_orders),
    stalledPayments: amount(row?.stalled_payments),
  }
}

export const recentOrdersFrom = (result: unknown): RecentOrder[] =>
  rowsFrom<RecentOrderRow>(result).map((row) => ({
    createdAt: new Date(row.created_at).toISOString(),
    currency: row.currency || 'USD',
    customer: row.customer || 'Guest customer',
    fulfillmentStatus: row.fulfillment_status || 'processing',
    id: row.id,
    paymentStatus: row.payment_status || 'not_recorded',
    total: amount(row.amount),
  }))

const emptySales = (days: number): SalesAggregate => ({
  averageOrderValue: 0,
  dailyNetSales: new Array<number>(days).fill(0),
  discounts: 0,
  grossSales: 0,
  netOrders: 0,
  netSales: 0,
  productRefunds: 0,
  refunds: 0,
  shipping: 0,
  shippingRefunds: 0,
  taxes: 0,
  taxRefunds: 0,
  totalSales: 0,
})

/**
 * Aggregate report rows in Postgres. The application receives at most one row
 * per reporting day instead of every order ever placed.
 */
export async function getDashboardOrderData({
  currency,
  days,
  end,
  payload,
  priorEnd,
  priorStart,
  start,
  timeZone,
}: {
  currency: string
  days: number
  end: Date
  payload: Payload
  priorEnd: Date
  priorStart: Date
  start: Date
  timeZone: string
}) {
  const salesResult = await payload.db.drizzle.execute(sql`
    WITH report_orders AS (
      SELECT
        "created_at",
        "status",
        COALESCE("subtotal", "amount", 0) AS "subtotal",
        COALESCE("discount_total", 0) AS "discount_total",
        COALESCE("shipping_total", 0) AS "shipping_total",
        COALESCE("tax_total", 0) AS "tax_total",
        COALESCE("product_refund_total", 0) AS "product_refund_total",
        COALESCE("shipping_refund_total", 0) AS "shipping_refund_total",
        COALESCE("tax_refund_total", 0) AS "tax_refund_total"
      FROM "orders"
      WHERE (
          ("created_at" >= ${start} AND "created_at" < ${end})
          OR ("created_at" >= ${priorStart} AND "created_at" < ${priorEnd})
        )
        AND ("currency" = ${currency} OR "currency" IS NULL)
        AND "status" IS DISTINCT FROM 'cancelled'
    )
    SELECT
      CASE
        WHEN "created_at" >= ${start} AND "created_at" < ${end} THEN 'current'
        ELSE 'prior'
      END AS "period",
      TO_CHAR("created_at" AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS "day",
      SUM("subtotal") AS "gross_sales",
      SUM("discount_total") AS "discounts",
      SUM("product_refund_total") AS "product_refunds",
      SUM("shipping_total") AS "shipping",
      SUM("shipping_refund_total") AS "shipping_refunds",
      SUM("tax_total") AS "taxes",
      SUM("tax_refund_total") AS "tax_refunds",
      SUM(GREATEST(0, "subtotal" - "discount_total" - "product_refund_total")) AS "net_sales",
      SUM(
        GREATEST(0, "subtotal" - "discount_total" - "product_refund_total")
        + "shipping_total" - "shipping_refund_total"
        + "tax_total" - "tax_refund_total"
      ) AS "total_sales",
      COUNT(*) FILTER (
        WHERE NOT (
          "status" = 'refunded'
          AND GREATEST(0, "subtotal" - "discount_total" - "product_refund_total") = 0
        )
      ) AS "net_orders"
    FROM report_orders
    GROUP BY "period", "day"
    ORDER BY "day"
  `)

  const [statusResult, attentionResult, popularResult, recentResult] = await Promise.all([
    payload.db.drizzle.execute(sql`
      SELECT COALESCE("status"::text, 'processing') AS "status", COUNT(*) AS "count"
      FROM "orders"
      WHERE "created_at" >= ${start} AND "created_at" < ${end}
        AND ("currency" = ${currency} OR "currency" IS NULL)
      GROUP BY "status"
    `),
    payload.db.drizzle.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM "orders" WHERE "status" = 'processing') AS "processing_orders",
        (
          SELECT COUNT(*) FROM "transactions"
          WHERE "status" = 'failed' AND "created_at" >= NOW() - INTERVAL '24 hours'
        ) AS "failed_payments",
        (
          SELECT COUNT(*) FROM "transactions"
          WHERE "status" = 'pending' AND "created_at" < NOW() - INTERVAL '30 minutes'
        ) AS "stalled_payments",
        (
          SELECT COUNT(DISTINCT "carts"."id")
          FROM "carts"
          WHERE "carts"."purchased_at" IS NULL
            AND "carts"."updated_at" < NOW() - INTERVAL '24 hours'
            AND EXISTS (
              SELECT 1 FROM "carts_items"
              WHERE "carts_items"."_parent_id" = "carts"."id"
            )
            AND NOT EXISTS (
              SELECT 1 FROM "transactions"
              WHERE "transactions"."cart_id" = "carts"."id"
                AND "transactions"."status" IN ('pending', 'processing', 'succeeded')
            )
        ) AS "incomplete_checkouts",
        (
          SELECT COUNT(*) FROM "products"
          WHERE "enable_variants" IS DISTINCT FROM TRUE
            AND COALESCE("inventory", 0) <= 0
            AND "deleted_at" IS NULL
            AND "_status" = 'published'
        ) AS "out_of_stock_products",
        (
          SELECT COUNT(*)
          FROM "variants"
          INNER JOIN "products" ON "products"."id" = "variants"."product_id"
          WHERE COALESCE("variants"."inventory", 0) <= 0
            AND "variants"."deleted_at" IS NULL
            AND "variants"."_status" = 'published'
            AND "products"."deleted_at" IS NULL
            AND "products"."_status" = 'published'
        ) AS "out_of_stock_variants"
    `),
    payload.db.drizzle.execute(sql`
      SELECT "items"."product_id", SUM("items"."quantity") AS "units"
      FROM "orders_items" AS "items"
      INNER JOIN "orders" ON "orders"."id" = "items"."_parent_id"
      WHERE "orders"."created_at" >= ${start}
        AND "orders"."created_at" < ${end}
        AND ("orders"."currency" = ${currency} OR "orders"."currency" IS NULL)
        AND ("orders"."status" IN ('processing', 'completed') OR "orders"."status" IS NULL)
        AND "items"."product_id" IS NOT NULL
      GROUP BY "items"."product_id"
      ORDER BY "units" DESC
      LIMIT 5
    `),
    payload.db.drizzle.execute(sql`
      SELECT
        "orders"."id",
        COALESCE(
          NULLIF("users"."name", ''),
          NULLIF("orders"."customer_email", ''),
          NULLIF("users"."email", ''),
          'Guest customer'
        ) AS "customer",
        COALESCE("orders"."amount", 0) AS "amount",
        COALESCE("orders"."currency"::text, ${currency}) AS "currency",
        COALESCE("orders"."status"::text, 'processing') AS "fulfillment_status",
        "latest_transaction"."status"::text AS "payment_status",
        "orders"."created_at"
      FROM "orders"
      LEFT JOIN "users" ON "users"."id" = "orders"."customer_id"
      LEFT JOIN LATERAL (
        SELECT "transactions"."status"
        FROM "transactions"
        WHERE "transactions"."order_id" = "orders"."id"
        ORDER BY "transactions"."updated_at" DESC, "transactions"."id" DESC
        LIMIT 1
      ) AS "latest_transaction" ON TRUE
      ORDER BY "orders"."created_at" DESC, "orders"."id" DESC
      LIMIT 5
    `),
  ])

  const current = emptySales(days)
  const prior = emptySales(days)
  const keys = {
    current: new Map(dayKeysFrom(start, days, timeZone).map((key, index) => [key, index])),
    prior: new Map(dayKeysFrom(priorStart, days, timeZone).map((key, index) => [key, index])),
  }

  for (const row of rowsFrom<SalesRow>(salesResult)) {
    const summary = row.period === 'current' ? current : prior
    summary.grossSales += amount(row.gross_sales)
    summary.discounts += amount(row.discounts)
    summary.productRefunds += amount(row.product_refunds)
    summary.shipping += amount(row.shipping)
    summary.shippingRefunds += amount(row.shipping_refunds)
    summary.taxes += amount(row.taxes)
    summary.taxRefunds += amount(row.tax_refunds)
    summary.netSales += amount(row.net_sales)
    summary.totalSales += amount(row.total_sales)
    summary.netOrders += amount(row.net_orders)
    const index = keys[row.period].get(row.day)
    if (index !== undefined) summary.dailyNetSales[index] = amount(row.net_sales)
  }

  for (const summary of [current, prior]) {
    summary.refunds = summary.productRefunds + summary.shippingRefunds + summary.taxRefunds
    summary.averageOrderValue = summary.netOrders
      ? Math.round(summary.totalSales / summary.netOrders)
      : 0
  }

  const statusCounts: StatusCount = { completed: 0, processing: 0, cancelled: 0, refunded: 0 }
  for (const row of rowsFrom<StatusRow>(statusResult)) {
    if (row.status in statusCounts) statusCounts[row.status] = amount(row.count)
  }

  return {
    attention: attentionCountsFrom(attentionResult),
    current,
    prior,
    popular: rowsFrom<ProductRow>(popularResult).map((row) => ({
      productID: row.product_id,
      units: amount(row.units),
    })),
    recentOrders: recentOrdersFrom(recentResult),
    statusCounts,
  }
}
