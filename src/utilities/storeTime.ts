export const DEFAULT_STORE_TIME_ZONE = 'Europe/London'

export const STORE_TIME_ZONES = [
  'UTC',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Warsaw',
  'Europe/Athens',
  'Europe/Istanbul',
  'Europe/Moscow',
  'Africa/Lagos',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Nairobi',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Perth',
  'Australia/Adelaide',
  'Australia/Sydney',
  'Pacific/Auckland',
  'Pacific/Honolulu',
  'America/St_Johns',
  'America/Halifax',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Sao_Paulo',
] as const

export type CalendarDate = {
  day: number
  month: number
  year: number
}

type CalendarDateTime = CalendarDate & {
  hour: number
  minute: number
  second: number
}

const formatterCache = new Map<string, Intl.DateTimeFormat>()

const formatterFor = (timeZone: string) => {
  const existing = formatterCache.get(timeZone)
  if (existing) return existing

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  formatterCache.set(timeZone, formatter)
  return formatter
}

const partNumber = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) =>
  Number(parts.find((part) => part.type === type)?.value)

export const dateTimeInZone = (date: Date, timeZone: string): CalendarDateTime => {
  const parts = formatterFor(timeZone).formatToParts(date)
  return {
    year: partNumber(parts, 'year'),
    month: partNumber(parts, 'month'),
    day: partNumber(parts, 'day'),
    hour: partNumber(parts, 'hour'),
    minute: partNumber(parts, 'minute'),
    second: partNumber(parts, 'second'),
  }
}

export const addCalendarDays = (date: CalendarDate, days: number): CalendarDate => {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days, 12))
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

/** Convert midnight on a store-local calendar date to its exact UTC instant. */
export const zonedMidnight = (date: CalendarDate, timeZone: string): Date => {
  const target = Date.UTC(date.year, date.month - 1, date.day)
  let guess = target

  // The offset can change around the guessed instant, so converge using the
  // zone's rendered wall-clock value instead of assuming a fixed offset.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const rendered = dateTimeInZone(new Date(guess), timeZone)
    const renderedAsUTC = Date.UTC(
      rendered.year,
      rendered.month - 1,
      rendered.day,
      rendered.hour,
      rendered.minute,
      rendered.second,
    )
    const correction = target - renderedAsUTC
    guess += correction
    if (correction === 0) break
  }

  return new Date(guess)
}

export const zonedDateKey = (date: Date, timeZone: string): string => {
  const local = dateTimeInZone(date, timeZone)
  return `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`
}

export const reportingWindow = ({
  days,
  now,
  timeZone,
}: {
  days: number
  now: Date
  timeZone: string
}) => {
  const localNow = dateTimeInZone(now, timeZone)
  const today = { year: localNow.year, month: localNow.month, day: localNow.day }
  const startDate = addCalendarDays(today, -(days - 1))
  const priorStartDate = addCalendarDays(startDate, -days)

  return {
    end: zonedMidnight(addCalendarDays(today, 1), timeZone),
    priorStart: zonedMidnight(priorStartDate, timeZone),
    start: zonedMidnight(startDate, timeZone),
    today: zonedMidnight(today, timeZone),
  }
}

export const dayKeysFrom = (start: Date, count: number, timeZone: string): string[] => {
  const localStart = dateTimeInZone(start, timeZone)
  const startDate = { year: localStart.year, month: localStart.month, day: localStart.day }
  return Array.from({ length: count }, (_, index) => {
    const date = addCalendarDays(startDate, index)
    return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
  })
}
