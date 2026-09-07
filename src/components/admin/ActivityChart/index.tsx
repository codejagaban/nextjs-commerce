import React from 'react'

import './index.scss'

export type DayPoint = { date: string; started: number; completed: number }

type Props = { data: DayPoint[] }

const CHART_W = 720
const CHART_H = 190
const PAD = { top: 12, right: 8, bottom: 26, left: 34 }

const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })

/**
 * Checkout activity per day: payments started against orders completed.
 *
 * Two series, so the pair is drawn from the categorical slots in fixed order and
 * carries a legend as well as colour. Grouped bars rather than a line because each
 * day is a discrete count, not a continuous reading.
 */
export const ActivityChart: React.FC<Props> = ({ data }) => {
  const plotW = CHART_W - PAD.left - PAD.right
  const plotH = CHART_H - PAD.top - PAD.bottom

  const peak = Math.max(1, ...data.map((d) => Math.max(d.started, d.completed)))
  // These are counts, so the top rounds to a multiple of 4 — that keeps the
  // midpoint a whole number instead of labelling the axis 7.5 payments.
  const top = Math.max(4, Math.ceil(peak / 4) * 4)
  const ticks = [0, top / 2, top]

  const slot = plotW / data.length
  const barW = Math.min(9, (slot - 6) / 2)
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH

  return (
    <figure className="activity-chart">
      <figcaption className="activity-chart__head">
        <h3 className="activity-chart__title">Checkout activity</h3>
        <ul className="activity-chart__legend">
          <li>
            <span className="activity-chart__key activity-chart__key--started" />
            Payments started
          </li>
          <li>
            <span className="activity-chart__key activity-chart__key--completed" />
            Orders completed
          </li>
        </ul>
      </figcaption>

      <svg
        className="activity-chart__svg"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      >
        <title>Payments started and orders completed, by day, over the last two weeks</title>

        {ticks.map((t) => (
          <g key={t}>
            <line
              className="activity-chart__grid"
              x1={PAD.left}
              x2={CHART_W - PAD.right}
              y1={y(t)}
              y2={y(t)}
            />
            <text className="activity-chart__tick" x={PAD.left - 8} y={y(t) + 3.5} textAnchor="end">
              {t}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const cx = PAD.left + i * slot + slot / 2
          // 2px of surface between the pair so the bars never touch.
          const startedX = cx - barW - 1
          const completedX = cx + 1
          return (
            <g key={d.date}>
              {d.started > 0 && (
                <rect
                  className="activity-chart__bar activity-chart__bar--started"
                  x={startedX}
                  y={y(d.started)}
                  width={barW}
                  height={PAD.top + plotH - y(d.started)}
                  rx={3}
                >
                  <title>{`${shortDay(d.date)} — ${d.started} started`}</title>
                </rect>
              )}
              {d.completed > 0 && (
                <rect
                  className="activity-chart__bar activity-chart__bar--completed"
                  x={completedX}
                  y={y(d.completed)}
                  width={barW}
                  height={PAD.top + plotH - y(d.completed)}
                  rx={3}
                >
                  <title>{`${shortDay(d.date)} — ${d.completed} completed`}</title>
                </rect>
              )}
              {i % 3 === 0 && (
                <text
                  className="activity-chart__tick"
                  x={cx}
                  y={CHART_H - 8}
                  textAnchor="middle"
                >
                  {shortDay(d.date)}
                </text>
              )}
            </g>
          )
        })}

        <line
          className="activity-chart__axis"
          x1={PAD.left}
          x2={CHART_W - PAD.right}
          y1={y(0)}
          y2={y(0)}
        />
      </svg>

      {/* The same numbers as a table, for screen readers and anyone who wants the values. */}
      <table className="activity-chart__table">
        <caption>Checkout activity by day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Payments started</th>
            <th scope="col">Orders completed</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{shortDay(d.date)}</th>
              <td>{d.started}</td>
              <td>{d.completed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
