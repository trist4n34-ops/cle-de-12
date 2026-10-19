/**
 * Socle commun des routes `/api` : en-têtes de sécurité, CORS, session signée,
 * limites de débit, droits (Premium, quotas, crédits) et erreurs génériques.
 * Les détails internes ne partent jamais vers le client : ils sont journalisés
 * côté serveur et le client reçoit un message générique en français.
 */
import type { z } from 'zod';

import { ClaudeError } from '@/server/claude';
import { getEntitlements } from '@/server/entitlements';
import { checkRateLimit, clientIp, QuotaFeature, RateScope, Reservation, reserveQuota } from '@/server/limits';
import { readJson } from '@/server/requests';
import { bearerToken, SessionUnavailable, verifySession } from '@/server/session';
import { usageStore } from '@/server/usage-store';

export const SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

const CORS_METHODS = 'GET, POST, OPTIONS';
const CORS_HEADERS = 'Authorization, Content-Type';

export function jsonError(message: string, status: number, headers?: Record<string, string>) {
  return Response.json({ error: message }, { status, headers });
}

const GENERIC_ERROR = 'Une erreur est survenue. Réessayez dans quelques minutes.';
const UNAVAILABLE = 'Le service est momentanément indisponible. Réessayez dans quelques minutes.';

/** Origines web autorisées : ALLOWED_ORIGINS (liste séparée par des virgules) et l'origine du serveur lui-même. */
export function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

/**
 * Les apps natives n'envoient pas d'en-tête Origin : elles passent. Un
 * navigateur doit venir de la même origine que le serveur ou d'ALLOWED_ORIGINS.
 */
export function isOriginAllowed(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    if (origin === new URL(request.url).origin) return true;
  } catch {
    // URL de requête inattendue : on s'en tient à la liste.
  }
  return allowedOrigins().includes(origin);
}

function finalize(request: Request, response: Response): Response {
  // Certaines réponses ont des en-têtes figés : on recopie dans une réponse neuve.
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  const origin = request.headers.get('origin');
  if (origin && isOriginAllowed(request)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', CORS_METHODS);
    headers.set('Access-Control-Allow-Headers', CORS_HEADERS);
    headers.set('Access-Control-Max-Age', '600');
  }
  headers.append('Vary', 'Origin');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/**
 * Enveloppe chaque route : refuse les origines web non autorisées, ajoute les
 * en-têtes de sécurité et transforme toute exception en message générique.
 */
export async function secure(request: Request, work: () => Promise<Response>): Promise<Response> {
  if (!isOriginAllowed(request)) return finalize(request, jsonError('Origine non autorisée.', 403));
  try {
    return finalize(request, await work());
  } catch (e) {
    if (e instanceof SessionUnavailable) {
      console.error('[api] SESSION_SECRET manquant en production');
      return finalize(request, jsonError(UNAVAILABLE, 503));
    }
    console.error('[api]', e);
    return finalize(request, jsonError(GENERIC_ERROR, 500));
  }
}

/** Réponse aux requêtes CORS préalables (OPTIONS). */
export function preflight(request: Request): Response {
  if (!request.headers.get('origin') || !isOriginAllowed(request)) return finalize(request, new Response(null, { status: 403 }));
  return finalize(request, new Response(null, { status: 204 }));
}

/** Utilisateur vérifié de la requête, ou réponse 401. */
export async function authenticate(request: Request): Promise<{ userId: string } | Response> {
  const session = await verifySession(bearerToken(request));
  if (!session) return jsonError('Session invalide ou expirée. Relancez l’app.', 401);
  return { userId: session.userId };
}

/** Compte la requête dans les limites de débit ; réponse 429 si elles sont dépassées. */
export async function rateLimit(request: Request, scope: RateScope, userId?: string): Promise<Response | null> {
  const retryAfter = await checkRateLimit(usageStore(), scope, { userId, ip: clientIp(request) });
  if (retryAfter === null) return null;
  const minutes = Math.ceil(retryAfter / 60);
  return jsonError(
    `Trop de demandes en peu de temps. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`,
    429,
    { 'Retry-After': String(retryAfter) },
  );
}

/** Droit requis par un appel IA : Premium, ou une fonction soumise au quota gratuit. */
export type Access = 'premium' | QuotaFeature;

const QUOTA_MESSAGES: Record<QuotaFeature, string> = {
  diagnose: 'Vous avez utilisé vos diagnostics gratuits du mois. Passez à Premium ou prenez un diagnostic à l’unité.',
  quote: 'Vous avez utilisé votre analyse de devis gratuite du mois. Passez à Premium pour continuer.',
  ct: 'Vous avez utilisé votre analyse de contrôle technique gratuite du mois. Passez à Premium pour continuer.',
};

async function reserve(userId: string, access: Access): Promise<Reservation | Response> {
  const entitlements = await getEntitlements(userId);
  if (access === 'premium') {
    if (entitlements.premium) return { source: 'premium', release: async () => undefined };
    return jsonError('Cette fonction fait partie de Premium.', 402);
  }
  const reservation = await reserveQuota(usageStore(), userId, access, entitlements);
  return reservation ?? jsonError(QUOTA_MESSAGES[access], 402);
}

/**
 * Exécute un appel IA pour un utilisateur vérifié : contrôle des droits,
 * réservation du quota, puis restitution si l'appel échoue.
 */
export async function runAi(userId: string, access: Access, work: () => Promise<unknown>): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) return jsonError('L’IA n’est pas configurée sur ce serveur.', 503);
  const reservation = await reserve(userId, access);
  if (reservation instanceof Response) return reservation;
  try {
    return Response.json(await work());
  } catch (e) {
    await reservation.release().catch((err) => console.error('[api] quota non restitué', err));
    if (e instanceof ClaudeError) return jsonError(e.message, e.status);
    console.error('[api] appel IA', e);
    return jsonError('L’IA est momentanément indisponible. Réessayez dans quelques minutes.', 502);
  }
}

/**
 * Route IA complète : session vérifiée, limite de débit, validation du corps,
 * droits puis appel à l'IA.
 */
export function aiRoute<T extends z.ZodType>(
  request: Request,
  schema: T,
  access: Access | ((input: z.infer<T>) => Access),
  work: (input: z.infer<T>) => Promise<unknown>,
): Promise<Response> {
  return secure(request, async () => {
    const auth = await authenticate(request);
    if (auth instanceof Response) return auth;
    const limited = await rateLimit(request, 'ai', auth.userId);
    if (limited) return limited;
    const input = await readJson(request, schema);
    if (input instanceof Response) return input;
    return runAi(auth.userId, typeof access === 'function' ? access(input) : access, () => work(input));
  });
}
