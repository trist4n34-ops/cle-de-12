/**
 * Limites appliquées côté serveur, sur l'identifiant vérifié de la session :
 * - quotas gratuits par mois civil (UTC), les constantes FREE_* exportées par
 *   src/lib/store.tsx (définies dans src/lib/quotas.ts, sans dépendance native) ;
 * - diagnostics achetés à l'unité, vérifiés auprès de RevenueCat ;
 * - limites de débit par utilisateur et par adresse IP.
 *
 * Les quotas sont réservés avant l'appel à l'IA (incrément atomique) puis rendus
 * si l'appel échoue : seuls les appels réussis comptent, et deux requêtes
 * simultanées ne peuvent pas dépasser le quota.
 */
import { FREE_CT_REPORTS_PER_MONTH, FREE_DIAGNOSES_PER_MONTH, FREE_QUOTES_PER_MONTH } from '@/lib/quotas';
import type { Entitlements } from '@/server/entitlements';
import type { UsageStore } from '@/server/usage-store';

export type QuotaFeature = 'diagnose' | 'quote' | 'ct';

export const FREE_LIMITS: Record<QuotaFeature, number> = {
  diagnose: FREE_DIAGNOSES_PER_MONTH,
  quote: FREE_QUOTES_PER_MONTH,
  ct: FREE_CT_REPORTS_PER_MONTH,
};

const DAY = 86_400;

/** "2026-10", en UTC comme le compteur de l'app. */
export const monthKey = (now: number) => new Date(now).toISOString().slice(0, 7);

/** Secondes jusqu'au début du mois suivant, plus un jour de marge. */
function secondsToNextMonth(now: number) {
  const d = new Date(now);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  return Math.ceil((next - now) / 1000) + DAY;
}

export type Reservation = { source: 'premium' | 'free' | 'credit'; release: () => Promise<void> };

const noop = async () => undefined;

/**
 * Réserve une utilisation de `feature`, ou renvoie null si le quota gratuit et
 * les crédits achetés sont épuisés.
 */
export async function reserveQuota(
  store: UsageStore,
  userId: string,
  feature: QuotaFeature,
  entitlements: Entitlements,
  now: number = Date.now(),
): Promise<Reservation | null> {
  if (entitlements.premium) return { source: 'premium', release: noop };

  const monthly = `quota:${feature}:${userId}:${monthKey(now)}`;
  const ttl = secondsToNextMonth(now);
  if ((await store.incr(monthly, ttl)) <= FREE_LIMITS[feature]) {
    return { source: 'free', release: () => store.incr(monthly, ttl, -1).then(noop) };
  }
  await store.incr(monthly, ttl, -1);

  // Diagnostics achetés à l'unité : achats vérifiés moins crédits déjà consommés.
  if (feature === 'diagnose' && entitlements.creditsPurchased > 0) {
    const used = `credits-used:${userId}`;
    if ((await store.incr(used, 0)) <= entitlements.creditsPurchased) {
      return { source: 'credit', release: () => store.incr(used, 0, -1).then(noop) };
    }
    await store.incr(used, 0, -1);
  }
  return null;
}

export type RateScope = 'ai' | 'plate' | 'session';

/** Requêtes autorisées par fenêtre. `user: 0` : pas de limite par utilisateur. */
export const RATE_LIMITS: Record<RateScope, { windowSeconds: number; user: number; ip: number }> = {
  ai: { windowSeconds: 600, user: 20, ip: 60 },
  plate: { windowSeconds: 600, user: 10, ip: 30 },
  // Chaque session neuve a droit au quota gratuit : la création est limitée par IP.
  session: { windowSeconds: 3600, user: 0, ip: 10 },
};

/**
 * Compte la requête et renvoie null si elle passe, sinon le nombre de secondes
 * à attendre (en-tête Retry-After).
 */
export async function checkRateLimit(
  store: UsageStore,
  scope: RateScope,
  ids: { userId?: string | null; ip?: string | null },
  now: number = Date.now(),
): Promise<number | null> {
  const { windowSeconds, user, ip } = RATE_LIMITS[scope];
  const window = Math.floor(now / 1000 / windowSeconds);
  const retryAfter = Math.max(1, (window + 1) * windowSeconds - Math.floor(now / 1000));
  const checks: [string, number][] = [];
  if (ids.userId && user > 0) checks.push([`rl:${scope}:u:${ids.userId}:${window}`, user]);
  if (ids.ip && ip > 0) checks.push([`rl:${scope}:ip:${ids.ip}:${window}`, ip]);
  let limited = false;
  for (const [key, max] of checks) {
    if ((await store.incr(key, windowSeconds)) > max) limited = true;
  }
  return limited ? retryAfter : null;
}

/** IP du client : Cloudflare (EAS Hosting) d'abord, puis le premier saut de X-Forwarded-For. */
export function clientIp(request: Request): string | null {
  const cf = request.headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf.slice(0, 64);
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded ? forwarded.slice(0, 64) : null;
}
