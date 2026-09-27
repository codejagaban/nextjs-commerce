'use client'

import { CalendarBlank, CaretDown } from '@phosphor-icons/react'
import { format, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState, useTransition } from 'react'
import { type DateRange } from 'react-day-picker'
import { useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { AnalyticsComparison, AnalyticsRange } from '../Dashboard/analyticsRange'
import { useAdminNavigationProgress } from '../AdminNavigationProgress'

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

const options: Array<{ label: string; value: Exclude<AnalyticsRange, 'custom'> }> = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Year to date', value: 'ytd' },
]

const comparisonOptions: Array<{ label: string; value: AnalyticsComparison }> = [
  { label: 'Previous period', value: 'previous' },
  { label: 'Previous year', value: 'year' },
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

const humanDate = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const rangeLabel = (range: AnalyticsRange, from: string, to: string) => {
  if (range !== 'custom')
    return options.find((option) => option.value === range)?.label ?? 'Date range'
  return `${humanDate.format(parseISO(from))} - ${humanDate.format(parseISO(to))}`
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
  const { start: startNavigation } = useAdminNavigationProgress()
  const [isPending, startTransition] = useTransition()
  const [rangeOpen, setRangeOpen] = useState(false)
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<CustomRangeFields>({ defaultValues: { from: startDate, to: endDate } })
  const [from, to] = useWatch({ control, name: ['from', 'to'] })

  useEffect(() => {
    reset({ from: startDate, to: endDate })
  }, [endDate, reset, startDate])

  const navigate = (href: string) => {
    startNavigation()
    startTransition(() => router.push(href))
  }

  const applyCustom = handleSubmit(({ from: customFrom, to: customTo }) => {
    setRangeOpen(false)
    navigate(hrefFor(adminPath, 'custom', comparison, customFrom, customTo))
  })

  const choosePreset = (nextRange: Exclude<AnalyticsRange, 'custom'>) => {
    setRangeOpen(false)
    navigate(hrefFor(adminPath, nextRange, comparison))
  }

  const selectCustomRange = (selected: DateRange | undefined) => {
    if (!selected?.from) return
    const nextFrom = format(selected.from, 'yyyy-MM-dd')
    const nextTo = selected.to ? format(selected.to, 'yyyy-MM-dd') : ''
    setValue('from', nextFrom, { shouldDirty: true, shouldValidate: true })
    setValue('to', nextTo, { shouldDirty: true, shouldValidate: true })
  }

  return (
    <div
      className="analytics-controls"
      aria-busy={isPending}
      aria-label="Analytics date controls"
      data-pending={isPending ? 'true' : undefined}
    >
      <Popover onOpenChange={setRangeOpen} open={rangeOpen}>
        <PopoverTrigger asChild>
          <Button
            aria-label="Choose analytics date range"
            className="analytics-controls__trigger"
            disabled={isPending}
            size="sm"
            type="button"
            variant="outline"
          >
            <CalendarBlank aria-hidden="true" />
            <span>{rangeLabel(range, startDate, endDate)}</span>
            <CaretDown aria-hidden="true" className="analytics-controls__caret" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="analytics-controls__popover" collisionPadding={12}>
          <div className="analytics-controls__presets" aria-label="Preset date ranges">
            <p>Quick ranges</p>
            {options.map((option) => (
              <Button
                aria-current={range === option.value ? 'true' : undefined}
                className="analytics-controls__preset"
                disabled={isPending}
                key={option.value}
                onClick={() => choosePreset(option.value)}
                size="clear"
                type="button"
                variant="ghost"
              >
                {option.label}
              </Button>
            ))}
          </div>

          <form className="analytics-controls__custom" noValidate onSubmit={applyCustom}>
            <div className="analytics-controls__custom-head">
              <div>
                <strong>Custom range</strong>
                <span>
                  {from && to ? rangeLabel('custom', from, to) : 'Choose a start and end date'}
                </span>
              </div>
              <Button disabled={isPending || !from || !to} size="sm" type="submit">
                Apply
              </Button>
            </div>

            <input
              type="hidden"
              {...register('from', {
                required: 'Choose a start date.',
                validate: (value, values) =>
                  !values.to || value <= values.to || 'Start must be before end.',
              })}
            />
            <input
              type="hidden"
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

            <Calendar
              defaultMonth={parseISO(to || maxDate)}
              disabled={{ after: parseISO(maxDate) }}
              max={366}
              mode="range"
              onSelect={selectCustomRange}
              resetOnSelect
              selected={
                from ? { from: parseISO(from), to: to ? parseISO(to) : undefined } : undefined
              }
            />

            {(errors.from?.message || errors.to?.message) && (
              <p className="analytics-controls__error" role="alert">
                {errors.from?.message || errors.to?.message}
              </p>
            )}
          </form>
        </PopoverContent>
      </Popover>

      <Select
        disabled={isPending}
        onValueChange={(value: AnalyticsComparison) =>
          navigate(hrefFor(adminPath, range, value, startDate, endDate))
        }
        value={comparison}
      >
        <SelectTrigger
          aria-label="Comparison period"
          className="analytics-controls__comparison-trigger"
        >
          <span className="analytics-controls__comparison-label">Compare:</span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" className="analytics-controls__select-content">
          {comparisonOptions.map((option) => (
            <SelectItem
              className="analytics-controls__select-item"
              key={option.value}
              value={option.value}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
