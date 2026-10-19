import { reviewCtReport } from '@/server/claude';
import { aiRoute, preflight } from '@/server/http';
import { CtInput } from '@/server/requests';

/** Analyse de procès-verbal de contrôle technique : quota gratuit mensuel vérifié par le serveur, illimitée en Premium. */
export function POST(request: Request) {
  return aiRoute(request, CtInput, 'ct', reviewCtReport);
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
