import { chat } from '@/server/claude';
import { handle, requirePremium } from '@/server/http';
import { ChatInput, readJson } from '@/server/requests';

export async function POST(request: Request) {
  const input = await readJson(request, ChatInput);
  if (input instanceof Response) return input;
  const denied = await requirePremium(request);
  if (denied) return denied;
  return handle(async () => ({ text: await chat(input) }));
}
