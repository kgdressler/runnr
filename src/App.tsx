import { fitPlan, resolveSchedule, createActivePlan, planProgress } from './lib/schedule'
import { todayLocal } from './lib/civil'
import { PLANS } from './data/plans'

/**
 * Placeholder shell. Views land in steps 6-10; this exists so the deploy
 * pipeline is proven end to end before there is any UI to break.
 */
export default function App() {
  const today = todayLocal()
  const demoRace = '2026-11-01'
  const fit = fitPlan('half-novice-2', demoRace, today)
  const active = fit.ok
    ? createActivePlan({ id: 'demo', planId: 'half-novice-2', raceDate: demoRace, today })
    : null
  const progress = active ? planProgress(active, resolveSchedule(active, today), today) : null

  return (
    <main className="mx-auto max-w-md p-6 font-sans">
      <h1 className="text-2xl font-bold">Runnr</h1>
      <p className="mt-1 text-sm text-neutral-500">Training plan scaffolding — today is {today}.</p>

      <ul className="mt-6 space-y-1 text-sm">
        {PLANS.map((plan) => (
          <li key={plan.id}>
            {plan.name} — {plan.weeks} weeks
          </li>
        ))}
      </ul>

      {progress && (
        <p className="mt-6 text-sm">
          Demo: {progress.totalWorkouts} workouts, {progress.totalDistance} mi, race in{' '}
          {progress.daysToRace} days.
        </p>
      )}
    </main>
  )
}
