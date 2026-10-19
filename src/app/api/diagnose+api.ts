import { diagnose } from '@/server/claude';
import { handle, requirePremium } from '@/server/http';
import { DiagnoseInput, readJson } from '@/server/requests';

export async function POST(request: Request) {
  const input = await readJson(request, DiagnoseInput);
  if (input instanceof Response) return input;
  if (input.photo) {
    const denied = await requirePremium(request);
    if (denied) return denied;
  }
  return handle(() => diagnose(input));
}
