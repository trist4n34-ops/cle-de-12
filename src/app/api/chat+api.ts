import { chat } from '@/server/claude';
import { aiRoute, preflight } from '@/server/http';
import { ChatInput } from '@/server/requests';

/** Questions de suivi : Premium. */
export function POST(request: Request) {
  return aiRoute(request, ChatInput, 'premium', async (input) => ({ text: await chat(input) }));
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
