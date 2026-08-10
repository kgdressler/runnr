import { describe, it, expect } from 'vitest'
import {
  toEpochDay,
  fromEpochDay,
  addDays,
  diffDays,
  dayOfWeek,
  isValidDate,
} from './civil'

describe('epoch day conversion', () => {
  it('anchors on the epoch itself', () => {
    expect(toEpochDay('1970-01-01')).toBe(0)
    expect(fromEpochDay(0)).toBe('1970-01-01')
  })

  it('handles dates before the epoch', () => {
    expect(toEpochDay('1969-12-31')).toBe(-1)
    expect(fromEpochDay(-1)).toBe('1969-12-31')
    expect(fromEpochDay(-719468)).toBe('0000-03-01')
  })

  it('round-trips every day across a 40-year span', () => {
    const start = toEpochDay('2000-01-01')
    const end = toEpochDay('2040-01-01')
    for (let d = start; d <= end; d++) {
      expect(toEpochDay(fromEpochDay(d))).toBe(d)
    }
  })
})

describe('leap years', () => {
  it('accepts Feb 29 in a leap year', () => {
    expect(isValidDate('2024-02-29')).toBe(true)
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01')
  })

  it('rejects Feb 29 in a common year', () => {
    expect(isValidDate('2026-02-29')).toBe(false)
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('treats century years by the 400 rule', () => {
    // 1900 is not a leap year; 2000 is.
    expect(isValidDate('1900-02-29')).toBe(false)
    expect(isValidDate('2000-02-29')).toBe(true)
  })
})

describe('invalid input', () => {
  it('rejects malformed strings', () => {
    for (const bad of ['', '2026-8-10', '2026/08/10', 'tomorrow', '2026-13-01', '2026-00-10']) {
      expect(isValidDate(bad)).toBe(false)
    }
  })

  it('rejects days past the end of a month', () => {
    expect(isValidDate('2026-04-31')).toBe(false)
    expect(isValidDate('2026-06-31')).toBe(false)
    expect(isValidDate('2026-02-30')).toBe(false)
  })
})

describe('addDays and diffDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('is unaffected by daylight saving transitions', () => {
    // US DST begins 2026-03-08 and ends 2026-11-01. A naive
    // hours-based implementation drifts across these.
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09')
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02')
    expect(diffDays('2026-03-09', '2026-03-07')).toBe(2)
    expect(diffDays('2026-11-02', '2026-10-31')).toBe(2)
  })

  it('spans a full marathon plan', () => {
    // 18 weeks inclusive of race day.
    expect(diffDays('2026-10-11', addDays('2026-10-11', -125))).toBe(125)
    expect(addDays('2026-10-11', -125)).toBe('2026-06-08')
  })

  it('reports negative differences when a is earlier', () => {
    expect(diffDays('2026-08-01', '2026-08-10')).toBe(-9)
  })
})

describe('dayOfWeek', () => {
  it('uses Monday as index 0', () => {
    expect(dayOfWeek('1970-01-01')).toBe(3) // a Thursday
    expect(dayOfWeek('2000-01-01')).toBe(5) // a Saturday
    expect(dayOfWeek('2024-02-29')).toBe(3) // a Thursday
  })

  it('advances by one per day and wraps', () => {
    let prev = dayOfWeek('2026-08-10')
    for (let i = 1; i <= 14; i++) {
      const next = dayOfWeek(addDays('2026-08-10', i))
      expect(next).toBe((prev + 1) % 7)
      prev = next
    }
  })

  it('reports the same index seven days apart', () => {
    expect(dayOfWeek('2026-08-10')).toBe(dayOfWeek('2026-08-17'))
  })
})
