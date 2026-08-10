import { describe, it, expect } from 'vitest'
import { addDays, diffDays, dayOfWeek } from './civil'
import {
  fitPlan,
  createActivePlan,
  resolveSchedule,
  weekDays,
  currentWeek,
  dayFor,
  swapDays,
  resetWeek,
  setCompleted,
  setRaceSubstitution,
  planProgress,
  SwapError,
  type ActivePlan,
} from './schedule'
import type { PlanId } from '../data/types'

const TODAY = '2026-08-10'
/** Exactly 84 days from TODAY inclusive, so the half plan fits with nothing to spare. */
const HALF_EXACT_RACE = '2026-11-01'

function build(planId: PlanId, raceDate: string, today = TODAY): ActivePlan {
  return createActivePlan({ id: 'test', planId, raceDate, today })
}

describe('fitPlan', () => {
  it('needs no truncation when there is exactly enough time', () => {
    const fit = fitPlan('half-novice-2', HALF_EXACT_RACE, TODAY)
    expect(fit.ok).toBe(true)
    expect(fit.available).toBe(84)
    expect(fit.required).toBe(84)
    expect(fit.skipWeeks).toBe(0)
    expect(fit.startDate).toBe(TODAY)
  })

  it('drops whole weeks when the race is closer than the plan is long', () => {
    // Four weeks earlier than an exact fit.
    const fit = fitPlan('half-novice-2', addDays(HALF_EXACT_RACE, -28), TODAY)
    expect(fit.ok).toBe(true)
    expect(fit.skipWeeks).toBe(4)
    expect(fit.startDate).toBe(TODAY)
  })

  it('rounds a partial week of shortfall up to a whole week', () => {
    // One day short of an exact fit still costs a full week.
    const fit = fitPlan('half-novice-2', addDays(HALF_EXACT_RACE, -1), TODAY)
    expect(fit.skipWeeks).toBe(1)
    expect(diffDays(fit.startDate, TODAY)).toBe(6)
  })

  it('rejects a race date in the past', () => {
    const fit = fitPlan('half-novice-2', addDays(TODAY, -1), TODAY)
    expect(fit.ok).toBe(false)
    expect(fit.reason).toBe('past')
  })

  it('rejects a race too close to train for at all', () => {
    const fit = fitPlan('marathon-novice-1', addDays(TODAY, 3), TODAY)
    expect(fit.ok).toBe(false)
    expect(fit.reason).toBe('too-short')
  })

  it('accepts a race further out than the plan needs, without padding', () => {
    const fit = fitPlan('half-novice-2', addDays(HALF_EXACT_RACE, 60), TODAY)
    expect(fit.skipWeeks).toBe(0)
    expect(diffDays(fit.startDate, TODAY)).toBe(60)
  })
})

describe('anchoring to race day', () => {
  it.each([
    ['half-novice-2', 84],
    ['marathon-novice-1', 126],
  ] as const)('%s spans %i days ending on race day', (planId, expectedDays) => {
    const race = addDays(TODAY, 400)
    const days = resolveSchedule(build(planId, race), TODAY)
    expect(days).toHaveLength(expectedDays)
    expect(days[days.length - 1].date).toBe(race)
    expect(days[days.length - 1].isGoalRace).toBe(true)
    expect(days[0].date).toBe(addDays(race, -(expectedDays - 1)))
  })

  it('lands the race on race day whatever weekday it falls on', () => {
    for (let offset = 0; offset < 7; offset++) {
      const race = addDays('2026-11-01', 200 + offset)
      const days = resolveSchedule(build('half-novice-2', race), TODAY)
      const last = days[days.length - 1]
      expect(last.date).toBe(race)
      expect(last.isGoalRace).toBe(true)
      expect(dayOfWeek(last.date)).toBe(dayOfWeek(race))
    }
  })

  it('preserves each workout distance from race day regardless of weekday', () => {
    // The long run before race week should sit the same number of days out
    // whether the race is a Sunday or a Wednesday.
    const spacing = (race: string) => {
      const days = resolveSchedule(build('half-novice-2', race), TODAY)
      const peak = days.find((d) => d.workout.kind === 'run' && d.workout.mi === 12)!
      return diffDays(race, peak.date)
    }
    expect(spacing('2027-05-02')).toBe(spacing('2027-05-05'))
  })

  it('produces consecutive dates with no gaps', () => {
    const days = resolveSchedule(build('marathon-novice-1', addDays(TODAY, 400)), TODAY)
    for (let i = 1; i < days.length; i++) {
      expect(diffDays(days[i].date, days[i - 1].date)).toBe(1)
    }
  })
})

