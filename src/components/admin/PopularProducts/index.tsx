import React from 'react'
import Image from 'next/image'

import { IconPopular } from '../icons'

import './index.scss'

export type PopularProduct = {
  alt?: string
  image?: string
  price?: string
  title: string
  units: number
}

/**
 * Best sellers by units.
 *
 * Each row gets its own hue, validated for colour-blind separation in both
 * themes, with the name and unit count spelled out beside it — the colour is
 * decoration on an already-labelled row, never the thing carrying the value.
 */
export const PopularProducts: React.FC<{ data: PopularProduct[] }> = ({ data }) => {
  return (
    <section className="popular">
      <h3 className="popular__title">
        <IconPopular className="popular__icon" />
        Popular products
      </h3>

      {data.length === 0 ? (
        <p className="popular__empty">Best sellers appear here once orders start coming in.</p>
      ) : (
        <ol className="popular__list">
          {data.map((d, i) => (
            <li className="popular__row" key={d.title}>
              <span className="popular__rank">{i + 1}</span>
              {d.image ? (
                <Image
                  alt={d.alt || ''}
                  className="popular__image"
                  height={48}
                  src={d.image}
                  width={48}
                />
              ) : (
                <span aria-hidden="true" className="popular__image popular__image--empty" />
              )}
              <span className="popular__name">{d.title}</span>
              <span className="popular__units">{d.units.toLocaleString('en-US')} sold</span>
              {d.price && <span className="popular__price">{d.price}</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
