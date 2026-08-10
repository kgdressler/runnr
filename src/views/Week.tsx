import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppState } from '../state/useAppState'
import { weekDays, currentWeek, type ResolvedDay } from '../lib/schedule'
import { formatWorkout, formatShortDate, dayName } from '../lib/format'

export default function Week() {
  const { active, plan, days, today, unit, dispatch } = useAppState()
  const [params, setParams] = useSearchParams()
  const [selected, setSelected] = useState<number | null>(null)

  if (!active || !plan) return null

  const weeks = [...new Set(days.map((d) => d.planWeek))]
  const requested = Number(params.get('w'))
  const planWeek = weeks.includes(requested) ? requested : currentWeek(days, today)
  const week = weekDays(days, planWeek)
  const index = weeks.indexOf(planWeek)

  function go(delta: number) {
    const next = weeks[index + delta]
    if (next === undefined) return
    setParams({ w: String(next) })
    setSelected(null)
  }

  function tap(day: ResolvedDay) {
    if (!day.canSwap) return
    if (selected === null) {
      setSelected(day.slot)
      return
    }
    if (selected === day.slot) {
      setSelected(null)
      return
    }
    dispatch({ type: 'swap', planWeek, slotA: selected, slotB: day.slot, today })
    setSelected(null)
  }

  const reordered = active.swaps[planWeek] !== undefined

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="rounded-lg px-3 py-2 text-lg disabled:opacity-25"
          aria-label="Previous week"
        >
          ←
        </button>
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight">Week {planWeek + 1}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {formatShortDate(week[0].date)} – {formatShortDate(week[6].date)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === weeks.length - 1}
          className="rounded-lg px-3 py-2 text-lg disabled:opacity-25"
          aria-label="Next week"
        >
          →
        </button>
      </header>

      <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
        {selected === null
          ? 'Tap two days to swap them.'
          : 'Now tap the day to swap it with.'}
      </p>

      <ul className="space-y-2">
        {week.map((day) => (
          <DayRow
            key={day.date}
            day={day}
            unit={unit}
            isToday={day.date === today}
            selected={selected === day.slot}
            dimmed={selected !== null && selected !== day.slot && !day.canSwap}
            onTap={() => tap(day)}
            onToggle={() =>
              dispatch({ type: 'toggleComplete', date: day.date, done: day.status !== 'done' })
            }
          />
        ))}
      </ul>

      {reordered && (
        <button
          type="button"
          onClick={() => {
            dispatch({ type: 'resetWeek', planWeek })
            setSelected(null)
          }}
          className="w-full rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800"
        >
          Reset this week to the printed order
        </button>
      )}

      <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
        Swaps stay inside the week, so your weekly mileage never changes.
      </p>
    </div>
  )
}

const STATUS_STYLES: Record<string, string> = {
  done: 'border-green-500/60 bg-green-50 dark:bg-green-950/30',
  missed: 'border-amber-400/60 bg-amber-50 dark:bg-amber-950/30',
  today: 'border-indigo-500',
  upcoming: 'border-neutral-200 dark:border-neutral-800',
  past: 'border-neutral-200 dark:border-neutral-800',
}

function DayRow({
  day,
  unit,
  isToday,
  selected,
  dimmed,
  onTap,
  onToggle,
}: {
  day: ResolvedDay
  unit: 'mi' | 'km'
  isToday: boolean
  selected: boolean
  dimmed: boolean
  onTap: () => void
  onToggle: () => void
}) {
  const isRest = day.workout.kind === 'rest'

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border p-3 transition ${
        selected ? 'border-indigo-500 ring-2 ring-indigo-500/40' : STATUS_STYLES[day.status]
      } ${dimmed ? 'opacity-40' : ''}`}
    >
      <button
        type="button"
        onClick={onTap}
        disabled={!day.canSwap}
        className="flex-1 text-left disabled:cursor-not-allowed"
      >
        <span className="flex items-baseline gap-2">
          <span className="w-9 text-sm font-semibold">{dayName(day.date)}</span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {formatShortDate(day.date)}
          </span>
          {isToday && (
            <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              TODAY
            </span>
          )}
        </span>
        <span className="mt-1 block font-medium">
          {formatWorkout(day.workout, unit)}
          {day.substituted && (
            <span className="ml-2 text-xs font-normal text-neutral-500">substituted</span>
          )}
        </span>
        {day.status === 'missed' && (
          <span className="text-xs text-amber-700 dark:text-amber-400">missed</span>
        )}
      </button>

      {!isRest && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={day.status === 'done' ? 'Mark not done' : 'Mark done'}
          aria-pressed={day.status === 'done'}
          className={`size-9 shrink-0 rounded-full border text-sm transition ${
            day.status === 'done'
              ? 'border-green-600 bg-green-600 text-white'
              : 'border-neutral-300 dark:border-neutral-700'
          }`}
        >
          ✓
        </button>
      )}
    </li>
  )
}