describe('truncated plans', () => {
  const race = addDays(HALF_EXACT_RACE, -28)
  const active = build('half-novice-2', race)

  it('starts at the plan week that survives truncation', () => {
    const days = resolveSchedule(active, TODAY)
    expect(active.skipWeeks).toBe(4)
    expect(days).toHaveLength(56)
    expect(days[0].planWeek).toBe(4)
    // Week numbers keep their printed value, so the user knows what was skipped.
    expect(days[0].weekNumber).toBe(5)
  })

  it('still ends on the goal race', () => {
    const days = resolveSchedule(active, TODAY)
    expect(days[days.length - 1].date).toBe(race)
    expect(days[days.length - 1].isGoalRace).toBe(true)
  })

  it('keeps the taper intact by dropping from the front only', () => {
    const full = resolveSchedule(build('half-novice-2', HALF_EXACT_RACE), TODAY)
    const cut = resolveSchedule(active, TODAY)
    const tail = (days: typeof full) => days.slice(-14).map((d) => JSON.stringify(d.workout))
    expect(tail(cut)).toEqual(tail(full))
  })
})

describe('day status', () => {
  // A plan already underway: race is 14 days out on a truncated half.
  const race = addDays(TODAY, 13)
  const planId: PlanId = 'half-novice-2'

  it('marks elapsed workouts as missed and elapsed rest days as past', () => {
    const active = build(planId, race)
    const days = resolveSchedule(active, addDays(TODAY, 7))
    const elapsed = days.filter((d) => d.date < addDays(TODAY, 7))
    expect(elapsed.length).toBeGreaterThan(0)
    for (const day of elapsed) {
      expect(day.status).toBe(day.workout.kind === 'rest' ? 'past' : 'missed')
    }
  })

  it('never reports a rest day as missed', () => {
    const days = resolveSchedule(build(planId, race), addDays(TODAY, 13))
    const restDays = days.filter((d) => d.workout.kind === 'rest')
    expect(restDays.length).toBeGreaterThan(0)
    expect(restDays.every((d) => d.status !== 'missed')).toBe(true)
  })

  it('prefers done over missed once checked off', () => {
    const active = setCompleted(build(planId, race), TODAY, true)
    const days = resolveSchedule(active, addDays(TODAY, 5))
    expect(dayFor(days, TODAY)!.status).toBe('done')
  })

  it('allows retroactively checking off a missed day', () => {
    let active = build(planId, race)
    const later = addDays(TODAY, 10)
    // The plan opens on a rest day, so reach for the first actual workout.
    const missed = resolveSchedule(active, later).find((d) => d.status === 'missed')!
    expect(missed.workout.kind).not.toBe('rest')
    active = setCompleted(active, missed.date, true)
    expect(dayFor(resolveSchedule(active, later), missed.date)!.status).toBe('done')
  })

  it('labels today and the future distinctly', () => {
    const days = resolveSchedule(build(planId, race), TODAY)
    expect(dayFor(days, TODAY)!.status).toBe('today')
    expect(dayFor(days, addDays(TODAY, 1))!.status).toBe('upcoming')
  })
})

describe('swapping days within a week', () => {
  const race = addDays(TODAY, 400)
  const planId: PlanId = 'half-novice-2'

  it('exchanges two workouts', () => {
    const active = build(planId, race)
    const before = weekDays(resolveSchedule(active, TODAY), 0)
    // Slot 0 is a rest day, slot 1 a 3 mi run — the classic "move a run" case.
    const after = weekDays(resolveSchedule(swapDays(active, 0, 0, 1, TODAY), TODAY), 0)
    expect(after[0].workout).toEqual(before[1].workout)
    expect(after[1].workout).toEqual(before[0].workout)
  })

  it('leaves dates and other weeks untouched', () => {
    const active = build(planId, race)
    const swapped = swapDays(active, 2, 1, 5, TODAY)
    const before = resolveSchedule(active, TODAY)
    const after = resolveSchedule(swapped, TODAY)
    expect(after.map((d) => d.date)).toEqual(before.map((d) => d.date))
    const untouched = (days: typeof before) =>
      days.filter((d) => d.planWeek !== 2).map((d) => JSON.stringify(d.workout))
    expect(untouched(after)).toEqual(untouched(before))
  })

  it('preserves the week total, which is the point of permuting', () => {
    const active = build(planId, race)
    const total = (a: ActivePlan) =>
      weekDays(resolveSchedule(a, TODAY), 3)
        .map((d) => (d.workout.kind === 'run' || d.workout.kind === 'pace' ? d.workout.mi : 0))
        .reduce((s, n) => s + n, 0)
    expect(total(swapDays(active, 3, 1, 4, TODAY))).toBe(total(active))
  })

  it('is reversible, and drops the override when back to printed order', () => {
    const active = build(planId, race)
    const there = swapDays(active, 1, 2, 6, TODAY)
    expect(there.swaps[1]).toBeDefined()
    const back = swapDays(there, 1, 2, 6, TODAY)
    expect(back.swaps[1]).toBeUndefined()
    expect(resolveSchedule(back, TODAY)).toEqual(resolveSchedule(active, TODAY))
  })

  it('composes multiple swaps in a week', () => {
    let active = build(planId, race)
    active = swapDays(active, 0, 0, 1, TODAY)
    active = swapDays(active, 0, 5, 6, TODAY)
    expect(active.swaps[0]).toEqual([1, 0, 2, 3, 4, 6, 5])
  })

  it('refuses to move a completed day', () => {
    const active = build(planId, race)
    const week0 = weekDays(resolveSchedule(active, TODAY), 0)
    const done = setCompleted(active, week0[1].date, true)
    expect(() => swapDays(done, 0, 0, 1, TODAY)).toThrow(SwapError)
  })

  it('refuses to move race day', () => {
    const active = build(planId, race)
    expect(() => swapDays(active, 11, 5, 6, TODAY)).toThrow(SwapError)
  })

  it('rejects out-of-range slots and is a no-op for a self swap', () => {
    const active = build(planId, race)
    expect(() => swapDays(active, 0, 0, 7, TODAY)).toThrow(SwapError)
    expect(swapDays(active, 0, 3, 3, TODAY)).toBe(active)
  })

  it('restores printed order on reset', () => {
    const active = build(planId, race)
    const messy = swapDays(swapDays(active, 4, 1, 2, TODAY), 4, 3, 5, TODAY)
    expect(resolveSchedule(resetWeek(messy, 4), TODAY)).toEqual(resolveSchedule(active, TODAY))
  })
})

