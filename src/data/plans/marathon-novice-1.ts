import { type Plan, rest, run, cross, race } from '../types'

/**
 * Hal Higdon: Marathon Novice 1.
 *
 * Transcribed from the printable PDF. Columns are Mon..Sun; the race is the
 * final Sunday. Week 8 swaps the long run for a tune-up half marathon.
 *
 * Note: the PDF's kilometre table labels week 16 as "1" — a typo in the
 * source. Its figures line up with the week 16 mile row, so it is transcribed
 * here as week 16.
 */
export const marathonNovice1: Plan = {
  id: 'marathon-novice-1',
  name: 'Marathon — Novice 1',
  goal: 'full',
  weeks: 18,
  source: 'Hal Higdon, Marathon Novice 1',
  schedule: [
    //     Mon     Tue            Wed              Thu            Fri     Sat              Sun
    /* 1 */ [rest(), run(3, 4.8), run(3, 4.8), run(3, 4.8), rest(), run(6, 9.7), cross()],
    /* 2 */ [rest(), run(3, 4.8), run(3, 4.8), run(3, 4.8), rest(), run(7, 11.3), cross()],
    /* 3 */ [rest(), run(3, 4.8), run(4, 6.4), run(3, 4.8), rest(), run(5, 8.1), cross()],
    /* 4 */ [rest(), run(3, 4.8), run(4, 6.4), run(3, 4.8), rest(), run(9, 14.5), cross()],
    /* 5 */ [rest(), run(3, 4.8), run(5, 8.1), run(3, 4.8), rest(), run(10, 16.1), cross()],
    /* 6 */ [rest(), run(3, 4.8), run(5, 8.1), run(3, 4.8), rest(), run(7, 11.3), cross()],
    /* 7 */ [rest(), run(3, 4.8), run(6, 9.7), run(3, 4.8), rest(), run(12, 19.3), cross()],
    /* 8 */ [rest(), run(3, 4.8), run(6, 9.7), run(3, 4.8), rest(), rest(), race('half')],
    /* 9 */ [rest(), run(3, 4.8), run(7, 11.3), run(4, 6.4), rest(), run(10, 16.1), cross()],
    /* 10*/ [rest(), run(3, 4.8), run(7, 11.3), run(4, 6.4), rest(), run(15, 24.1), cross()],
    /* 11*/ [rest(), run(4, 6.4), run(8, 12.9), run(4, 6.4), rest(), run(16, 25.7), cross()],
    /* 12*/ [rest(), run(4, 6.4), run(8, 12.9), run(5, 8.1), rest(), run(12, 19.3), cross()],
    /* 13*/ [rest(), run(4, 6.4), run(9, 14.5), run(5, 8.1), rest(), run(18, 29), cross()],
    /* 14*/ [rest(), run(5, 8.1), run(9, 14.5), run(5, 8.1), rest(), run(14, 22.5), cross()],
    /* 15*/ [rest(), run(5, 8.1), run(10, 16.1), run(5, 8.1), rest(), run(20, 32.2), cross()],
    /* 16*/ [rest(), run(5, 8.1), run(8, 12.9), run(4, 6.4), rest(), run(12, 19.3), cross()],
    /* 17*/ [rest(), run(4, 6.4), run(6, 9.7), run(3, 4.8), rest(), run(8, 12.9), cross()],
    /* 18*/ [rest(), run(3, 4.8), run(4, 6.4), run(2, 3.2), rest(), rest(), race('full')],
  ],
}
