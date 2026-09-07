import React from 'react'

import { IconTrend } from '../icons'

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

/**
 * Monotone cubic interpolation (Fritsch–Carlson).
 *
 * A plain spline through spiky daily figures overshoots — the curve dips below
 * zero between a busy day and a quiet one, drawing revenue that never happened.
 * Monotone tangents are clamped so the curve never leaves the range of the points
 * it joins: smooth edges, honest values.
 */
function smoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 2) return pts.length ? `M${pts[0].x} ${pts[0].y}` : ''
  const n = pts.length
  const dx: number[] = []
  const dy: number[] = []
  const slope: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x
    dy[i] = pts[i + 1].y - pts[i].y
    slope[i] = dx[i] === 0 ? 0 : dy[i] / dx[i]
  }

  const m: number[] = [slope[0]]
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) {
      m[i] = 0 // a turning point stays flat, so the curve cannot overshoot it
    } else {
      const w1 = 2 * dx[i] + dx[i - 1]
      const w2 = dx[i] + 2 * dx[i - 1]
      m[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i])
    }
  }
  m[n - 1] = slope[n - 2]

  let d = `M${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += ` C${(pts[i].x + h).toFixed(2)} ${(pts[i].y + m[i] * h).toFixed(2)}`
    d += ` ${(pts[i + 1].x - h).toFixed(2)} ${(pts[i + 1].y - m[i + 1] * h).toFixed(2)}`
    d += ` ${pts[i + 1].x.toFixed(2)} ${pts[i + 1].y.toFixed(2)}`
  }
  return d
}

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
  const path = (pts: number[]) => smoothPath(pts.map((v, i) => ({ x: x(i), y: y(v) })))

  const lastIdx = current.points.length - 1
  const dir = delta === undefined ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'

  return (
    <figure className="revenue-trend">
      <figcaption className="revenue-trend__head">
        <div className="revenue-trend__headline">
          <h3 className="revenue-trend__title">
            <IconTrend className="revenue-trend__icon" />
            Total revenue
          </h3>
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
