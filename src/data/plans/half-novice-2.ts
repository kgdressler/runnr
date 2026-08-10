import { type Plan, rest, run, pace, cross, race } from '../types'

/**
 * Hal Higdon: Half Marathon Novice 2.
 *
 * Transcribed from the printable PDF. Columns are Mon..Sun; the race is the
 * final Sunday. Mile and kilometre figures are both taken from the PDF's two
 * tables rather than converted, so they match the printout exactly.
 */
export const halfNovice2: Plan = {
  id: 'half-novice-2',
  name: 'Half Marathon — Novice 2',
  goal: 'half',
  weeks: 12,
  source: 'Hal Higdon, Half Marathon Novice 2',
  schedule: [
    //     Mon     Tue             Wed              Thu             Fri     Sat              Sun
    /* 1 */ [rest(), run(3, 4.8), run(3, 4.8), run(3, 4.8), rest(), run(4, 6.4), cross(60)],
    /* 2 */ [rest(), run(3, 4.8), pace(3, 4.8), run(3, 4.8), rest(), run(5, 8.1), cross(60)],
    /* 3 */ [rest(), run(3, 4.8), run(4, 6.4), run(3, 4.8), rest(), run(6, 9.7), cross(60)],
    /* 4 */ [rest(), run(3, 4.8), pace(4, 6.4), run(3, 4.8), rest(), run(7, 11.3), cross(60)],
    /* 5 */ [rest(), run(3, 4.8), run(4, 6.4), run(3, 4.8), rest(), run(8, 12.9), cross(60)],
    /* 6 */ [rest(), run(3, 4.8), pace(4, 6.4), run(3, 4.8), rest(), race('5K'), cross(60)],
    /* 7 */ [rest(), run(3, 4.8), run(5, 8.1), run(3, 4.8), rest(), run(9, 14.5), cross(60)],
    /* 8 */ [rest(), run(3, 4.8), pace(5, 8.1), run(3, 4.8), rest(), run(10, 16.1), cross(60)],
    /* 9 */ [rest(), run(3, 4.8), run(5, 8.1), run(3, 4.8), rest(), race('10K'), cross(60)],
    /* 10*/ [rest(), run(3, 4.8), pace(5, 8.1), run(3, 4.8), rest(), run(11, 17.7), cross(60)],
    /* 11*/ [rest(), run(3, 4.8), run(5, 8.1), run(3, 4.8), rest(), run(12, 19.3), cross(60)],
    /* 12*/ [rest(), run(3, 4.8), pace(2, 3.2), run(2, 3.2), rest(), rest(), race('half')],
  ],
}
