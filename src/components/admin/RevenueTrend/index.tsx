'use client'

import React from 'react'

import { IconBars, IconTrend } from '../icons'

import './index.scss'

export type Series = { label: string; points: number[] }

type Props = {
  current: Series
  total: string
  delta?: number
  startLabel: string
  endLabel: string
  /** One label per point, so a hovered day can name itself. */
  dayLabels?: string[]
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

/** The exact figure, for the tooltip — a compacted "$1.2K" is not an answer. */
const exactMoney = (minor: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minor / 100)

/**
 * Revenue for the current period.
 *
 * One series, so no legend — the title names it. Bars are the default: daily
 * revenue is a set of discrete magnitudes, and a bar per day reads them off the
 * baseline without implying a continuous value between one day and the next. The
 * line view stays available for anyone reading the shape rather than the days,
 * and the choice is remembered.
 */
type Mode = 'line' | 'bars'
const STORAGE_KEY = 'marisol-admin:revenue-chart-mode:v2'

export const RevenueTrend: React.FC<Props> = ({
  current,
  total,
  delta,
  startLabel,
  endLabel,
  dayLabels,
  currency = 'USD',
}) => {
  const [mode, setMode] = React.useState<Mode>('bars')
  const [hover, setHover] = React.useState<number | null>(null)
  const svgRef = React.useRef<SVGSVGElement | null>(null)

  /**
   * Read the saved preference after mount rather than during render — reading it
   * while rendering would make the server and client disagree on the first frame.
   * Storage can throw outright in a private window, so it stays wrapped.
   */
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      // Hydrate a browser-only preference after the server-matching first render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === 'line' || saved === 'bars') setMode(saved)
    } catch {
      // No stored preference available; the default stands.
    }
  }, [])

  const choose = (next: Mode) => {
    setMode(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Preference just will not persist; the chart still switches.
    }
  }

  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const n = Math.max(current.points.length, 2)

  const peak = Math.max(1, ...current.points)
  const magnitude = Math.pow(10, Math.floor(Math.log10(peak)))
  const top = Math.ceil(peak / (magnitude / 2)) * (magnitude / 2)
  const ticks = [top, top / 2, 0]

  const x = (i: number) => PAD.left + (i / (n - 1)) * plotW
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH
  const path = (pts: number[]) => smoothPath(pts.map((v, i) => ({ x: x(i), y: y(v) })))

  const lastIdx = current.points.length - 1
  const dir = delta === undefined ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'

  /**
   * Which day is under the pointer.
   *
   * The svg scales with the panel but keeps its aspect ratio, so a client x maps
   * back to a viewBox x by one ratio — no per-mark hit rectangles needed, and the
   * whole plot answers the pointer rather than only the 20px a bar happens to fill.
   */
  const indexAt = (clientX: number): number | null => {
    const el = svgRef.current
    if (!el || lastIdx < 0) return null
    const box = el.getBoundingClientRect()
    if (!box.width) return null
    const vx = ((clientX - box.left) / box.width) * W
    const i = Math.round(((vx - PAD.left) / plotW) * (n - 1))
    return Math.min(lastIdx, Math.max(0, i))
  }

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => setHover(indexAt(e.clientX))

  /** Arrow keys walk the same readout, so the values are not pointer-only. */
  const onKey = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (lastIdx < 0) return
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) {
      if (e.key === 'Escape') setHover(null)
      return
    }
    e.preventDefault()
    setHover((h) => Math.min(lastIdx, Math.max(0, (h === null ? (step > 0 ? -1 : lastIdx + 1) : h) + step)))
  }

  const active = hover !== null && hover >= 0 && hover <= lastIdx ? hover : null
  const activeValue = active === null ? 0 : current.points[active]
  // Nudge the tooltip inward at the ends so it never hangs off the panel.
  const anchor = active === null ? 0 : (x(active) / W) * 100
  const align = anchor < 18 ? 'start' : anchor > 82 ? 'end' : 'center'

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
        <div className="revenue-trend__controls">
          <div aria-label="Chart type" className="revenue-trend__switch" role="group">
            <button
              aria-pressed={mode === 'line'}
              className="revenue-trend__switch-btn"
              onClick={() => choose('line')}
              type="button"
            >
              <IconTrend className="revenue-trend__switch-icon" />
              Line
            </button>
            <button
              aria-pressed={mode === 'bars'}
              className="revenue-trend__switch-btn"
              onClick={() => choose('bars')}
              type="button"
            >
              <IconBars className="revenue-trend__switch-icon" />
              Bars
            </button>
          </div>
        </div>
      </figcaption>

      <div className={`revenue-trend__plot${active !== null ? ' revenue-trend__plot--reading' : ''}`}>
      <svg
        className="revenue-trend__svg"
        onBlur={() => setHover(null)}
        onKeyDown={onKey}
        onPointerLeave={() => setHover(null)}
        onPointerMove={onMove}
        preserveAspectRatio="xMidYMid meet"
        ref={svgRef}
        role="img"
        tabIndex={0}
        viewBox={`0 0 ${W} ${H}`}
      >
        <title>{`Revenue for each of the last ${n} days`}</title>

        {ticks.map((t) => (
          <g key={t}>
            <line className="revenue-trend__grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="revenue-trend__tick" x={PAD.left - 10} y={y(t) + 3.5} textAnchor="end">
              {money(t, currency)}
            </text>
          </g>
        ))}

        {mode === 'line' ? (
          <>
            <path className="revenue-trend__line revenue-trend__line--current" d={path(current.points)} />
            {lastIdx >= 0 && (
              <circle className="revenue-trend__endpoint" cx={x(lastIdx)} cy={y(current.points[lastIdx])} r={4.5} />
            )}
          </>
        ) : (
          current.points.map((v, i) => {
            // Leave a couple of pixels of surface between bars so they never touch.
            const w = Math.max(2, plotW / n - 3)
            return (
              <rect
                className={`revenue-trend__bar${i === active ? ' revenue-trend__bar--active' : ''}`}
                height={Math.max(v > 0 ? 1.5 : 0, PAD.top + plotH - y(v))}
                key={i}
                rx={2}
                width={w}
                x={x(i) - w / 2}
                y={y(v)}
              />
            )
          })
        )}

        {/* Bars need no crosshair — the lit bar already locates the reading. */}
        {active !== null && mode === 'line' && (
          <g className="revenue-trend__cursor">
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} />
            <circle cx={x(active)} cy={y(activeValue)} r={4.5} />
          </g>
        )}

        <text className="revenue-trend__tick" x={PAD.left} y={H - 9}>{startLabel}</text>
        <text className="revenue-trend__tick" x={W - PAD.right} y={H - 9} textAnchor="end">{endLabel}</text>
      </svg>

      {active !== null && (
        <div
          aria-live="polite"
          className={`revenue-trend__tip revenue-trend__tip--${align}`}
          style={{ left: `${anchor}%`, top: `${(y(activeValue) / H) * 100}%` }}
        >
          <span className="revenue-trend__tip-day">{dayLabels?.[active] ?? `Day ${active + 1}`}</span>
          <span className="revenue-trend__tip-value">{exactMoney(activeValue, currency)}</span>
        </div>
      )}
      </div>
    </figure>
  )
}
