import React from 'react'

import './index.scss'

export type DayPoint = { date: string; revenue: number; orders: number }

type Props = { data: DayPoint[]; currency?: string }

const W = 760
const H = 210
const PAD = { top: 14, right: 10, bottom: 26, left: 46 }

const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })

const axisMoney = (minor: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    notation: minor >= 100000 ? 'compact' : 'standard',
  }).format(minor / 100)

const fullMoney = (minor: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minor / 100)

/**
 * Revenue per day.
 *
 * One series, so no legend — the title names it. A line rather than bars because
 * this is a trend over consecutive days, and the last point is emphasised since
 * "where are we now" is the question the chart is usually asked.
 */
export const SalesChart: React.FC<Props> = ({ data, currency = 'USD' }) => {
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const peak = Math.max(1, ...data.map((d) => d.revenue))
  // Round the top to something a person would say out loud, so every tick names
  // a real value rather than an artefact of the data.
  const magnitude = Math.pow(10, Math.floor(Math.log10(peak)))
  const top = Math.ceil(peak / (magnitude / 2)) * (magnitude / 2)
  const ticks = [0, top / 2, top]

  const x = (i: number) => PAD.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW)
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(d.revenue).toFixed(1)}`).join(' ')
  const area = `${line} L${x(data.length - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`
  const last = data[data.length - 1]

  return (
    <figure className="sales-chart">
      <figcaption className="sales-chart__head">
        <h3 className="sales-chart__title">Revenue</h3>
        <span className="sales-chart__range">last {data.length} days</span>
      </figcaption>

      <svg className="sales-chart__svg" preserveAspectRatio="xMidYMid meet" role="img" viewBox={`0 0 ${W} ${H}`}>
        {/* One text child: React collapses several into a single DOM node,
            which mismatches on hydration. */}
        <title>{`Revenue per day over the last ${data.length} days`}</title>

        {ticks.map((t) => (
          <g key={t}>
            <line className="sales-chart__grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="sales-chart__tick" x={PAD.left - 8} y={y(t) + 3.5} textAnchor="end">
              {axisMoney(t, currency)}
            </text>
          </g>
        ))}

        <path className="sales-chart__area" d={area} />
        <path className="sales-chart__line" d={line} />

        {data.map((d, i) => (
          <circle className="sales-chart__hit" cx={x(i)} cy={y(d.revenue)} key={d.date} r={9}>
            <title>{`${shortDay(d.date)} — ${fullMoney(d.revenue, currency)} from ${d.orders} order${d.orders === 1 ? '' : 's'}`}</title>
          </circle>
        ))}

        {/* The endpoint carries the "where are we now" reading. */}
        <circle className="sales-chart__endpoint" cx={x(data.length - 1)} cy={y(last.revenue)} r={4} />

        {data.map((d, i) =>
          i % 6 === 0 || i === data.length - 1 ? (
            <text className="sales-chart__tick" key={`l-${d.date}`} x={x(i)} y={H - 8} textAnchor="middle">
              {shortDay(d.date)}
            </text>
          ) : null,
        )}

        <line className="sales-chart__axis" x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} />
      </svg>

      <table className="sales-chart__table">
        <caption>Revenue by day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Revenue</th>
            <th scope="col">Orders</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{shortDay(d.date)}</th>
              <td>{fullMoney(d.revenue, currency)}</td>
              <td>{d.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
