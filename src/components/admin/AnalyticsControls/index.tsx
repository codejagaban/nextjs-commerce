'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React from 'react'
import { useForm } from 'react-hook-form'

import type { AnalyticsComparison, AnalyticsRange } from '../Dashboard/analyticsRange'

import './index.scss'

type Props = {
  adminPath: string
  comparison: AnalyticsComparison
  endDate: string
  maxDate: string
  range: AnalyticsRange
  startDate: string
}

type CustomRangeFields = { from: string; to: string }

const calendarDays = (from: string, to: string) =>
  Math.floor((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000) + 1

const options: Array<{ label: string; value: AnalyticsRange }> = [
  { label: 'Today', value: 'today' },
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: 'Year to date', value: 'ytd' },
  { label: 'Custom', value: 'custom' },
]

const hrefFor = (
  adminPath: string,
  range: AnalyticsRange,
  comparison: AnalyticsComparison,
  from?: string,
  to?: string,
) => {
  const query = new URLSearchParams({ range, compare: comparison })
  if (range === 'custom' && from && to) {
    query.set('from', from)
    query.set('to', to)
  }
  return `${adminPath}?${query.toString()}`
}

export const AnalyticsControls: React.FC<Props> = ({
  adminPath,
  comparison,
  endDate,
  maxDate,
  range,
  startDate,
}) => {
  const router = useRouter()
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<CustomRangeFields>({ defaultValues: { from: startDate, to: endDate } })

  const applyCustom = handleSubmit(({ from, to }) => {
    router.push(hrefFor(adminPath, 'custom', comparison, from, to))
  })

  return (
    <div className="analytics-controls" aria-label="Analytics date controls">
      <nav className="analytics-controls__ranges" aria-label="Date range">
        {options.map((option) => (
          <Link
            aria-current={range === option.value ? 'page' : undefined}
            className="analytics-controls__range"
            href={hrefFor(adminPath, option.value, comparison, startDate, endDate)}
            key={option.value}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      <div className="analytics-controls__comparison" aria-label="Comparison period">
        <span>Compare</span>
        <Link
          aria-current={comparison === 'previous' ? 'true' : undefined}
          href={hrefFor(adminPath, range, 'previous', startDate, endDate)}
        >
          Previous period
        </Link>
        <Link
          aria-current={comparison === 'year' ? 'true' : undefined}
          href={hrefFor(adminPath, range, 'year', startDate, endDate)}
        >
          Previous year
        </Link>
      </div>

      {range === 'custom' && (
        <form className="analytics-controls__custom" noValidate onSubmit={applyCustom}>
          <label>
            From
            <input
              type="date"
              {...register('from', {
                required: 'Choose a start date.',
                validate: (value, values) =>
                  !values.to || value <= values.to || 'Start must be before end.',
              })}
            />
          </label>
          <label>
            To
            <input
              max={maxDate}
              type="date"
              {...register('to', {
                required: 'Choose an end date.',
                validate: (value, values) => {
                  if (values.from && value < values.from) return 'End must be after start.'
                  if (value > maxDate) return 'End cannot be in the future.'
                  if (values.from && calendarDays(values.from, value) > 366) {
                    return 'Choose a range of one year or less.'
                  }
                  return true
                },
              })}
            />
          </label>
          <button type="submit">Apply</button>
          {(errors.from?.message || errors.to?.message) && (
            <p role="alert">{errors.from?.message || errors.to?.message}</p>
          )}
        </form>
      )}
    </div>
  )
}
