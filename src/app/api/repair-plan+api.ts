import { repairPlan } from '@/server/claude';
import { aiRoute, preflight } from '@/server/http';
import { RepairPlanInput } from '@/server/requests';

/** Plan de réparation sur mesure : Premium. */
export function POST(request: Request) {
  return aiRoute(request, RepairPlanInput, 'premium', repairPlan);
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
