import { useNavigate } from 'react-router-dom'
import { useAppState } from '../state/useAppState'
import { weekDays, type ResolvedDay } from '../lib/schedule'
import { shortWorkout, dayName, formatShortDate } from '../lib/format'
import { workoutDistance } from '../data/types'

export default function Season() {
  const { active, plan, days, today, unit, progress, dispatch } = useAppState()
  const navigate = useNavigate()

  if (!active || !plan || !progress) return null

  const weeks = [...new Set(days.map((d) => d.planWeek))]
  // Slot 0 lands on the same weekday every week, so the column headers come
  // from the first week rather than being hardcoded Mon..Sun.
  const headers = days.slice(0, 7).map((d) => dayName(d.date))

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold tracking-tight">Season</h1>
        <button
          type="button"
          onClick={() => dispatch({ type: 'setUnit', unit: unit === 'mi' ? 'km' : 'mi' })}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium dark:border-neutral-800"
        >
          {unit === 'mi' ? 'Show km' : 'Show miles'}
        </button>
      </header>

      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <Stat label="Done" value={`${progress.completedWorkouts}/${progress.totalWorkouts}`} />
        <Stat label="Missed" value={String(progress.missedWorkouts)} />
        <Stat label={unit} value={`${progress.completedDistance}`} />
      </div>

      {/* Wide content scrolls in its own container so the page never does. */}
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full min-w-[20rem] border-separate border-spacing-0.5 text-center text-[11px]">
          <thead>
            <tr>
              <th className="w-6 font-medium text-neutral-500 dark:text-neutral-400">Wk</th>
              {headers.map((h, i) => (
                <th key={i} className="font-medium text-neutral-500 dark:text-neutral-400">
                  {h}
                </th>
              ))}
              <th className="w-8 font-medium text-neutral-500 dark:text-neutral-400">Tot</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((planWeek) => {
              const week = weekDays(days, planWeek)
              const total = week.reduce((sum, d) => sum + (workoutDistance(d.workout, unit) ?? 0), 0)
              return (
                <tr key={planWeek}>
                  <th
                    scope="row"
                    className="cursor-pointer font-medium text-neutral-500 dark:text-neutral-400"
                    onClick={() => navigate(`/week?w=${planWeek}`)}
                  >
                    {planWeek + 1}
                  </th>
                  {week.map((day) => (
                    <Cell
                      key={day.date}
                      day={day}
                      unit={unit}
                      isToday={day.date === today}
                      onClick={() => navigate(`/week?w=${planWeek}`)}
                    />
                  ))}
                  <td className="text-neutral-500 tabular-nums dark:text-neutral-400">
                    {Math.round(total * 10) / 10}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Legend />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
    </div>
  )
}

const CELL_STYLES: Record<string, string> = {
  done: 'bg-green-600 text-white',
  missed: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200',
  today: 'ring-2 ring-indigo-500 font-bold',
  upcoming: 'bg-neutral-100 dark:bg-neutral-900',
  past: 'bg-neutral-100 text-neutral-400 dark:bg-neutral-900 dark:text-neutral-600',
}

function Cell({
  day,
  unit,
  isToday,
  onClick,
}: {
  day: ResolvedDay
  unit: 'mi' | 'km'
  isToday: boolean
  onClick: () => void
}) {
  const base = CELL_STYLES[day.status] ?? CELL_STYLES.upcoming
  return (
    <td
      onClick={onClick}
      title={`${formatShortDate(day.date)} — ${day.isGoalRace ? 'Race' : ''}`}
      className={`cursor-pointer rounded px-0.5 py-1.5 tabular-nums ${base} ${
        isToday ? 'ring-2 ring-indigo-500' : ''
      } ${day.isGoalRace ? 'font-bold' : ''}`}
    >
      {shortWorkout(day.workout, unit)}
    </td>
  )
}

function Legend() {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
      <li>XT — cross training</li>
      <li>HM / M — race</li>
      <li>— rest</li>
    </ul>
  )
}
