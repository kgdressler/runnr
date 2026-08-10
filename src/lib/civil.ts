/**
 * Date arithmetic on plain calendar dates, with no timezone involvement.
 *
 * Dates are 'YYYY-MM-DD' strings. All arithmetic goes through an integer
 * "epoch day" (days since 1970-01-01) using Howard Hinnant's civil calendar
 * algorithms. The only place a real `Date` is touched is `todayLocal()`, which
 * asks the host what today's local calendar date is and immediately drops back
 * to strings.
 *
 * This matters: doing plan math with `Date` objects means a race date entered
 * as '2026-10-11' can silently become Oct 10 for anyone west of UTC, which
 * would show the wrong workout on the wrong day.
 */

export type ISODate = string

/** Integer division that floors toward negative infinity, like C++'s on positives
 *  but correct for the negative eras Hinnant's algorithm relies on. */
function idiv(a: number, b: number): number {
  return Math.floor(a / b)
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Split 'YYYY-MM-DD' into parts, throwing on anything malformed. */
function parse(date: ISODate): { y: number; m: number; d: number } {
  const match = DATE_RE.exec(date)
  if (!match) throw new RangeError(`Not an ISO date: ${JSON.stringify(date)}`)
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  if (m < 1 || m > 12) throw new RangeError(`Month out of range: ${date}`)
  if (d < 1 || d > 31) throw new RangeError(`Day out of range: ${date}`)
  return { y, m, d }
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0')
}

function format(y: number, m: number, d: number): ISODate {
  return `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`
}

/** Days since 1970-01-01. Hinnant's days_from_civil. */
export function toEpochDay(date: ISODate): number {
  const { y, m, d } = parse(date)
  const days = civilToDays(y, m, d)
  // Round-trip guards against dates that parse but don't exist, like 2026-02-30.
  if (fromEpochDay(days) !== date) {
    throw new RangeError(`No such calendar date: ${date}`)
  }
  return days
}

function civilToDays(year: number, m: number, d: number): number {
  const y = year - (m <= 2 ? 1 : 0)
  const era = idiv(y >= 0 ? y : y - 399, 400)
  const yoe = y - era * 400
  const doy = idiv(153 * (m + (m > 2 ? -3 : 9)) + 2, 5) + d - 1
  const doe = yoe * 365 + idiv(yoe, 4) - idiv(yoe, 100) + doy
  return era * 146097 + doe - 719468
}

/** Inverse of `toEpochDay`. Hinnant's civil_from_days. */
export function fromEpochDay(epochDay: number): ISODate {
  const z = epochDay + 719468
  const era = idiv(z >= 0 ? z : z - 146096, 146097)
  const doe = z - era * 146097
  const yoe = idiv(doe - idiv(doe, 1460) + idiv(doe, 36524) - idiv(doe, 146096), 365)
  const doy = doe - (365 * yoe + idiv(yoe, 4) - idiv(yoe, 100))
  const mp = idiv(5 * doy + 2, 153)
  const d = doy - idiv(153 * mp + 2, 5) + 1
  const m = mp + (mp < 10 ? 3 : -9)
  const y = yoe + era * 400 + (m <= 2 ? 1 : 0)
  return format(y, m, d)
}

/** `date` shifted by `n` days. Negative `n` moves backward. */
export function addDays(date: ISODate, n: number): ISODate {
  return fromEpochDay(toEpochDay(date) + n)
}

/** Whole days from `b` to `a`. Positive when `a` is later. */
export function diffDays(a: ISODate, b: ISODate): number {
  return toEpochDay(a) - toEpochDay(b)
}

/** 0 = Monday through 6 = Sunday, matching the column order Higdon prints. */
export function dayOfWeek(date: ISODate): number {
  // Epoch day 0 (1970-01-01) was a Thursday, which is index 3 in a Monday-first
  // week. The +3 offset shifts the modulo into that frame.
  const dow = (toEpochDay(date) + 3) % 7
  return dow < 0 ? dow + 7 : dow
}

/** Today's date in the browser's local timezone. */
export function todayLocal(): ISODate {
  const now = new Date()
  return format(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

/** True when `date` is a real calendar date in 'YYYY-MM-DD' form. */
export function isValidDate(date: string): boolean {
  try {
    toEpochDay(date)
    return true
  } catch {
    return false
  }
}
