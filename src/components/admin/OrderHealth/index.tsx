import React from 'react'

import './index.scss'

export type StatusCount = { completed: number; processing: number; cancelled: number; refunded: number }

type Props = { counts: StatusCount; unfinishedPayments: number }

/**
 * The state of the order pipeline, as one bar.
 *
 * Status is a reserved role, not a series — each state gets its own fixed colour
 * and a written label, so it never reads by colour alone. Segments are ordered
 * healthy to unhealthy so a growing problem shows as the bar filling from the right.
 */
export const OrderHealth: React.FC<Props> = ({ counts, unfinishedPayments }) => {
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
            {segments.map((s) => (
              <span
                className={`order-health__seg order-health__seg--${s.key}`}
                key={s.key}
                style={{ width: `${(s.n / total) * 100}%` }}
                title={`${s.label}: ${s.n}`}
              />
            ))}
          </div>

          <ul className="order-health__key">
            {segments.map((s) => (
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
