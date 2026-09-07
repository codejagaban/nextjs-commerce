import React from 'react'

import './index.scss'

export type Kpi = {
  Icon?: React.FC<React.ComponentProps<'svg'>>
  label: string
  value: string
  /** Percentage change against the previous period; omit when there is nothing to compare. */
  delta?: number
  compare?: string
}

/**
 * The headline figures, in one row.
 *
 * Direction is carried by an arrow and a sign as well as colour, so the movement
 * still reads without it. A metric with no comparable previous period simply
 * shows no delta rather than a misleading zero.
 */
export const KpiStrip: React.FC<{ items: Kpi[] }> = ({ items }) => (
  <div className="kpi-strip">
    {items.map((k) => {
      const dir = k.delta === undefined ? null : k.delta > 0 ? 'up' : k.delta < 0 ? 'down' : 'flat'
      return (
        <div className="kpi-strip__item" key={k.label}>
          <span className="kpi-strip__label">
            {k.Icon && <k.Icon className="kpi-strip__icon" />}
            {k.label}
          </span>
          <div className="kpi-strip__figure">
            <span className="kpi-strip__value">{k.value}</span>
            {dir && (
              <span className={`kpi-strip__delta kpi-strip__delta--${dir}`}>
                <span aria-hidden="true">{dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→'}</span>
                {Math.abs(k.delta as number).toFixed(k.delta === Math.round(k.delta as number) ? 0 : 1)}%
              </span>
            )}
          </div>
          {k.compare && <span className="kpi-strip__compare">{k.compare}</span>}
        </div>
      )
    })}
  </div>
)
