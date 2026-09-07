import React from 'react'

import './index.scss'

export type Series = { label: string; points: number[] }

type Props = {
  current: Series
  previous: Series
  total: string
  delta?: number
  startLabel: string
  endLabel: string
  currency?: string
}

const W = 780
const H = 240
const PAD = { top: 16, right: 12, bottom: 28, left: 54 }

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    notation: minor >= 100000 ? 'compact' : 'standard',
  }).format(minor / 100)

/**
 * Revenue for this period against the one before it.
 *
 * Two series, so a legend is always present. The comparison line is deliberately
 * recessive — it is context for the current line, not an equal partner — and the
 * current line ends on a marked point, since "where are we now" is the question.
 */
export const RevenueTrend: React.FC<Props> = ({
  current,
  previous,
  total,
  delta,
  startLabel,
  endLabel,
  currency = 'USD',
}) => {
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const n = Math.max(current.points.length, previous.points.length, 2)

  const peak = Math.max(1, ...current.points, ...previous.points)
  const magnitude = Math.pow(10, Math.floor(Math.log10(peak)))
  const top = Math.ceil(peak / (magnitude / 2)) * (magnitude / 2)
  const ticks = [top, top / 2, 0]

  const x = (i: number) => PAD.left + (i / (n - 1)) * plotW
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH
  const path = (pts: number[]) =>
    pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')

  const lastIdx = current.points.length - 1
  const dir = delta === undefined ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'

  return (
    <figure className="revenue-trend">
      <figcaption className="revenue-trend__head">
        <div className="revenue-trend__headline">
          <h3 className="revenue-trend__title">Total revenue</h3>
          <div className="revenue-trend__figure">
            <span className="revenue-trend__total">{total}</span>
            {dir && (
              <span className={`revenue-trend__delta revenue-trend__delta--${dir}`}>
                <span aria-hidden="true">{dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→'}</span>
                {Math.abs(delta as number).toFixed(0)}%
              </span>
            )}
            <span className="revenue-trend__compare">vs previous 30 days</span>
          </div>
        </div>
        <ul className="revenue-trend__legend">
          <li><span className="revenue-trend__key revenue-trend__key--current" />{current.label}</li>
          <li><span className="revenue-trend__key revenue-trend__key--previous" />{previous.label}</li>
        </ul>
      </figcaption>

      <svg className="revenue-trend__svg" preserveAspectRatio="xMidYMid meet" role="img" viewBox={`0 0 ${W} ${H}`}>
        <title>{`Revenue for the last 30 days compared with the 30 days before`}</title>

        {ticks.map((t) => (
          <g key={t}>
            <line className="revenue-trend__grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="revenue-trend__tick" x={PAD.left - 10} y={y(t) + 3.5} textAnchor="end">
              {money(t, currency)}
            </text>
          </g>
        ))}

        <path className="revenue-trend__line revenue-trend__line--previous" d={path(previous.points)} />
        <path className="revenue-trend__line revenue-trend__line--current" d={path(current.points)} />

        {lastIdx >= 0 && (
          <circle className="revenue-trend__endpoint" cx={x(lastIdx)} cy={y(current.points[lastIdx])} r={4.5} />
        )}

        <text className="revenue-trend__tick" x={PAD.left} y={H - 9}>{startLabel}</text>
        <text className="revenue-trend__tick" x={W - PAD.right} y={H - 9} textAnchor="end">{endLabel}</text>
      </svg>
    </figure>
  )
}
