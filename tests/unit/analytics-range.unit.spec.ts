import { describe, expect, it } from 'vitest'

import { analyticsWindow } from '@/components/admin/Dashboard/analyticsRange'

describe('dashboard analytics ranges', () => {
  const now = new Date('2026-09-27T12:00:00.000Z')

  it('builds a store-local rolling range and previous-period comparison', () => {
    const window = analyticsWindow({ now, range: '7d', timeZone: 'Europe/London' })

    expect(window).toMatchObject({
      comparison: 'previous',
      days: 7,
      endDate: '2026-09-27',
      range: '7d',
      startDate: '2026-09-21',
    })
    expect(window.start.toISOString()).toBe('2026-09-20T23:00:00.000Z')
    expect(window.priorStart.toISOString()).toBe('2026-09-13T23:00:00.000Z')
    expect(window.priorEnd.toISOString()).toBe(window.start.toISOString())
  })

  it('compares a custom range with the same dates in the previous year', () => {
    const window = analyticsWindow({
      comparison: 'year',
      from: '2026-03-01',
      now,
      range: 'custom',
      timeZone: 'Europe/London',
      to: '2026-03-31',
    })

    expect(window.days).toBe(31)
    expect(window.priorStart.toISOString()).toBe('2025-03-01T00:00:00.000Z')
    expect(window.priorEnd.toISOString()).toBe('2025-03-31T23:00:00.000Z')
  })

  it('uses January 1 for year-to-date in the store timezone', () => {
    const window = analyticsWindow({ now, range: 'ytd', timeZone: 'Europe/London' })

    expect(window.startDate).toBe('2026-01-01')
    expect(window.endDate).toBe('2026-09-27')
    expect(window.days).toBe(270)
  })

  it('falls back safely when a custom range is invalid or too large', () => {
    const reversed = analyticsWindow({
      from: '2026-09-27',
      now,
      range: 'custom',
      timeZone: 'Europe/London',
      to: '2026-09-01',
    })
    const oversized = analyticsWindow({
      from: '2025-01-01',
      now,
      range: 'custom',
      timeZone: 'Europe/London',
      to: '2026-09-01',
    })

    expect(reversed).toMatchObject({ days: 30, range: '30d', startDate: '2026-08-29' })
    expect(oversized).toMatchObject({ days: 30, range: '30d', startDate: '2026-08-29' })
  })
})
