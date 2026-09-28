import Link from 'next/link'
import React from 'react'

import type { AttentionCounts } from '../Dashboard/queries'
import { IconAttention } from '../icons'

import './index.scss'

type Props = {
  adminPath: string
  counts: AttentionCounts
}

type Filter = { field: string; operator: string; value: string }

const filteredHref = (adminPath: string, collection: string, filters: Filter[] = []) => {
  const path = `${adminPath}/collections/${collection}`
  if (!filters.length) return path
  const query = new URLSearchParams()
  filters.forEach((filter, index) => {
    query.set(`where[and][${index}][${filter.field}][${filter.operator}]`, filter.value)
  })
  return `${path}?${query}`
}

export const AttentionQueue: React.FC<Props> = ({ adminPath, counts }) => {
  const items = [
    {
      count: counts.processingOrders,
      detail: 'Paid orders waiting to be handled',
      href: filteredHref(adminPath, 'orders', [
        { field: 'status', operator: 'equals', value: 'processing' },
      ]),
      label: 'Orders to process',
    },
    {
      count: counts.failedPayments,
      detail: 'Payment attempts failed in the last 24 hours',
      href: filteredHref(adminPath, 'transactions', [
        { field: 'status', operator: 'equals', value: 'failed' },
      ]),
      label: 'Failed payments',
      tone: 'urgent',
    },
    {
      count: counts.stalledPayments,
      detail: 'Payments pending for more than 30 minutes',
      href: filteredHref(adminPath, 'transactions', [
        { field: 'status', operator: 'equals', value: 'pending' },
      ]),
      label: 'Stalled payments',
    },
    {
      count: counts.incompleteCheckouts,
      detail: 'Carts left untouched for at least 24 hours',
      href: filteredHref(adminPath, 'carts', [
        { field: 'purchasedAt', operator: 'exists', value: 'false' },
      ]),
      label: 'Incomplete checkouts',
    },
    {
      count: counts.outOfStockProducts,
      detail: 'Published products with no stock remaining',
      href: filteredHref(adminPath, 'products', [
        { field: 'enableVariants', operator: 'not_equals', value: 'true' },
        { field: 'inventory', operator: 'less_than_equal', value: '0' },
        { field: '_status', operator: 'equals', value: 'published' },
      ]),
      label: 'Products out of stock',
    },
    {
      count: counts.outOfStockVariants,
      detail: 'Published variants with no stock remaining',
      href: filteredHref(adminPath, 'variants', [
        { field: 'inventory', operator: 'less_than_equal', value: '0' },
        { field: '_status', operator: 'equals', value: 'published' },
      ]),
      label: 'Variants out of stock',
    },
  ].filter((item) => item.count > 0).slice(0, 3)
  const total = items.reduce((sum, item) => sum + item.count, 0)

  return (
    <section className="attention-queue">
      <header className="attention-queue__head">
        <h3>
          <IconAttention className="attention-queue__icon" />
          Needs attention
        </h3>
        {total > 0 && <span>{total} open</span>}
      </header>

      {items.length === 0 ? (
        <p className="attention-queue__empty">
          You’re caught up. There is nothing urgent to handle.
        </p>
      ) : (
        <div className="attention-queue__items">
          {items.map((item) => (
            <Link
              className={`attention-queue__item${item.tone ? ` attention-queue__item--${item.tone}` : ''}`}
              href={item.href}
              key={item.label}
            >
              <span className="attention-queue__copy">
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </span>
              <span className="attention-queue__count">{item.count.toLocaleString('en-US')}</span>
              <span aria-hidden="true" className="attention-queue__arrow">
                ↗
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
