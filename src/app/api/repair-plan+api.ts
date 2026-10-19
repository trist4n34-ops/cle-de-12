import { repairPlan } from '@/server/claude';
import { handle, requirePremium } from '@/server/http';
import { readJson, RepairPlanInput } from '@/server/requests';

export async function POST(request: Request) {
  const input = await readJson(request, RepairPlanInput);
  if (input instanceof Response) return input;
  const denied = await requirePremium(request);
  if (denied) return denied;
  return handle(() => repairPlan(input));
}
