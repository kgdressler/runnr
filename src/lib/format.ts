import type { Unit, Workout } from '../data/types'
import { RACE_LENGTHS } from '../data/types'
import { type ISODate, dayOfWeek } from './civil'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Monday-first, matching the plan's printed column order. */
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_NAMES_LONG = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
]

/** Trim trailing zeros so 3 reads as "3" and 3.1 as "3.1". */
export function formatNumber(n: number): string {
  return String(Math.round(n * 10) / 10)
}

export function distanceOf(workout: Workout, unit: Unit): number | null {
  if (workout.kind !== 'run' && workout.kind !== 'pace') return null
  return unit === 'mi' ? workout.mi : workout.km
}

/** Full label, as printed on the plan. */
export function formatWorkout(workout: Workout, unit: Unit): string {
  switch (workout.kind) {
    case 'rest':
      return 'Rest'
    case 'run':
      return `${formatNumber(distanceOf(workout, unit)!)} ${unit} run`
    case 'pace':
      return `${formatNumber(distanceOf(workout, unit)!)} ${unit} pace`
    case 'cross':
      return workout.minutes ? `${workout.minutes} min cross` : 'Cross'
    case 'race':
      return RACE_LENGTHS[workout.race].label
  }
}

/** Compact label for the season grid, where space is tight. */
export function shortWorkout(workout: Workout, unit: Unit): string {
  switch (workout.kind) {
    case 'rest':
      return '—'
    case 'run':
    case 'pace':
      return formatNumber(distanceOf(workout, unit)!)
    case 'cross':
      return 'XT'
    case 'race':
      return workout.race === 'half' ? 'HM' : workout.race === 'full' ? 'M' : workout.race
  }
}

export function dayName(date: ISODate): string {
  return DAY_NAMES[dayOfWeek(date)]
}

/** "Mon, Aug 10" */
export function formatDate(date: ISODate): string {
  const [, m, d] = date.split('-')
  return `${dayName(date)}, ${MONTHS[Number(m) - 1]} ${Number(d)}`
}

/** "Monday, August 10, 2026" */
export function formatLongDate(date: ISODate): string {
  const [y, m, d] = date.split('-')
  return `${DAY_NAMES_LONG[dayOfWeek(date)]}, ${MONTHS_LONG[Number(m) - 1]} ${Number(d)}, ${y}`
}

/** "Aug 10" */
export function formatShortDate(date: ISODate): string {
  const [, m, d] = date.split('-')
  return `${MONTHS[Number(m) - 1]} ${Number(d)}`
}

/** Human phrasing for a countdown, used on the Today screen. */
export function formatCountdown(days: number): string {
  if (days === 0) return 'Race day'
  if (days === 1) return 'Tomorrow'
  if (days < 0) return `${Math.abs(days)} days ago`
  if (days < 14) return `${days} days away`
  const weeks = Math.floor(days / 7)
  const rest = days % 7
  if (rest === 0) return `${weeks} weeks away`
  return `${weeks} weeks, ${rest} day${rest === 1 ? '' : 's'} away`
}
