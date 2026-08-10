import type { PlanId, Plan, Unit, Workout } from '../data/types'
import { RACE_LENGTHS } from '../data/types'
import { getPlan } from '../data/plans'
import { type ISODate, addDays, diffDays } from './civil'

/**
 * A plan the user is currently training on. This is the whole persisted
 * document — everything on screen is derived from it by `resolveSchedule`.
 */
export interface ActivePlan {
  id: string
  planId: PlanId
  /** The goal race. The plan's final day always lands here. */
  raceDate: ISODate
  /** Optional label, e.g. "Chicago Marathon". */
  raceName?: string
  /** Leading plan weeks dropped because the race was closer than the plan is long. */
  skipWeeks: number
  unit: Unit
  /** Dates marked done, keyed by date because what is recorded is "I trained today". */
  completed: Record<ISODate, true>
  /**
   * Per-week reorderings, keyed by absolute plan week index. The value is a
   * permutation of [0..6]: `perm[slot]` is which of the plan's days shows in
   * that slot. Storing a permutation rather than edited workouts means weekly
   * mileage is preserved by construction and the original plan is never lost.
   */
  swaps: Record<number, number[]>
  /** Tune-up races swapped for a plain run, keyed `${planWeek}:${planDay}`. */
  raceSubs: Record<string, true>
  createdAt: ISODate
}

export type DayStatus =
  | 'done' // checked off
  | 'missed' // a workout in the past that was never checked off
  | 'today'
  | 'upcoming'
  | 'past' // an elapsed rest day — nothing was owed

export interface ResolvedDay {
  date: ISODate
  /** Absolute index into the plan's schedule, so week 5 stays week 5 when weeks are skipped. */
  planWeek: number
  /** 1-based week number as printed on the plan. */
  weekNumber: number
  /** Position 0..6 within the displayed week. */
  slot: number
  workout: Workout
  /** True when this was a tune-up race the user chose to run instead. */
  substituted: boolean
  status: DayStatus
  canSwap: boolean
  /** The goal race itself, which is pinned to the race date. */
  isGoalRace: boolean
}

export const IDENTITY: readonly number[] = [0, 1, 2, 3, 4, 5, 6]

/** Number of plan weeks actually being trained, after any truncation. */
export function activeWeeks(plan: Plan, skipWeeks: number): number {
  return plan.weeks - skipWeeks
}

/** The first day of the plan, counted straight back from race day. */
export function startDate(plan: Plan, raceDate: ISODate, skipWeeks: number): ISODate {
  return addDays(raceDate, -(activeWeeks(plan, skipWeeks) * 7 - 1))
}

export interface PlanFit {
  ok: boolean
  /** Whole plan weeks that must be dropped to fit before race day. */
  skipWeeks: number
  startDate: ISODate
  /** Days available from today through race day, inclusive. */
  available: number
  /** Days the untruncated plan needs. */
  required: number
  reason?: 'past' | 'too-short'
}

/**
 * Work out whether a plan fits between today and race day, and how much of the
 * front end has to be dropped if not. Truncation is in whole weeks so the
 * remaining schedule keeps its printed week structure.
 */
export function fitPlan(planId: PlanId, raceDate: ISODate, today: ISODate): PlanFit {
  const plan = getPlan(planId)
  const required = plan.weeks * 7
  const available = diffDays(raceDate, today) + 1

  if (available <= 0) {
    return {
      ok: false,
      skipWeeks: 0,
      startDate: startDate(plan, raceDate, 0),
      available,
      required,
      reason: 'past',
    }
  }

  const skipWeeks = available >= required ? 0 : Math.ceil((required - available) / 7)

  if (skipWeeks >= plan.weeks) {
    return {
      ok: false,
      skipWeeks,
      startDate: raceDate,
      available,
      required,
      reason: 'too-short',
    }
  }

  return {
    ok: true,
    skipWeeks,
    startDate: startDate(plan, raceDate, skipWeeks),
    available,
    required,
  }
}

/** Build a fresh ActivePlan. Throws when the race date cannot support the plan. */
export function createActivePlan(args: {
  id: string
  planId: PlanId
  raceDate: ISODate
  raceName?: string
  unit?: Unit
  today: ISODate
}): ActivePlan {
  const fit = fitPlan(args.planId, args.raceDate, args.today)
  if (!fit.ok) {
    throw new RangeError(
      fit.reason === 'past'
        ? `Race date ${args.raceDate} is not in the future`
        : `Race date ${args.raceDate} leaves too little time for this plan`,
    )
  }
  return {
    id: args.id,
    planId: args.planId,
    raceDate: args.raceDate,
    raceName: args.raceName,
    skipWeeks: fit.skipWeeks,
    unit: args.unit ?? 'mi',
    completed: {},
    swaps: {},
    raceSubs: {},
    createdAt: args.today,
  }
}

function subKey(planWeek: number, planDay: number): string {
  return `${planWeek}:${planDay}`
}

/** A tune-up race the user opted out of becomes a plain run of that distance. */
function substituteRace(workout: Workout): Workout {
  if (workout.kind !== 'race') return workout
  const { mi, km } = RACE_LENGTHS[workout.race]
  return { kind: 'run', mi, km }
}

/**
 * Expand an ActivePlan into the full day-by-day calendar. Every view in the app
 * is a slice of this array, so all the date and reordering logic lives here.
 */
