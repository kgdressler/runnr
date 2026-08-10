# Runnr

A training plan tracker for road races, built to replace counting back days on a
printed schedule. Set a race date, get the plan laid onto a real calendar, and
check off workouts as you go.

Plans are Hal Higdon's, transcribed from his printable PDFs.

## Status

Core scheduling logic and plan data are in place. UI is in progress.

## How the schedule is built

The plan's final day is pinned to your race date and every other day is counted
straight back from it, so each workout keeps its exact spacing from race day
whatever weekday you race on. If the race is closer than the plan is long, whole
weeks are dropped from the front — the taper is never touched.

Dates are handled as `YYYY-MM-DD` strings converted to integer epoch days, never
as `Date` objects. Doing plan arithmetic with `Date` means a race entered as
`2026-10-11` can silently shift a day for anyone west of UTC.

Reordering a week stores a permutation of `[0..6]` rather than editing workouts,
so weekly mileage cannot change and the printed order is always recoverable.

## Commands

```bash
npm install
npm run dev      # dev server
npm test         # vitest
npm run build    # typecheck + production build
```

## Deployment

Pushing to `main` runs the tests and publishes to GitHub Pages at
<https://kgdressler.github.io/runnr/>. Pages must be set to deploy from GitHub
Actions in the repository settings.

## Layout

```
src/
  data/plans/   plan tables transcribed from the PDFs
  lib/civil.ts  timezone-free date arithmetic
  lib/schedule.ts  resolveSchedule() and the operations on a plan
```

`resolveSchedule()` expands a saved plan into a day-by-day calendar. Every view
is a slice of that array, so the logic that can be wrong lives in one tested
place.
