import React from 'react'

import { IconPopular } from '../icons'

import './index.scss'

export type PopularProduct = { title: string; units: number }

/**
 * Best sellers by units.
 *
 * Each row gets its own hue, validated for colour-blind separation in both
 * themes, with the name and unit count spelled out beside it — the colour is
 * decoration on an already-labelled row, never the thing carrying the value.
 */
export const PopularProducts: React.FC<{ data: PopularProduct[] }> = ({ data }) => {
  const peak = Math.max(1, ...data.map((d) => d.units))
  // A round axis top so the scale ticks name whole units.
  const step = peak <= 50 ? 25 : peak <= 200 ? 50 : 100
  const top = Math.ceil(peak / step) * step
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step)

  return (
    <section className="popular">
      <h3 className="popular__title">
        <IconPopular className="popular__icon" />
        Popular products
      </h3>

      {data.length === 0 ? (
        <p className="popular__empty">Best sellers appear here once orders start coming in.</p>
      ) : (
        <>
          <ol className="popular__list">
            {data.map((d, i) => (
              <li className={`popular__row popular__row--${i + 1}`} key={d.title}>
                <div className="popular__label">
                  <span className="popular__name">{d.title}</span>
                  <span className="popular__units">{d.units.toLocaleString('en-US')} sold</span>
                </div>
                <div className="popular__track">
                  <div className="popular__bar" style={{ width: `${(d.units / top) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>

          <div className="popular__axis" aria-hidden="true">
            {ticks.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
