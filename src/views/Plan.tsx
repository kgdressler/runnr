import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppState } from '../state/useAppState'
import { getPlan } from '../data/plans'
import { resolveSchedule, planProgress, type ActivePlan } from '../lib/schedule'
import { formatLongDate, formatCountdown } from '../lib/format'

export default function Plan() {
  const { active, plan, days, today, progress, unit, dispatch, data } = useAppState()

  if (!active || !plan || !progress) return null

  const raceIsPast = today > active.raceDate

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-bold tracking-tight">Your plan</h1>
      </header>

      <section className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div>
          <h2 className="font-semibold">{active.raceName ?? plan.name}</h2>
          {/* Only worth repeating when the race has its own name. */}
          {active.raceName && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{plan.name}</p>
          )}
        </div>
        <Row label="Race day" value={formatLongDate(active.raceDate)} />
        <Row label="Countdown" value={formatCountdown(progress.daysToRace)} />
        <Row label="Training started" value={formatLongDate(days[0].date)} />
        <Row
          label="Progress"
          value={`${progress.completedWorkouts} of ${progress.totalWorkouts} workouts`}
        />
        {active.skipWeeks > 0 && (
          <Row label="Weeks skipped" value={`${active.skipWeeks} (started at week ${active.skipWeeks + 1})`} />
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">Units</span>
          <div className="flex gap-1">
            {(['mi', 'km'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => dispatch({ type: 'setUnit', unit: u })}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  unit === u
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'border-neutral-200 dark:border-neutral-800'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </section>

      {raceIsPast && (
        <section className="rounded-xl border border-green-300 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
          <p className="font-semibold">Race day has passed</p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            Move this plan to history when you're ready. Your record is kept.
          </p>
          <button
            type="button"
            onClick={() => dispatch({ type: 'archive' })}
            className="mt-3 w-full rounded-lg bg-green-700 p-3 text-sm font-semibold text-white"
          >
            Finish and archive
          </button>
        </section>
      )}

      <Link
        to="/setup"
        className="block w-full rounded-xl bg-indigo-600 p-4 text-center font-semibold text-white"
      >
        Start a new race
      </Link>

      <History archived={data.archived} today={today} />
    </div>
  )
}

function History({ archived, today }: { archived: ActivePlan[]; today: string }) {
  const { dispatch } = useAppState()
  const [confirming, setConfirming] = useState<string | null>(null)

  if (archived.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">History</h2>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Past plans show up here once you finish or replace one.
        </p>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">History</h2>
      <ul className="mt-2 space-y-2">
        {archived.map((entry) => {
          const plan = getPlan(entry.planId)
          const progress = planProgress(entry, resolveSchedule(entry, today), today)
          return (
            <li
              key={entry.id}
              className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <p className="font-medium">{entry.raceName ?? plan.name}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {entry.raceName ? `${plan.name} · ` : ''}
                {formatLongDate(entry.raceDate)}
              </p>
              <p className="mt-1 text-sm">
                {progress.completedWorkouts} of {progress.totalWorkouts} workouts ·{' '}
                {progress.completedDistance} {entry.unit}
              </p>

              {confirming === entry.id ? (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'deleteArchived', id: entry.id })}
                    className="flex-1 rounded-lg bg-red-600 p-2 text-sm font-semibold text-white"
                  >
                    Delete permanently
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className="flex-1 rounded-lg border border-neutral-300 p-2 text-sm dark:border-neutral-700"
                  >
                    Keep
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(entry.id)}
                  className="mt-3 text-xs text-neutral-500 underline dark:text-neutral-400"
                >
                  Delete
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
