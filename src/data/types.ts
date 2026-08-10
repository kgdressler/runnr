/** Units the schedules are published in. Higdon prints both, with his own
 *  rounding, so we store both rather than converting at runtime. */
export type Unit = 'mi' | 'km'

export type RaceDistance = '5K' | '10K' | 'half' | 'full'

export type Workout =
  | { kind: 'rest' }
  | { kind: 'run'; mi: number; km: number }
  | { kind: 'pace'; mi: number; km: number }
  | { kind: 'cross'; minutes?: number }
  | { kind: 'race'; race: RaceDistance }

export type PlanId = 'half-novice-2' | 'marathon-novice-1'

export interface Plan {
  id: PlanId
  /** Shown in the plan picker. */
  name: string
  /** The race this plan builds toward. */
  goal: RaceDistance
  weeks: number
  /** [week][dayIndex], where dayIndex 0..6 is Mon..Sun as printed. */
  schedule: Workout[][]
  /** Where the schedule came from, for the about screen. */
  source: string
}

// Constructors, so the tables below read like the printout.
export const rest = (): Workout => ({ kind: 'rest' })
export const run = (mi: number, km: number): Workout => ({ kind: 'run', mi, km })
export const pace = (mi: number, km: number): Workout => ({ kind: 'pace', mi, km })
export const cross = (minutes?: number): Workout => ({ kind: 'cross', minutes })
export const race = (distance: RaceDistance): Workout => ({ kind: 'race', race: distance })

/** Official race distances, used when substituting a run for a tune-up race. */
export const RACE_LENGTHS: Record<RaceDistance, { mi: number; km: number; label: string }> = {
  '5K': { mi: 3.1, km: 5, label: '5-K Race' },
  '10K': { mi: 6.2, km: 10, label: '10-K Race' },
  half: { mi: 13.1, km: 21.1, label: 'Half Marathon' },
  full: { mi: 26.2, km: 42.2, label: 'Marathon' },
}
