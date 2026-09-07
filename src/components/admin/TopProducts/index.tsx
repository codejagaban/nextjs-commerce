import React from 'react'

import './index.scss'

export type ProductRevenue = { title: string; revenue: number; units: number }

type Props = { data: ProductRevenue[]; days: number; currency?: string }

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    minor / 100,
  )

/**
 * What is selling, ranked by revenue.
 *
 * One measure across products, so every bar carries the same hue — colouring by
 * rank would encode position twice and mean nothing on its own. Bars are drawn in
 * HTML rather than SVG so long product names wrap instead of being truncated, and
 * each row is labelled directly, which is the point of a ranked list.
 */
export const TopProducts: React.FC<Props> = ({ data, days, currency = 'USD' }) => {
  const peak = Math.max(1, ...data.map((d) => d.revenue))

  return (
    <figure className="top-products">
      <figcaption className="top-products__head">
        <h3 className="top-products__title">What&rsquo;s selling</h3>
        <span className="top-products__range">by revenue, last {days} days</span>
      </figcaption>

      {data.length === 0 ? (
        <p className="top-products__empty">No sales in this period yet.</p>
      ) : (
        <ol className="top-products__list">
          {data.map((d) => (
            <li className="top-products__row" key={d.title}>
              <div className="top-products__label">
                <span className="top-products__name">{d.title}</span>
                <span className="top-products__value">{money(d.revenue, currency)}</span>
              </div>
              <div className="top-products__track">
                <div
                  className="top-products__bar"
                  style={{ width: `${Math.max(2, (d.revenue / peak) * 100)}%` }}
                  title={`${d.title} — ${money(d.revenue, currency)} from ${d.units} unit${d.units === 1 ? '' : 's'}`}
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      <table className="top-products__table">
        <caption>Product revenue, last {days} days</caption>
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col">Revenue</th>
            <th scope="col">Units</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.title}>
              <th scope="row">{d.title}</th>
              <td>{money(d.revenue, currency)}</td>
              <td>{d.units}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
