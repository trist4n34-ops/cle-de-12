/**
 * Avis sur les guides, agrégés dans le stockage des compteurs : nombre d'avis,
 * somme des notes et nombre de « réparé » par guide. Un utilisateur a un seul
 * avis par guide : un nouvel envoi remplace le précédent.
 */
import { GuideStats, guideStats, Outcome, OUTCOMES } from '@/lib/guide-feedback';
import type { UsageStore } from '@/server/usage-store';

const keys = (guideId: string) => ({
  count: `fb:${guideId}:n`,
  sum: `fb:${guideId}:sum`,
  fixed: `fb:${guideId}:fixed`,
});

/** L'avis précédent est gardé sous forme d'un nombre : note × 10 + rang du résultat (1 à 3). */
const encode = (rating: number, outcome: Outcome) => rating * 10 + OUTCOMES.indexOf(outcome) + 1;
const decode = (code: number) => ({ rating: Math.floor(code / 10), outcome: OUTCOMES[(code % 10) - 1] });

export async function recordFeedback(
  store: UsageStore,
  userId: string,
  input: { guideId: string; rating: number; outcome: Outcome },
): Promise<GuideStats> {
  const k = keys(input.guideId);
  const mine = `fb:u:${userId}:${input.guideId}`;
  const previous = await store.get(mine);
  const next = encode(input.rating, input.outcome);
  if (previous) {
    const old = decode(previous);
    await store.incr(k.sum, 0, input.rating - old.rating);
    const fixedDelta = (input.outcome === 'fixed' ? 1 : 0) - (old.outcome === 'fixed' ? 1 : 0);
    if (fixedDelta) await store.incr(k.fixed, 0, fixedDelta);
  } else {
    await store.incr(k.count, 0);
    await store.incr(k.sum, 0, input.rating);
    if (input.outcome === 'fixed') await store.incr(k.fixed, 0);
  }
  if (next !== previous) await store.incr(mine, 0, next - previous);
  return readStats(store, input.guideId);
}

export async function readStats(store: UsageStore, guideId: string): Promise<GuideStats> {
  const k = keys(guideId);
  const [count, sum, fixed] = await Promise.all([store.get(k.count), store.get(k.sum), store.get(k.fixed)]);
  return guideStats(count, sum, fixed);
}
