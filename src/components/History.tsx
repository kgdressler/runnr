import { useState } from 'react'
import { useAppState } from '../state/useAppState'
import { getPlan } from '../data/plans'
import { resolveSchedule, planProgress, type ActivePlan } from '../lib/schedule'
import { formatLongDate } from '../lib/format'
import type { ISODate } from '../lib/civil'

/**
 * Past plans. Rendered on the Plan screen, and on Setup when there is no
 * active plan — otherwise archiving your last race would hide your history
 * behind a plan you have not created yet.
 */
export default function History({
  archived,
  today,
}: {
  archived: ActivePlan[]
  today: ISODate
}) {
  const { dispatch } = useAppState()
  const [confirming, setConfirming] = useState<string | null>(null)

  return (
    <section>
      <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">History</h2>

      {archived.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Past plans show up here once you finish or replace one.
        </p>
      ) : (
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
      )}
    </section>
  )
}
