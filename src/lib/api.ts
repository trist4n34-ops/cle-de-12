/**
 * Appels aux routes `/api` du serveur Clé de 12. Sur mobile, les URL relatives
 * pointent vers l'origine déclarée dans app.json (plugin expo-router).
 *
 * Chaque appel porte `Authorization: Bearer <jeton>`, le jeton d'une session
 * créée par le serveur (/api/session) et gardée dans le store. Sans réseau, les
 * appels échouent avec une ApiError de statut 0 et les écrans basculent sur la
 * base intégrée.
 */
import { currentLanguage } from '@/i18n/core';
import type { CtReport } from '@/lib/ct';
import type { Diagnosis, DiagnosisRequest, Vehicle } from '@/lib/diagnosis';
import { type GuideFeedback, type GuideStats, MAX_FEEDBACK_COMMENT } from '@/lib/guide-feedback';
import type { QuoteReview } from '@/lib/quote';
import type { RepairPlan } from '@/lib/repair-plan';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Code stable du serveur (src/lib/error-codes.ts), traduit par `errorText`. */
    readonly code?: string,
    /** Attente demandée par le serveur (en-tête Retry-After), en secondes. */
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

/**
 * Faut-il se rabattre sur la base intégrée ? Oui sans réseau (statut 0), si
 * le serveur est en panne (5xx) ou pour une erreur inattendue. Non pour un
 * refus explicite (402 quota, 429 débit, 401 session, 400 requête…).
 */
export function shouldFallbackOffline(e: unknown): boolean {
  if (!(e instanceof ApiError)) return true;
  return e.status === 0 || e.status >= 500;
}

type ErrorBody = { error?: unknown; code?: unknown };

/** ApiError d'une réponse en échec, avec le code et le Retry-After du serveur. */
export function errorFromResponse(res: Pick<Response, 'status' | 'headers'>, body: unknown): ApiError {
  const b = (body && typeof body === 'object' ? body : {}) as ErrorBody;
  const message = typeof b.error === 'string' ? b.error : `Erreur ${res.status}`;
  // Réponse sans corps exploitable (proxy, passerelle) : panne générique côté serveur.
  const code = typeof b.code === 'string' ? b.code : typeof b.error !== 'string' && res.status >= 500 ? 'server_error' : undefined;
  const retry = Number(res.headers.get('retry-after'));
  return new ApiError(message, res.status, code, Number.isFinite(retry) && retry > 0 ? retry : undefined);
}

export type ApiSession = { userId: string; token: string };

let session: ApiSession | null = null;
let saveSession: ((s: ApiSession) => void) | null = null;
let minting: Promise<ApiSession> | null = null;

/** Branche la session gardée dans le store, et la façon d'y enregistrer une session neuve. */
export function setApiSession(initial: ApiSession | undefined, save: (s: ApiSession) => void) {
  if (initial?.token && initial.userId) session = initial;
  saveSession = save;
}

/** Oublie la session (après « Supprimer mes données ») : le prochain appel en crée une neuve. */
export function clearApiSession() {
  session = null;
}

const OFFLINE = 'Pas de connexion au serveur.';

async function readBody(res: Response): Promise<unknown> {
  return res.json().catch(() => ({}));
}

async function mint(): Promise<ApiSession> {
  let res: Response;
  try {
    res = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  } catch {
    throw new ApiError(OFFLINE, 0, 'offline');
  }
  const body = (await readBody(res)) as Partial<ApiSession> & { error?: string };
  if (!res.ok) throw errorFromResponse(res, body);
  if (typeof body.userId !== 'string' || typeof body.token !== 'string') throw new ApiError('Réponse du serveur invalide.', 502, 'bad_response');
  const next = { userId: body.userId, token: body.token };
  session = next;
  saveSession?.(next);
  return next;
}

/** Renvoie la session courante, ou en crée une auprès du serveur (une seule fois à la fois). */
export function ensureSession(): Promise<ApiSession> {
  if (session) return Promise.resolve(session);
  minting ??= mint().finally(() => {
    minting = null;
  });
  return minting;
}

async function call<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const { token } = await ensureSession();
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers, Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError(OFFLINE, 0, 'offline');
  }
  if (res.status === 401 && retry) {
    // Jeton refusé (secret changé, données abîmées) : nouvelle session, un seul nouvel essai.
    if (session?.token === token) session = null;
    return call<T>(path, init, false);
  }
  const body = await readBody(res);
  if (!res.ok) throw errorFromResponse(res, body);
  return body as T;
}

/** Chaque appel POST porte la langue de l'app, pour que l'IA réponde dans cette langue. */
const post = <T>(path: string, body: object) =>
  call<T>(path, { method: 'POST', body: JSON.stringify({ ...body, language: currentLanguage() }) });

type VehicleInput = Omit<Vehicle, 'id'>;
export const stripId = ({ id: _id, ...v }: Vehicle): VehicleInput => v;

/** Limites du serveur (src/server/requests.ts). */
const MAX_SYMPTOMS = 2000;
const MAX_CODES = 20;
const MAX_CHAT_MESSAGES = 12;
const MAX_CHAT_MESSAGE = 2000;

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

/** Garde les derniers échanges, en commençant par un message de l'utilisateur. */
function recentMessages(messages: ChatMessage[]): ChatMessage[] {
  const recent = messages.slice(-MAX_CHAT_MESSAGES);
  while (recent.length > 1 && recent[0].role !== 'user') recent.shift();
  return recent.map((m) => (m.role === 'assistant' ? { ...m, content: m.content.slice(0, MAX_CHAT_MESSAGE) } : m));
}

export const api = {
  diagnose: (req: DiagnosisRequest) =>
    post<Diagnosis>('/api/diagnose', { ...req, symptoms: req.symptoms.slice(0, MAX_SYMPTOMS), codes: req.codes.slice(0, MAX_CODES) }),
  repairPlan: (vehicle: VehicleInput, repair: string, context: string) =>
    post<RepairPlan>('/api/repair-plan', { vehicle, repair, context: context.slice(0, 4000) }),
  chat: (vehicle: VehicleInput, context: string, messages: ChatMessage[]) =>
    post<{ text: string }>('/api/chat', { vehicle, context: context.slice(0, 6000), messages: recentMessages(messages) }),
  quote: (vehicle: VehicleInput, photo: string, context?: string) =>
    post<QuoteReview>('/api/quote', { vehicle, photo, context: context?.slice(0, 4000) }),
  ct: (vehicle: VehicleInput, photo: string) => post<CtReport>('/api/ct', { vehicle, photo }),
  plate: (plate: string) =>
    call<Omit<Vehicle, 'id' | 'mileage'>>(`/api/vehicle?plate=${encodeURIComponent(plate)}`),
  guideStats: (guideId: string) => call<GuideStats>(`/api/guide-feedback?guide=${encodeURIComponent(guideId)}`),
  guideFeedback: (guideId: string, f: GuideFeedback) =>
    post<GuideStats>('/api/guide-feedback', {
      guideId,
      rating: f.rating,
      outcome: f.outcome,
      difficulty: f.difficulty,
      comment: f.comment?.slice(0, MAX_FEEDBACK_COMMENT) || undefined,
    }),
  platePhoto: (photo: string) =>
    post<{ plate: string; confidence: 'haute' | 'moyenne' | 'basse'; vehicle: Omit<Vehicle, 'id' | 'mileage'> | null }>(
      '/api/plate-photo',
      { photo },
    ),
  /** Supprime les données gardées par le serveur pour cette session (quotas, crédits consommés, avis). */
  deleteMyData: () => post<{ deleted: true }>('/api/delete-data', {}),
};
