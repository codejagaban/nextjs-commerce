import { describe, expect, it } from 'vitest'

import {
  dayKeysFrom,
  reportingWindow,
  zonedDateKey,
  zonedMidnight,
} from '@/utilities/storeTime'

describe('store reporting time', () => {
  it('uses the store calendar across the spring daylight-saving change', () => {
    const window = reportingWindow({
      days: 2,
      now: new Date('2026-03-29T12:00:00.000Z'),
      timeZone: 'Europe/London',
    })

    expect(window.start.toISOString()).toBe('2026-03-28T00:00:00.000Z')
    expect(window.today.toISOString()).toBe('2026-03-29T00:00:00.000Z')
    expect(window.end.toISOString()).toBe('2026-03-29T23:00:00.000Z')
    expect(window.end.getTime() - window.start.getTime()).toBe(47 * 60 * 60 * 1000)
    expect(dayKeysFrom(window.start, 2, 'Europe/London')).toEqual([
      '2026-03-28',
      '2026-03-29',
    ])
  })

  it('uses a 25-hour local day across the autumn daylight-saving change', () => {
    const start = zonedMidnight({ year: 2026, month: 10, day: 25 }, 'Europe/London')
    const end = zonedMidnight({ year: 2026, month: 10, day: 26 }, 'Europe/London')

    expect(start.toISOString()).toBe('2026-10-24T23:00:00.000Z')
    expect(end.toISOString()).toBe('2026-10-26T00:00:00.000Z')
    expect(end.getTime() - start.getTime()).toBe(25 * 60 * 60 * 1000)
  })

  it('assigns an instant to the store local date', () => {
    expect(zonedDateKey(new Date('2026-03-29T23:30:00.000Z'), 'Europe/London')).toBe(
      '2026-03-30',
    )
    expect(zonedDateKey(new Date('2026-03-29T23:30:00.000Z'), 'America/New_York')).toBe(
      '2026-03-29',
    )
  })
})
