import { reviewQuote } from '@/server/claude';
import { aiRoute, preflight } from '@/server/http';
import { QuoteInput } from '@/server/requests';

/** Analyse de devis : quota gratuit mensuel vérifié par le serveur, illimitée en Premium. */
export function POST(request: Request) {
  return aiRoute(request, QuoteInput, 'quote', reviewQuote);
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
