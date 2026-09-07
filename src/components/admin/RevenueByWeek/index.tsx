import React from 'react'

import './index.scss'

export type WeekPoint = { weekStart: string; revenue: number; orders: number }

type Props = { data: WeekPoint[]; currency?: string }

const W = 760
const H = 190
const PAD = { top: 12, right: 10, bottom: 28, left: 52 }

const label = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })

const money = (minor: number, currency: string, compact = false) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    notation: compact && minor >= 1000000 ? 'compact' : 'standard',
  }).format(minor / 100)

/**
 * Revenue per week.
 *
 * Weekly rather than daily on purpose: a store's weekend dip is real but it is
 * not the trend, and at daily resolution it drowns the direction. One series, so
 * no legend — the title names it.
 */
export const RevenueByWeek: React.FC<Props> = ({ data, currency = 'USD' }) => {
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  if (data.length === 0) {
    return (
      <figure className="revenue-week">
        <figcaption className="revenue-week__head">
          <h3 className="revenue-week__title">Revenue by week</h3>
        </figcaption>
        <p className="revenue-week__empty">
          Weekly revenue appears here once orders start coming in.
        </p>
      </figure>
    )
  }

  const peak = Math.max(1, ...data.map((d) => d.revenue))
  // Round the top to a figure someone would say out loud, so both ticks name real values.
  const magnitude = Math.pow(10, Math.floor(Math.log10(peak)))
  const top = Math.ceil(peak / (magnitude / 2)) * (magnitude / 2)

  const slot = plotW / data.length
  const barW = Math.min(34, slot - 8)
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH
  const baseline = PAD.top + plotH

  return (
    <figure className="revenue-week">
      <figcaption className="revenue-week__head">
        <h3 className="revenue-week__title">Revenue by week</h3>
        <span className="revenue-week__range">last {data.length} weeks</span>
      </figcaption>

      <svg className="revenue-week__svg" preserveAspectRatio="xMidYMid meet" role="img" viewBox={`0 0 ${W} ${H}`}>
        <title>{`Revenue for each of the last ${data.length} weeks`}</title>

        {[top, top / 2].map((t) => (
          <g key={t}>
            <line className="revenue-week__grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="revenue-week__tick" x={PAD.left - 8} y={y(t) + 3.5} textAnchor="end">
              {money(t, currency, true)}
            </text>
          </g>
        ))}
        <text className="revenue-week__tick" x={PAD.left - 8} y={baseline + 3.5} textAnchor="end">
          {money(0, currency)}
        </text>

        {data.map((d, i) => {
          const x = PAD.left + i * slot + (slot - barW) / 2
          return (
            <rect
              className="revenue-week__bar"
              height={Math.max(1, baseline - y(d.revenue))}
              key={d.weekStart}
              rx={3}
              width={barW}
              x={x}
              y={y(d.revenue)}
            >
              <title>{`Week of ${label(d.weekStart)} — ${money(d.revenue, currency)} from ${d.orders} order${d.orders === 1 ? '' : 's'}`}</title>
            </rect>
          )
        })}

        <line className="revenue-week__axis" x1={PAD.left} x2={W - PAD.right} y1={baseline} y2={baseline} />

        {data.map((d, i) =>
          i % 4 === 0 || i === data.length - 1 ? (
            <text
              className="revenue-week__tick"
              key={`l-${d.weekStart}`}
              textAnchor="middle"
              x={PAD.left + i * slot + slot / 2}
              y={H - 9}
            >
              {label(d.weekStart)}
            </text>
          ) : null,
        )}
      </svg>

      <table className="revenue-week__table">
        <caption>Revenue by week</caption>
        <thead>
          <tr>
            <th scope="col">Week beginning</th>
            <th scope="col">Revenue</th>
            <th scope="col">Orders</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.weekStart}>
              <th scope="row">{label(d.weekStart)}</th>
              <td>{money(d.revenue, currency)}</td>
              <td>{d.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
