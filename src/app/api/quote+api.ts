import { reviewQuote } from '@/server/claude';
import { handle } from '@/server/http';
import { QuoteInput, readJson } from '@/server/requests';

/** Analyse de devis : 1 par mois en gratuit (compté par l'app), illimitée en Premium. */
export async function POST(request: Request) {
  const input = await readJson(request, QuoteInput);
  if (input instanceof Response) return input;
  return handle(() => reviewQuote(input));
}
