import type { Plan, PlanId } from '../types'
import { halfNovice2 } from './half-novice-2'
import { marathonNovice1 } from './marathon-novice-1'

/** Every plan the app knows about. Adding one means adding a file here. */
export const PLANS: Plan[] = [halfNovice2, marathonNovice1]

export function getPlan(id: PlanId): Plan {
  const plan = PLANS.find((p) => p.id === id)
  if (!plan) throw new Error(`Unknown plan: ${id}`)
  return plan
}

export { halfNovice2, marathonNovice1 }
