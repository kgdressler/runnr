import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PLANS } from '../data/plans'
import type { PlanId, Unit } from '../data/types'
import { addDays } from '../lib/civil'
import { fitPlan } from '../lib/schedule'
import { formatLongDate, formatCountdown } from '../lib/format'
import { useAppState } from '../state/useAppState'

export default function Setup() {
  const { today, active, dispatch } = useAppState()
  const navigate = useNavigate()

  const [planId, setPlanId] = useState<PlanId>('half-novice-2')
  const [raceDate, setRaceDate] = useState('')
  const [raceName, setRaceName] = useState('')
  const [unit, setUnit] = useState<Unit>('mi')

  const fit = raceDate ? fitPlan(planId, raceDate, today) : null
  const plan = PLANS.find((p) => p.id === planId)!

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!fit?.ok) return
    dispatch({ type: 'create', planId, raceDate, raceName: raceName.trim() || undefined, unit, today })
    navigate('/')
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {active ? 'New race' : 'Set up your training'}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Pick a plan and a race date. The schedule is counted back from race day.
        </p>
      </header>

      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-semibold">Distance</legend>
        {PLANS.map((p) => (
          <label
            key={p.id}
            className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
              planId === p.id
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                : 'border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <span>
              <span className="block font-medium">{p.name}</span>
              <span className="block text-sm text-neutral-500 dark:text-neutral-400">
                {p.weeks} weeks
              </span>
            </span>
            <input
              type="radio"
              name="plan"
              value={p.id}
              checked={planId === p.id}
              onChange={() => setPlanId(p.id)}
              className="size-5 accent-indigo-600"
            />
          </label>
        ))}
      </fieldset>

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-semibold">Race date</span>
          <input
            type="date"
            required
            value={raceDate}
            min={addDays(today, 1)}
            onChange={(e) => setRaceDate(e.target.value)}
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-transparent p-3 dark:border-neutral-700"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">
            Race name <span className="font-normal text-neutral-500">(optional)</span>
          </span>
          <input
            type="text"
            value={raceName}
            placeholder="Chicago Marathon"
            onChange={(e) => setRaceName(e.target.value)}
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-transparent p-3 dark:border-neutral-700"
          />
        </label>

        <div>
          <span className="text-sm font-semibold">Units</span>
          <div className="mt-2 flex gap-2">
            {(['mi', 'km'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`flex-1 rounded-lg border p-3 text-sm font-medium transition ${
                  unit === u
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'border-neutral-200 dark:border-neutral-800'
                }`}
              >
                {u === 'mi' ? 'Miles' : 'Kilometres'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {fit && <Preview fit={fit} planWeeks={plan.weeks} raceDate={raceDate} />}

      <button
        type="submit"
        disabled={!fit?.ok}
        className="w-full rounded-xl bg-indigo-600 p-4 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        {active ? 'Replace current plan' : 'Start training'}
      </button>

      {active && (
        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
          Your current plan moves to history. Nothing is deleted.
        </p>
      )}
    </form>
  )
}

function Preview({
  fit,
  planWeeks,
  raceDate,
}: {
  fit: ReturnType<typeof fitPlan>
  planWeeks: number
  raceDate: string
}) {
  if (!fit.ok) {
    return (
      <p className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        {fit.reason === 'past'
          ? 'That date has already passed. Pick a date in the future.'
          : `That leaves only ${fit.available} days, and this plan needs at least a week of training. Try a shorter plan or a later race.`}
      </p>
    )
  }

  const weeks = planWeeks - fit.skipWeeks

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800">
      <Row label="Race day" value={formatLongDate(raceDate)} />
      <Row label="Training starts" value={formatLongDate(fit.startDate)} />
      <Row label="Length" value={`${weeks} weeks`} />
      <Row label="Countdown" value={formatCountdown(fit.available - 1)} />

      {fit.skipWeeks > 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Your race is sooner than this plan is long, so the first {fit.skipWeeks} week
          {fit.skipWeeks === 1 ? '' : 's'} will be skipped and you'll start at week{' '}
          {fit.skipWeeks + 1}. The taper is untouched, but you'll miss the early base building.
        </p>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
