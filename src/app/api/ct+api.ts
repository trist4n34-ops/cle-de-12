import { reviewCtReport } from '@/server/claude';
import { handle } from '@/server/http';
import { CtInput, readJson } from '@/server/requests';

/** Analyse de procès-verbal de contrôle technique : 1 par mois en gratuit (compté par l'app), illimitée en Premium. */
export async function POST(request: Request) {
  const input = await readJson(request, CtInput);
  if (input instanceof Response) return input;
  return handle(() => reviewCtReport(input));
}
