import {
  addCalendarDays,
  dateTimeInZone,
  type CalendarDate,
  zonedMidnight,
} from '@/utilities/storeTime'

export const ANALYTICS_RANGES = ['today', '7d', '30d', '90d', 'ytd', 'custom'] as const
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number]

export const ANALYTICS_COMPARISONS = ['previous', 'year'] as const
export type AnalyticsComparison = (typeof ANALYTICS_COMPARISONS)[number]

const MAX_CUSTOM_DAYS = 366

const dateKey = (date: CalendarDate) =>
  `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`

const parseDateKey = (value: string | undefined): CalendarDate | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) return undefined

  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
  const rendered = new Date(Date.UTC(date.year, date.month - 1, date.day, 12))
  if (
    rendered.getUTCFullYear() !== date.year ||
    rendered.getUTCMonth() + 1 !== date.month ||
    rendered.getUTCDate() !== date.day
  ) {
    return undefined
  }
  return date
}

const dayNumber = (date: CalendarDate) => Date.UTC(date.year, date.month - 1, date.day) / 86_400_000
const daysBetween = (start: CalendarDate, end: CalendarDate) => dayNumber(end) - dayNumber(start)

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate()

const previousYear = (date: CalendarDate): CalendarDate => ({
  year: date.year - 1,
  month: date.month,
  day: Math.min(date.day, daysInMonth(date.year - 1, date.month)),
})

const isRange = (value: string | undefined): value is AnalyticsRange =>
  ANALYTICS_RANGES.includes(value as AnalyticsRange)

const isComparison = (value: string | undefined): value is AnalyticsComparison =>
  ANALYTICS_COMPARISONS.includes(value as AnalyticsComparison)

export type AnalyticsWindow = {
  comparison: AnalyticsComparison
  comparisonLabel: string
  days: number
  end: Date
  endDate: string
  priorEnd: Date
  priorStart: Date
  range: AnalyticsRange
  rangeLabel: string
  start: Date
  startDate: string
  today: Date
  todayDate: string
}

export const analyticsWindow = ({
  comparison: comparisonInput,
  from,
  now,
  range: rangeInput,
  timeZone,
  to,
}: {
  comparison?: string
  from?: string
  now: Date
  range?: string
  timeZone: string
  to?: string
}): AnalyticsWindow => {
  const localNow = dateTimeInZone(now, timeZone)
  const today = { year: localNow.year, month: localNow.month, day: localNow.day }
  const comparison = isComparison(comparisonInput) ? comparisonInput : 'previous'
  let range: AnalyticsRange = isRange(rangeInput) ? rangeInput : '30d'
  let startDate: CalendarDate
  let endDate = today

  if (range === 'custom') {
    const requestedStart = parseDateKey(from)
    const requestedEnd = parseDateKey(to)
    const requestedDays =
      requestedStart && requestedEnd ? daysBetween(requestedStart, requestedEnd) + 1 : 0

    if (
      !requestedStart ||
      !requestedEnd ||
      requestedDays < 1 ||
      requestedDays > MAX_CUSTOM_DAYS ||
      daysBetween(today, requestedEnd) > 0
    ) {
      range = '30d'
      startDate = addCalendarDays(today, -29)
    } else {
      startDate = requestedStart
      endDate = requestedEnd
    }
  } else if (range === 'ytd') {
    startDate = { year: today.year, month: 1, day: 1 }
  } else {
    const days = range === 'today' ? 1 : Number.parseInt(range, 10)
    startDate = addCalendarDays(today, -(days - 1))
  }

  const days = daysBetween(startDate, endDate) + 1
  const start = zonedMidnight(startDate, timeZone)
  const end = zonedMidnight(addCalendarDays(endDate, 1), timeZone)

  const priorStartDate =
    comparison === 'year' ? previousYear(startDate) : addCalendarDays(startDate, -days)
  const priorEndDate = comparison === 'year' ? addCalendarDays(previousYear(endDate), 1) : startDate

  const labels: Record<Exclude<AnalyticsRange, 'custom'>, string> = {
    today: 'Today',
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    ytd: 'Year to date',
  }

  return {
    comparison,
    comparisonLabel: comparison === 'year' ? 'vs previous year' : 'vs previous period',
    days,
    end,
    endDate: dateKey(endDate),
    priorEnd: zonedMidnight(priorEndDate, timeZone),
    priorStart: zonedMidnight(priorStartDate, timeZone),
    range,
    rangeLabel: range === 'custom' ? `${dateKey(startDate)} to ${dateKey(endDate)}` : labels[range],
    start,
    startDate: dateKey(startDate),
    today: zonedMidnight(today, timeZone),
    todayDate: dateKey(today),
  }
}
