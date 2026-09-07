'use client'

import React from 'react'

import { IconHealth } from '../icons'

import './index.scss'

export type StatusCount = { completed: number; processing: number; cancelled: number; refunded: number }

type Props = { counts: StatusCount; unfinishedPayments: number }

/**
 * The state of the order pipeline, as one bar.
 *
 * Status is a reserved role, not a series — each state gets its own fixed colour
 * and a written label, so it never reads by colour alone. Segments are ordered
 * healthy to unhealthy so a growing problem shows as the bar filling from the right.
 * Hovering a segment names it and adds its share, which the key below cannot show.
 */
export const OrderHealth: React.FC<Props> = ({ counts, unfinishedPayments }) => {
  const [hover, setHover] = React.useState<string | null>(null)
  const total = counts.completed + counts.processing + counts.cancelled + counts.refunded

  const segments = [
    { key: 'completed', label: 'Completed', n: counts.completed },
    { key: 'processing', label: 'Processing', n: counts.processing },
    { key: 'refunded', label: 'Refunded', n: counts.refunded },
    { key: 'cancelled', label: 'Cancelled', n: counts.cancelled },
  ].filter((s) => s.n > 0)

  return (
    <section className="order-health">
      <h3 className="order-health__title">
        <IconHealth className="order-health__icon" />
        Order health <span className="order-health__note">{total} order{total === 1 ? '' : 's'}</span>
      </h3>

      {total === 0 ? (
        <p className="order-health__empty">Nothing to report until the first order lands.</p>
      ) : (
        <>
          <div
            aria-label={segments.map((s) => `${s.n} ${s.label.toLowerCase()}`).join(', ')}
            className="order-health__bar"
            role="img"
          >
            {segments.map((s, i) => (
              <span
                className={`order-health__seg order-health__seg--${s.key}`}
                key={s.key}
                onPointerEnter={() => setHover(s.key)}
                onPointerLeave={() => setHover((h) => (h === s.key ? null : h))}
                style={{ width: `${(s.n / total) * 100}%` }}
              >
                {hover === s.key && (
                  <span
                    className={`order-health__tip${
                      i === 0 ? ' order-health__tip--start' : ''
                    }${i === segments.length - 1 ? ' order-health__tip--end' : ''}`}
                  >
                    <span className="order-health__tip-label">{s.label}</span>
                    <span className="order-health__tip-value">
                      {s.n} · {Math.round((s.n / total) * 100)}%
                    </span>
                  </span>
                )}
              </span>
            ))}
          </div>

          <ul className="order-health__key">
            {segments.map((s, i) => (
              <li key={s.key}>
                <span className={`order-health__swatch order-health__swatch--${s.key}`} />
                {s.label} <b>{s.n}</b>
              </li>
            ))}
          </ul>
        </>
      )}

      {unfinishedPayments > 0 && (
        <p className="order-health__aside">
          {unfinishedPayments} checkout{unfinishedPayments === 1 ? '' : 's'} started at the payment
          step without finishing.
        </p>
      )}
    </section>
  )
}