describe('tune-up race substitution', () => {
  const race = addDays(TODAY, 400)

  it('turns a 5-K race into a run of that distance', () => {
    const active = build('half-novice-2', race)
    const before = weekDays(resolveSchedule(active, TODAY), 5)[5]
    expect(before.workout).toEqual({ kind: 'race', race: '5K' })

    const subbed = setRaceSubstitution(active, 5, 5, true)
    const after = weekDays(resolveSchedule(subbed, TODAY), 5)[5]
    expect(after.workout).toEqual({ kind: 'run', mi: 3.1, km: 5 })
    expect(after.substituted).toBe(true)
  })

  it('follows the workout when the week is reordered', () => {
    let active = build('half-novice-2', race)
    active = setRaceSubstitution(active, 5, 5, true)
    active = swapDays(active, 5, 1, 5, TODAY)
    const week = weekDays(resolveSchedule(active, TODAY), 5)
    expect(week[1].substituted).toBe(true)
    expect(week[1].workout).toEqual({ kind: 'run', mi: 3.1, km: 5 })
  })

  it('is reversible', () => {
    const active = build('half-novice-2', race)
    const round = setRaceSubstitution(setRaceSubstitution(active, 5, 5, true), 5, 5, false)
    expect(resolveSchedule(round, TODAY)).toEqual(resolveSchedule(active, TODAY))
  })

  it('will not substitute the goal race', () => {
    const active = setRaceSubstitution(build('half-novice-2', race), 11, 6, true)
    const last = resolveSchedule(active, TODAY).at(-1)!
    expect(last.workout).toEqual({ kind: 'race', race: 'half' })
    expect(last.substituted).toBe(false)
  })
})

describe('progress', () => {
  const race = addDays(TODAY, 400)

  it('counts workouts and distance, ignoring rest days', () => {
    const active = build('half-novice-2', race)
    const days = resolveSchedule(active, TODAY)
    const progress = planProgress(active, days, TODAY)
    // 12 weeks x 2 rest days, plus the extra rest in race week.
    expect(progress.totalWorkouts).toBe(84 - 25)
    expect(progress.completedWorkouts).toBe(0)
    expect(progress.daysToRace).toBe(400)
  })

  it('accumulates completed distance', () => {
    let active = build('half-novice-2', race)
    const days = resolveSchedule(active, TODAY)
    // Week 1 Tuesday, the plan's first run.
    const firstRun = days.find((d) => d.workout.kind === 'run')!
    active = setCompleted(active, firstRun.date, true)
    const progress = planProgress(active, resolveSchedule(active, TODAY), TODAY)
    expect(progress.completedWorkouts).toBe(1)
    expect(progress.completedDistance).toBe(3)
  })

  it('reports distance in the chosen unit', () => {
    const active = { ...build('half-novice-2', race), unit: 'km' as const }
    const mi = planProgress(build('half-novice-2', race), resolveSchedule(active, TODAY), TODAY)
    const km = planProgress(active, resolveSchedule(active, TODAY), TODAY)
    expect(km.totalDistance).toBeGreaterThan(mi.totalDistance * 1.5)
  })
})

describe('locating the current week', () => {
  it('finds the week containing today', () => {
    const active = build('half-novice-2', HALF_EXACT_RACE)
    const days = resolveSchedule(active, TODAY)
    expect(currentWeek(days, TODAY)).toBe(0)
    expect(currentWeek(days, addDays(TODAY, 7))).toBe(1)
    expect(currentWeek(days, HALF_EXACT_RACE)).toBe(11)
  })

  it('clamps to the plan when today falls outside it', () => {
    const active = build('half-novice-2', addDays(TODAY, 200))
    const days = resolveSchedule(active, TODAY)
    expect(currentWeek(days, TODAY)).toBe(0)
    expect(currentWeek(days, addDays(TODAY, 500))).toBe(11)
    expect(dayFor(days, TODAY)).toBeNull()
  })
})
