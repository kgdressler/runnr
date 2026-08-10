import type { ActivePlan } from './schedule'
import type { PlanId, Unit } from '../data/types'
import { PLANS } from '../data/plans'
import { isValidDate } from './civil'

const STORAGE_KEY = 'runnr.v1'

export interface AppData {
  version: 1
  /** The plan being trained on now, if any. */
  active: ActivePlan | null
  /** Finished or replaced plans, most recent first. */
  archived: ActivePlan[]
}

export const EMPTY: AppData = { version: 1, active: null, archived: [] }

const PLAN_IDS = new Set<string>(PLANS.map((p) => p.id))

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Keep only `key: true` string entries, dropping anything else. */
function cleanFlags(value: unknown): Record<string, true> {
  if (!isObject(value)) return {}
  const out: Record<string, true> = {}
  for (const [k, v] of Object.entries(value)) {
    if (v === true) out[k] = true
  }
  return out
}

/** Keep only entries that are genuine permutations of [0..6]. */
function cleanSwaps(value: unknown): Record<number, number[]> {
  if (!isObject(value)) return {}
  const out: Record<number, number[]> = {}
  for (const [k, v] of Object.entries(value)) {
    const week = Number(k)
    if (!Number.isInteger(week) || week < 0) continue
    if (!Array.isArray(v) || v.length !== 7) continue
    const sorted = [...v].sort((a, b) => a - b)
    const isPermutation = sorted.every((n, i) => n === i)
    if (isPermutation) out[week] = v as number[]
  }
  return out
}

/**
 * Rebuild an ActivePlan from untrusted JSON. Anything unrecognised is dropped
 * rather than thrown away wholesale — a corrupted swap shouldn't cost you your
 * completion history.
 */
function parsePlan(value: unknown): ActivePlan | null {
  if (!isObject(value)) return null
  const { id, planId, raceDate, raceName, skipWeeks, unit, createdAt } = value

  if (typeof id !== 'string' || !id) return null
  if (typeof planId !== 'string' || !PLAN_IDS.has(planId)) return null
  if (typeof raceDate !== 'string' || !isValidDate(raceDate)) return null

  const plan = PLANS.find((p) => p.id === planId)!
  const skip =
    typeof skipWeeks === 'number' && Number.isInteger(skipWeeks) && skipWeeks >= 0
      ? Math.min(skipWeeks, plan.weeks - 1)
      : 0

  const completed = cleanFlags(value.completed)
  for (const date of Object.keys(completed)) {
    if (!isValidDate(date)) delete completed[date]
  }

  return {
    id,
    planId: planId as PlanId,
    raceDate,
    raceName: typeof raceName === 'string' && raceName ? raceName : undefined,
    skipWeeks: skip,
    unit: unit === 'km' ? ('km' as Unit) : ('mi' as Unit),
    completed,
    swaps: cleanSwaps(value.swaps),
    raceSubs: cleanFlags(value.raceSubs),
    createdAt: typeof createdAt === 'string' && isValidDate(createdAt) ? createdAt : raceDate,
  }
}

export function parseAppData(raw: string | null): AppData {
  if (!raw) return EMPTY
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return EMPTY
  }
  if (!isObject(parsed)) return EMPTY

  const archived = Array.isArray(parsed.archived)
    ? parsed.archived.map(parsePlan).filter((p): p is ActivePlan => p !== null)
    : []

  return { version: 1, active: parsePlan(parsed.active), archived }
}

export function load(): AppData {
  try {
    return parseAppData(localStorage.getItem(STORAGE_KEY))
  } catch {
    // Private browsing and blocked storage both throw on access.
    return EMPTY
  }
}

export function save(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Nothing useful to do if storage is full or unavailable; the in-memory
    // state stays correct for the rest of the session.
  }
}

/** Move the active plan into history and clear the slot. */
export function archiveActive(data: AppData): AppData {
  if (!data.active) return data
  return { version: 1, active: null, archived: [data.active, ...data.archived] }
}
