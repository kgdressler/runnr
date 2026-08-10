import { Link } from 'react-router-dom'
import { useAppState } from '../state/useAppState'
import { dayFor, type ResolvedDay } from '../lib/schedule'
import { formatWorkout, formatLongDate, formatDate, formatCountdown } from '../lib/format'
import { diffDays } from '../lib/civil'

export default function Today() {
  const { active, plan, days, today, progress, unit, dispatch } = useAppState()

  if (!active || !plan || !progress) return null

  const day = dayFor(days, today)
  const start = days[0]
  const upcoming = days.filter((d) => d.date > today).slice(0, 3)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {active.raceName ?? plan.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {formatCountdown(progress.daysToRace)} · {formatDate(active.raceDate)}
        </p>
      </header>

      {day ? (
        <TodayCard day={day} unit={unit} onToggle={(done) => dispatch({ type: 'toggleComplete', date: today, done })} />
      ) : (
        <NotStarted startDate={start?.date} today={today} raceDate={active.raceDate} />
      )}

      {day && <Substitution day={day} />}

      <section>
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Coming up</h2>
        <ul className="mt-2 divide-y divide-neutral-200 dark:divide-neutral-800">
          {upcoming.map((d) => (
            <li key={d.date} className="flex justify-between py-3 text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">{formatDate(d.date)}</span>
              <span className="font-medium">{formatWorkout(d.workout, unit)}</span>
            </li>
          ))}
          {upcoming.length === 0 && (
            <li className="py-3 text-sm text-neutral-500">Nothing left — the race is behind you.</li>
          )}
        </ul>
        <Link to="/week" className="mt-3 inline-block text-sm font-medium text-indigo-600 dark:text-indigo-400">
          See the whole week →
        </Link>
      </section>

      <section className="rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800">
        <div className="flex justify-between">
          <span className="text-neutral-500 dark:text-neutral-400">Workouts done</span>
          <span className="font-medium">
            {progress.completedWorkouts} of {progress.totalWorkouts}
          </span>
        </div>
        <div className="mt-2 flex justify-between">
          <span className="text-neutral-500 dark:text-neutral-400">Distance logged</span>
          <span className="font-medium">
            {progress.completedDistance} of {progress.totalDistance} {unit}
          </span>
        </div>
        {progress.missedWorkouts > 0 && (
          <div className="mt-2 flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">Missed</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">
              {progress.missedWorkouts}
            </span>
          </div>
        )}
      </section>
    </div>
  )
}

function TodayCard({
  day,
  unit,
  onToggle,
}: {
  day: ResolvedDay
  unit: 'mi' | 'km'
  onToggle: (done: boolean) => void
}) {
  const done = day.status === 'done'
  const isRest = day.workout.kind === 'rest'

  return (
    <section className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {formatLongDate(day.date)} · Week {day.weekNumber}
      </p>
      <p className="mt-2 text-4xl font-bold tracking-tight">{formatWorkout(day.workout, unit)}</p>

      {isRest ? (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          Nothing scheduled. Rest is part of the plan.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => onToggle(!done)}
          aria-pressed={done}
          className={`mt-6 w-full rounded-xl p-4 font-semibold transition ${
            done
              ? 'bg-green-600 text-white'
              : 'border border-neutral-300 dark:border-neutral-700'
          }`}
        >
          {done ? '✓ Completed' : 'Mark complete'}
        </button>
      )}
    </section>
  )
}

function Substitution({ day }: { day: ResolvedDay }) {
  const { dispatch, active } = useAppState()
  if (!active) return null

  // Only tune-up races can be swapped for a run; the goal race is the point.
  const isTuneUp = day.isGoalRace === false && (day.workout.kind === 'race' || day.substituted)
  if (!isTuneUp) return null

  // Recover which plan day this came from so the substitution keys correctly.
  const planDay = (active.swaps[day.planWeek] ?? [0, 1, 2, 3, 4, 5, 6])[day.slot]

  return (
    <button
      type="button"
      onClick={() =>
        dispatch({
          type: 'substitute',
          planWeek: day.planWeek,
          planDay,
          value: !day.substituted,
        })
      }
      className="w-full rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800"
    >
      {day.substituted
        ? 'Racing it after all? Switch back to the race'
        : "Not racing? Run the distance instead"}
    </button>
  )
}

function NotStarted({
  startDate,
  today,
  raceDate,
}: {
  startDate?: string
  today: string
  raceDate: string
}) {
  if (!startDate) return null
  const started = today >= startDate

  return (
    <section className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
      {started ? (
        <>
          <p className="text-4xl font-bold tracking-tight">Race complete</p>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {formatDate(raceDate)} has passed. Start a new plan when you're ready.
          </p>
        </>
      ) : (
        <>
          <p className="text-4xl font-bold tracking-tight">Not started yet</p>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Training begins {formatLongDate(startDate)} — {diffDays(startDate, today)} days from now.
          </p>
        </>
      )}
    </section>
  )
}
