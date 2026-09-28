'use client'

import React from 'react'

import { IconHealth } from '../icons'

import './index.scss'

export type StatusCount = { completed: number; processing: number; cancelled: number; refunded: number }

type Props = { counts: StatusCount }

/**
 * The state of the order pipeline, as a compact ring.
 *
 * Status is a reserved role, not a series — each state gets its own fixed colour
 * and a written label, so it never reads by colour alone. Segments are ordered
 * healthy to unhealthy so a growing problem shows as the bar filling from the right.
 * Hovering a segment names it and adds its share, which the key below cannot show.
 */
export const OrderHealth: React.FC<Props> = ({ counts }) => {
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
          <div className="order-health__visual">
            <svg
              aria-label={segments.map((s) => `${s.n} ${s.label.toLowerCase()}`).join(', ')}
              className="order-health__ring"
              role="img"
              viewBox="0 0 120 120"
            >
              <circle className="order-health__ring-track" cx="60" cy="60" r="46" />
              {segments.reduce<React.ReactNode[]>((nodes, segment, index) => {
                const previous = segments.slice(0, index).reduce((sum, item) => sum + item.n, 0)
                const length = (segment.n / total) * 100
                nodes.push(
                  <circle
                    className={`order-health__ring-segment order-health__ring-segment--${segment.key}`}
                    cx="60"
                    cy="60"
                    key={segment.key}
                    pathLength="100"
                    r="46"
                    strokeDasharray={`${Math.max(0, length - 0.8)} ${100 - Math.max(0, length - 0.8)}`}
                    strokeDashoffset={-(previous / total) * 100}
                  />,
                )
                return nodes
              }, [])}
            </svg>
            <span className="order-health__score">
              <strong>{Math.round((counts.completed / total) * 100)}%</strong>
              <span>Healthy</span>
            </span>
          </div>

          <ul className="order-health__key">
            {segments.map((s) => (
              <li key={s.key}>
                <span className={`order-health__swatch order-health__swatch--${s.key}`} />
                <span>{s.label}</span>
                <b>{Math.round((s.n / total) * 100)}%</b>
                <em>{s.n}</em>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
