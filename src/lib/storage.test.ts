import { describe, it, expect } from 'vitest'
import { parseAppData, archiveActive, EMPTY, type AppData } from './storage'
import { createActivePlan } from './schedule'

const TODAY = '2026-08-10'

const sample = createActivePlan({
  id: 'a1',
  planId: 'half-novice-2',
  raceDate: '2026-11-01',
  today: TODAY,
})

function roundTrip(data: AppData): AppData {
  return parseAppData(JSON.stringify(data))
}

describe('round tripping', () => {
  it('preserves a plan through serialisation', () => {
    const data: AppData = { version: 1, active: sample, archived: [] }
    expect(roundTrip(data).active).toEqual(sample)
  })

  it('preserves completions, swaps and substitutions', () => {
    const active = {
      ...sample,
      completed: { '2026-08-11': true as const },
      swaps: { 3: [1, 0, 2, 3, 4, 5, 6] },
      raceSubs: { '5:5': true as const },
    }
    expect(roundTrip({ version: 1, active, archived: [] }).active).toEqual(active)
  })

  it('preserves archived plans', () => {
    const data: AppData = { version: 1, active: null, archived: [sample] }
    expect(roundTrip(data).archived).toEqual([sample])
  })
})

describe('recovering from bad stored data', () => {
  it('returns empty for missing or unparseable input', () => {
    expect(parseAppData(null)).toEqual(EMPTY)
    expect(parseAppData('')).toEqual(EMPTY)
    expect(parseAppData('not json')).toEqual(EMPTY)
    expect(parseAppData('[1,2,3]')).toEqual(EMPTY)
    expect(parseAppData('"a string"')).toEqual(EMPTY)
  })

  it('drops a plan referring to an unknown plan id', () => {
    const raw = JSON.stringify({ version: 1, active: { ...sample, planId: 'ultra-novice-9' } })
    expect(parseAppData(raw).active).toBeNull()
  })

  it('drops a plan with an unusable race date', () => {
    for (const raceDate of ['2026-02-30', 'soon', '', '11/01/2026']) {
      const raw = JSON.stringify({ version: 1, active: { ...sample, raceDate } })
      expect(parseAppData(raw).active).toBeNull()
    }
  })

  it('discards corrupted swaps but keeps the rest of the plan', () => {
    const raw = JSON.stringify({
      version: 1,
      active: {
        ...sample,
        completed: { '2026-08-11': true },
        swaps: {
          0: [1, 0, 2, 3, 4, 5, 6], // valid
          1: [0, 0, 2, 3, 4, 5, 6], // not a permutation
          2: [0, 1, 2], // wrong length
          3: 'nonsense',
        },
      },
    })
    const active = parseAppData(raw).active!
    expect(active.swaps).toEqual({ 0: [1, 0, 2, 3, 4, 5, 6] })
    expect(active.completed).toEqual({ '2026-08-11': true })
  })

  it('drops completion entries that are not real dates', () => {
    const raw = JSON.stringify({
      version: 1,
      active: { ...sample, completed: { '2026-08-11': true, 'last tuesday': true, '2026-13-01': true } },
    })
    expect(parseAppData(raw).active!.completed).toEqual({ '2026-08-11': true })
  })

  it('ignores falsy completion flags rather than trusting the key', () => {
    const raw = JSON.stringify({
      version: 1,
      active: { ...sample, completed: { '2026-08-11': false, '2026-08-12': true } },
    })
    expect(parseAppData(raw).active!.completed).toEqual({ '2026-08-12': true })
  })

  it('clamps a skipWeeks value that would empty the plan', () => {
    const raw = JSON.stringify({ version: 1, active: { ...sample, skipWeeks: 99 } })
    expect(parseAppData(raw).active!.skipWeeks).toBe(11)
  })

  it('falls back to miles for an unrecognised unit', () => {
    const raw = JSON.stringify({ version: 1, active: { ...sample, unit: 'furlongs' } })
    expect(parseAppData(raw).active!.unit).toBe('mi')
  })

  it('skips unusable archived entries without losing the good ones', () => {
    const raw = JSON.stringify({
      version: 1,
      active: null,
      archived: [sample, { ...sample, planId: 'nope' }, null, 'garbage'],
    })
    expect(parseAppData(raw).archived).toEqual([sample])
  })
})

describe('archiving', () => {
  it('moves the active plan to the front of history', () => {
    const older = { ...sample, id: 'older' }
    const data: AppData = { version: 1, active: sample, archived: [older] }
    const after = archiveActive(data)
    expect(after.active).toBeNull()
    expect(after.archived.map((p) => p.id)).toEqual(['a1', 'older'])
  })

  it('is a no-op with no active plan', () => {
    const data: AppData = { version: 1, active: null, archived: [sample] }
    expect(archiveActive(data)).toBe(data)
  })
})
