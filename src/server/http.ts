import { ClaudeError } from '@/server/claude';
import { isPremium } from '@/server/entitlements';

export const USER_HEADER = 'x-cle12-user';

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** Refuse la requête si l'utilisateur n'a pas Premium. */
export async function requirePremium(request: Request): Promise<Response | null> {
  if (await isPremium(request.headers.get(USER_HEADER))) return null;
  return jsonError('Cette fonction fait partie de Premium.', 402);
}

/** Exécute un appel IA et transforme les erreurs en réponses lisibles. */
export async function handle(work: () => Promise<unknown>): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) return jsonError("L'IA n'est pas configurée sur ce serveur.", 503);
  try {
    return Response.json(await work());
  } catch (e) {
    if (e instanceof ClaudeError) return jsonError(e.message, e.status);
    console.error(e);
    return jsonError("L'IA est momentanément indisponible. Réessayez dans quelques minutes.", 502);
  }
}
