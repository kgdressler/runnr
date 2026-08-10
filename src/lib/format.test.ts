import { describe, it, expect } from 'vitest'
import {
  formatWorkout,
  shortWorkout,
  formatDate,
  formatLongDate,
  formatCountdown,
  formatNumber,
  dayName,
} from './format'
import { rest, run, pace, cross, race } from '../data/types'

describe('workout labels', () => {
  it('reads like the printed plan in miles', () => {
    expect(formatWorkout(rest(), 'mi')).toBe('Rest')
    expect(formatWorkout(run(3, 4.8), 'mi')).toBe('3 mi run')
    expect(formatWorkout(pace(4, 6.4), 'mi')).toBe('4 mi pace')
    expect(formatWorkout(cross(60), 'mi')).toBe('60 min cross')
    expect(formatWorkout(cross(), 'mi')).toBe('Cross')
    expect(formatWorkout(race('5K'), 'mi')).toBe('5-K Race')
    expect(formatWorkout(race('half'), 'mi')).toBe('Half Marathon')
  })

  it('uses the published kilometre figures rather than converting', () => {
    expect(formatWorkout(run(3, 4.8), 'km')).toBe('4.8 km run')
    expect(formatWorkout(pace(4, 6.4), 'km')).toBe('6.4 km pace')
  })

  it('drops trailing zeros', () => {
    expect(formatNumber(3)).toBe('3')
    expect(formatNumber(3.1)).toBe('3.1')
    expect(formatNumber(29.0)).toBe('29')
  })

  it('abbreviates for the season grid', () => {
    expect(shortWorkout(rest(), 'mi')).toBe('—')
    expect(shortWorkout(run(12, 19.3), 'mi')).toBe('12')
    expect(shortWorkout(run(12, 19.3), 'km')).toBe('19.3')
    expect(shortWorkout(cross(60), 'mi')).toBe('XT')
    expect(shortWorkout(race('5K'), 'mi')).toBe('5K')
    expect(shortWorkout(race('half'), 'mi')).toBe('HM')
    expect(shortWorkout(race('full'), 'mi')).toBe('M')
  })
})

describe('dates', () => {
  it('formats without shifting across timezones', () => {
    expect(formatDate('2026-08-10')).toBe('Mon, Aug 10')
    expect(formatLongDate('2026-08-10')).toBe('Monday, August 10, 2026')
    expect(formatDate('2026-01-01')).toBe('Thu, Jan 1')
    expect(formatLongDate('2026-12-31')).toBe('Thursday, December 31, 2026')
  })

  it('names weekdays Monday-first', () => {
    expect(dayName('2026-08-10')).toBe('Mon')
    expect(dayName('2026-08-15')).toBe('Sat')
    expect(dayName('2026-08-16')).toBe('Sun')
  })
})

describe('countdown phrasing', () => {
  it('handles the days around the race', () => {
    expect(formatCountdown(0)).toBe('Race day')
    expect(formatCountdown(1)).toBe('Tomorrow')
    expect(formatCountdown(-3)).toBe('3 days ago')
    expect(formatCountdown(5)).toBe('5 days away')
  })

  it('switches to weeks once far enough out', () => {
    expect(formatCountdown(14)).toBe('2 weeks away')
    expect(formatCountdown(15)).toBe('2 weeks, 1 day away')
    expect(formatCountdown(83)).toBe('11 weeks, 6 days away')
  })
})