export function resolveSchedule(active: ActivePlan, today: ISODate): ResolvedDay[] {
  const plan = getPlan(active.planId)
  const weeks = activeWeeks(plan, active.skipWeeks)
  const start = startDate(plan, active.raceDate, active.skipWeeks)
  const days: ResolvedDay[] = []

  for (let w = 0; w < weeks; w++) {
    const planWeek = w + active.skipWeeks
    const perm = active.swaps[planWeek] ?? IDENTITY

    for (let slot = 0; slot < 7; slot++) {
      const planDay = perm[slot]
      const original = plan.schedule[planWeek][planDay]
      const substituted =
        original.kind === 'race' &&
        original.race !== plan.goal &&
        active.raceSubs[subKey(planWeek, planDay)] === true

      const workout = substituted ? substituteRace(original) : original
      const date = addDays(start, w * 7 + slot)
      const isGoalRace = original.kind === 'race' && original.race === plan.goal
      const done = active.completed[date] === true

      let status: DayStatus
      if (done) status = 'done'
      else if (date === today) status = 'today'
      else if (date > today) status = 'upcoming'
      else if (workout.kind === 'rest') status = 'past'
      else status = 'missed'

      days.push({
        date,
        planWeek,
        weekNumber: planWeek + 1,
        slot,
        workout,
        substituted,
        status,
        canSwap: !isGoalRace && !done,
        isGoalRace,
      })
    }
  }

  return days
}

/** The seven days making up one displayed week. */
export function weekDays(days: ResolvedDay[], planWeek: number): ResolvedDay[] {
  return days.filter((d) => d.planWeek === planWeek)
}

/** The plan week containing `today`, or the nearest one if today falls outside the plan. */
export function currentWeek(days: ResolvedDay[], today: ISODate): number {
  const match = days.find((d) => d.date === today)
  if (match) return match.planWeek
  if (days.length === 0) return 0
  return today < days[0].date ? days[0].planWeek : days[days.length - 1].planWeek
}

/** Today's entry, or null when today falls outside the plan window. */
export function dayFor(days: ResolvedDay[], date: ISODate): ResolvedDay | null {
  return days.find((d) => d.date === date) ?? null
}

export class SwapError extends Error {}

/**
 * Exchange two days within one week. Because this permutes rather than edits,
 * the week's total mileage cannot change and the swap is always reversible.
 */
export function swapDays(
  active: ActivePlan,
  planWeek: number,
  slotA: number,
  slotB: number,
  today: ISODate,
): ActivePlan {
  if (slotA === slotB) return active

  for (const slot of [slotA, slotB]) {
    if (!Number.isInteger(slot) || slot < 0 || slot > 6) {
      throw new SwapError(`Slot out of range: ${slot}`)
    }
  }

  const days = resolveSchedule(active, today)
  const week = weekDays(days, planWeek)
  if (week.length !== 7) throw new SwapError(`No such week: ${planWeek}`)

  for (const slot of [slotA, slotB]) {
    const day = week[slot]
    if (day.isGoalRace) throw new SwapError('Race day is fixed to the race date')
    if (day.status === 'done') throw new SwapError('Uncheck the day before moving it')
  }

  const perm = [...(active.swaps[planWeek] ?? IDENTITY)]
  ;[perm[slotA], perm[slotB]] = [perm[slotB], perm[slotA]]

  const swaps = { ...active.swaps }
  const isIdentity = perm.every((v, i) => v === i)
  if (isIdentity) delete swaps[planWeek]
  else swaps[planWeek] = perm

  return { ...active, swaps }
}

/** Restore a week to the plan's printed order. */
export function resetWeek(active: ActivePlan, planWeek: number): ActivePlan {
  const swaps = { ...active.swaps }
  delete swaps[planWeek]
  return { ...active, swaps }
}

export function setCompleted(active: ActivePlan, date: ISODate, done: boolean): ActivePlan {
  const completed = { ...active.completed }
  if (done) completed[date] = true
  else delete completed[date]
  return { ...active, completed }
}

/** Toggle a tune-up race between racing it and running the distance. */
export function setRaceSubstitution(
  active: ActivePlan,
  planWeek: number,
  planDay: number,
  substitute: boolean,
): ActivePlan {
  const raceSubs = { ...active.raceSubs }
  const key = subKey(planWeek, planDay)
  if (substitute) raceSubs[key] = true
  else delete raceSubs[key]
  return { ...active, raceSubs }
}

export interface PlanProgress {
  totalWorkouts: number
  completedWorkouts: number
  missedWorkouts: number
  /** Distance in the plan's chosen unit, counting runs and pace runs only. */
  totalDistance: number
  completedDistance: number
  daysToRace: number
}

export function planProgress(
  active: ActivePlan,
  days: ResolvedDay[],
  today: ISODate,
): PlanProgress {
  const unit = active.unit
  const amount = (w: Workout) =>
    w.kind === 'run' || w.kind === 'pace' ? (unit === 'mi' ? w.mi : w.km) : 0

  let totalWorkouts = 0
  let completedWorkouts = 0
  let missedWorkouts = 0
  let totalDistance = 0
  let completedDistance = 0

  for (const day of days) {
    if (day.workout.kind === 'rest') continue
    totalWorkouts++
    totalDistance += amount(day.workout)
    if (day.status === 'done') {
      completedWorkouts++
      completedDistance += amount(day.workout)
    } else if (day.status === 'missed') {
      missedWorkouts++
    }
  }

  return {
    totalWorkouts,
    completedWorkouts,
    missedWorkouts,
    totalDistance: Math.round(totalDistance * 10) / 10,
    completedDistance: Math.round(completedDistance * 10) / 10,
    daysToRace: diffDays(active.raceDate, today),
  }
}
