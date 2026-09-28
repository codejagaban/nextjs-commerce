import Link from 'next/link'
import React from 'react'

import type { RecentOrder } from '../Dashboard/queries'
import { IconOrders } from '../icons'

import './index.scss'

type Props = {
  adminPath: string
  orders: RecentOrder[]
  timeZone: string
}

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minor / 100)

const words = (value: string) =>
  value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const fulfillmentLabel = (status: string) => {
  if (status === 'processing') return 'Unfulfilled'
  if (status === 'completed') return 'Fulfilled'
  if (status === 'refunded') return 'Refunded'
  if (status === 'cancelled') return 'Cancelled'
  return words(status)
}

export const RecentOrders: React.FC<Props> = ({ adminPath, orders, timeZone }) => (
  <section className="recent-orders">
    <header className="recent-orders__head">
      <h3>
        <IconOrders className="recent-orders__icon" />
        Recent orders
      </h3>
      <Link href={`${adminPath}/collections/orders`}>View all</Link>
    </header>

    {orders.length === 0 ? (
      <p className="recent-orders__empty">New orders will appear here.</p>
    ) : (
      <div className="recent-orders__table" aria-label="Five most recent orders">
        <div className="recent-orders__labels" aria-hidden="true">
          <span>Order</span>
          <span>Customer</span>
          <span>Total</span>
          <span>Payment</span>
          <span>Fulfilment</span>
          <span>Date</span>
        </div>
        {orders.map((order) => (
          <Link
            className="recent-orders__row"
            href={`${adminPath}/collections/orders/${order.id}`}
            key={order.id}
          >
            <strong>#{order.id}</strong>
            <span className="recent-orders__customer">{order.customer}</span>
            <span className="recent-orders__money">
              {money(order.total, order.currency)}
            </span>
            <span
              className={`recent-orders__status recent-orders__status--payment recent-orders__status--${order.paymentStatus}`}
            >
              {words(order.paymentStatus)}
            </span>
            <span
              className={`recent-orders__status recent-orders__status--fulfilment recent-orders__status--${order.fulfillmentStatus}`}
            >
              {fulfillmentLabel(order.fulfillmentStatus)}
            </span>
            <time dateTime={order.createdAt}>
              {new Date(order.createdAt).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                timeZone,
              })}
            </time>
          </Link>
        ))}
      </div>
    )}
  </section>
)
