import { describe, it, expect } from 'vitest'
import { PLANS, halfNovice2, marathonNovice1 } from './index'
import type { Workout } from '../types'

const MI_TO_KM = 1.609344

function distance(w: Workout): number | null {
  return w.kind === 'run' || w.kind === 'pace' ? w.mi : null
}

describe.each(PLANS)('$name — structure', (plan) => {
  it('has the declared number of weeks', () => {
    expect(plan.schedule).toHaveLength(plan.weeks)
  })

  it('has seven days in every week', () => {
    for (const week of plan.schedule) {
      expect(week).toHaveLength(7)
    }
  })

  it('rests on Monday and Friday every week', () => {
    plan.schedule.forEach((week, i) => {
      expect(week[0], `week ${i + 1} Monday`).toEqual({ kind: 'rest' })
      expect(week[4], `week ${i + 1} Friday`).toEqual({ kind: 'rest' })
    })
  })

  it('ends on the goal race', () => {
    const finalDay = plan.schedule[plan.weeks - 1][6]
    expect(finalDay).toEqual({ kind: 'race', race: plan.goal })
  })

  it('schedules the goal race only on the final day', () => {
    plan.schedule.forEach((week, w) => {
      week.forEach((day, d) => {
        const isFinal = w === plan.weeks - 1 && d === 6
        if (!isFinal && day.kind === 'race') {
          expect(day.race, `week ${w + 1} day ${d}`).not.toBe(plan.goal)
        }
      })
    })
  })

  /**
   * Higdon publishes both unit tables independently, so a mile/km pair that
   * disagrees means one of the two was mistyped during transcription.
   */
  it('keeps mile and kilometre figures consistent', () => {
    plan.schedule.forEach((week, w) => {
      week.forEach((day, d) => {
        if (day.kind !== 'run' && day.kind !== 'pace') return
        const expected = day.mi * MI_TO_KM
        expect(
          Math.abs(day.km - expected),
          `week ${w + 1} day ${d}: ${day.mi} mi vs ${day.km} km`,
        ).toBeLessThan(0.1)
      })
    })
  })
})

/**
 * The long run is the spine of both plans and the easiest column to mistype.
 * These arrays are a second, independent reading of the Saturday column.
 */
describe('long run progression', () => {
  it('matches the half marathon plan', () => {
    const saturdays = halfNovice2.schedule.map((w) => w[5])
    expect(saturdays.map(distance)).toEqual([4, 5, 6, 7, 8, null, 9, 10, null, 11, 12, null])
    expect(saturdays[5]).toEqual({ kind: 'race', race: '5K' })
    expect(saturdays[8]).toEqual({ kind: 'race', race: '10K' })
    expect(saturdays[11]).toEqual({ kind: 'rest' })
  })

  it('matches the marathon plan', () => {
    const saturdays = marathonNovice1.schedule.map((w) => w[5])
    expect(saturdays.map(distance)).toEqual([
      6, 7, 5, 9, 10, 7, 12, null, 10, 15, 16, 12, 18, 14, 20, 12, 8, null,
    ])
    // Weeks 8 and 18 rest on Saturday because Sunday is a race.
    expect(saturdays[7]).toEqual({ kind: 'rest' })
    expect(saturdays[17]).toEqual({ kind: 'rest' })
  })

  it('peaks at 12 miles for the half and 20 for the marathon', () => {
    const peak = (p: typeof halfNovice2) =>
      Math.max(...p.schedule.flat().map((w) => distance(w) ?? 0))
    expect(peak(halfNovice2)).toBe(12)
    expect(peak(marathonNovice1)).toBe(20)
  })
})

describe('tune-up races', () => {
  it('places a half marathon in marathon week 8', () => {
    expect(marathonNovice1.schedule[7][6]).toEqual({ kind: 'race', race: 'half' })
  })

  it('uses pace runs only in the half plan', () => {
    expect(halfNovice2.schedule.flat().some((w) => w.kind === 'pace')).toBe(true)
    expect(marathonNovice1.schedule.flat().some((w) => w.kind === 'pace')).toBe(false)
  })

  it('cross-trains on Sunday except when racing', () => {
    for (const plan of PLANS) {
      plan.schedule.forEach((week, w) => {
        const sunday = week[6]
        if (sunday.kind === 'race') return
        expect(sunday.kind, `week ${w + 1} Sunday`).toBe('cross')
      })
    }
  })
})
