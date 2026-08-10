import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react'
import type { PlanId, Plan, Unit } from '../data/types'
import { getPlan } from '../data/plans'
import { todayLocal, type ISODate } from '../lib/civil'
import {
  createActivePlan,
  resolveSchedule,
  planProgress,
  setCompleted,
  setRaceSubstitution,
  swapDays,
  resetWeek,
  SwapError,
  type ActivePlan,
  type ResolvedDay,
  type PlanProgress,
} from '../lib/schedule'
import { load, save, archiveActive, EMPTY, type AppData } from '../lib/storage'

type Action =
  | { type: 'create'; planId: PlanId; raceDate: ISODate; raceName?: string; unit: Unit; today: ISODate }
  | { type: 'toggleComplete'; date: ISODate; done: boolean }
  | { type: 'swap'; planWeek: number; slotA: number; slotB: number; today: ISODate }
  | { type: 'resetWeek'; planWeek: number }
  | { type: 'substitute'; planWeek: number; planDay: number; value: boolean }
  | { type: 'setUnit'; unit: Unit }
  | { type: 'archive' }
  | { type: 'deleteArchived'; id: string }

function withActive(data: AppData, next: ActivePlan): AppData {
  return { ...data, active: next }
}

function reducer(data: AppData, action: Action): AppData {
  switch (action.type) {
    case 'create': {
      // Starting a new plan retires the current one rather than discarding it.
      const cleared = archiveActive(data)
      const active = createActivePlan({
        id: `${Date.now()}`,
        planId: action.planId,
        raceDate: action.raceDate,
        raceName: action.raceName,
        unit: action.unit,
        today: action.today,
      })
      return { ...cleared, active }
    }
    case 'toggleComplete':
      if (!data.active) return data
      return withActive(data, setCompleted(data.active, action.date, action.done))
    case 'swap': {
      if (!data.active) return data
      try {
        return withActive(
          data,
          swapDays(data.active, action.planWeek, action.slotA, action.slotB, action.today),
        )
      } catch (error) {
        // The UI disables illegal swaps, so this is a guard rather than a path.
        if (error instanceof SwapError) return data
        throw error
      }
    }
    case 'resetWeek':
      if (!data.active) return data
      return withActive(data, resetWeek(data.active, action.planWeek))
    case 'substitute':
      if (!data.active) return data
      return withActive(
        data,
        setRaceSubstitution(data.active, action.planWeek, action.planDay, action.value),
      )
    case 'setUnit':
      if (!data.active) return data
      return withActive(data, { ...data.active, unit: action.unit })
    case 'archive':
      return archiveActive(data)
    case 'deleteArchived':
      return { ...data, archived: data.archived.filter((p) => p.id !== action.id) }
  }
}

interface AppState {
  data: AppData
  today: ISODate
  active: ActivePlan | null
  plan: Plan | null
  days: ResolvedDay[]
  progress: PlanProgress | null
  unit: Unit
  dispatch: (action: Action) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, () => load())
  const [today, setToday] = useState<ISODate>(() => todayLocal())

  useEffect(() => {
    save(data)
  }, [data])

  // The app is likely to sit open on a phone overnight, so re-check the date
  // whenever it comes back to the foreground rather than trusting mount time.
  useEffect(() => {
    const refresh = () => setToday(todayLocal())
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
      window.clearInterval(timer)
    }
  }, [])

  const value = useMemo<AppState>(() => {
    const active = data.active
    const plan = active ? getPlan(active.planId) : null
    const days = active ? resolveSchedule(active, today) : []
    const progress = active ? planProgress(active, days, today) : null
    return {
      data,
      today,
      active,
      plan,
      days,
      progress,
      unit: active?.unit ?? 'mi',
      dispatch,
    }
  }, [data, today])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppState(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppState must be used inside AppProvider')
  return ctx
}

export { EMPTY }
export type { Action }
