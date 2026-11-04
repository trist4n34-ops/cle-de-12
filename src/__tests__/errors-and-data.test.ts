import { afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { webcrypto } from 'node:crypto';

import { POST as deleteData } from '@/app/api/delete-data+api';
import { GUIDE_IDS } from '@/data/guides';
import { translate, translatePlural } from '@/i18n/core';
import { errorText } from '@/i18n/errors';
import { ApiError, errorFromResponse, shouldFallbackOffline } from '@/lib/api';
import { ERROR_CODES } from '@/lib/error-codes';
import { capTurns, putSaved } from '@/lib/saved-results';
import { readStats, recordFeedback } from '@/server/guide-feedback';
import { authenticate, jsonError, secure } from '@/server/http';
import { checkRateLimit, reserveQuota } from '@/server/limits';
import { DiagnoseInput, readJson } from '@/server/requests';
import { mintSession } from '@/server/session';
import { MemoryUsageStore, setUsageStore, UpstashUsageStore } from '@/server/usage-store';
import { deleteUserData } from '@/server/user-data';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'fr-FR', languageCode: 'fr' }] }));

beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  }
});

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
  setUsageStore(null);
});

const NOW = Date.UTC(2026, 10, 4, 12, 0, 0);
const en = {
  t: (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('en', key, params),
  tn: (key: Parameters<typeof translatePlural>[1], n: number) => translatePlural('en', key, n),
};

describe('codes d’erreur stables', () => {
  it('chaque erreur JSON du serveur porte un code', async () => {
    process.env = { ...env, SESSION_SECRET: 'test-secret-0123456789abcdef' };
    const res = jsonError('Origine non autorisée.', 403, 'origin_forbidden');
    expect(await res.json()).toEqual({ error: 'Origine non autorisée.', code: 'origin_forbidden' });

    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const crashed = await secure(new Request('https://cle12.test/api/x'), async () => {
      throw new Error('boom');
    });
    error.mockRestore();
    expect(((await crashed.json()) as { code: string }).code).toBe('server_error');

    const unauth = (await authenticate(new Request('https://cle12.test/api/x', { method: 'POST' }))) as Response;
    expect(((await unauth.json()) as { code: string }).code).toBe('session_invalid');

    const invalid = (await readJson(new Request('https://cle12.test/', { method: 'POST', body: '{oops' }), DiagnoseInput)) as Response;
    expect(await invalid.json()).toEqual({ error: 'Requête invalide.', code: 'invalid_request' });
  });

  it('l’ApiError garde le code et le délai Retry-After', () => {
    const limited = errorFromResponse(
      { status: 429, headers: new Headers({ 'Retry-After': '120' }) },
      { error: 'Trop de demandes', code: 'rate_limited' },
    );
    expect([limited.status, limited.code, limited.retryAfter, limited.message]).toEqual([429, 'rate_limited', 120, 'Trop de demandes']);
    // Passerelle sans corps JSON : panne générique.
    expect(errorFromResponse({ status: 502, headers: new Headers() }, null).code).toBe('server_error');
    expect(errorFromResponse({ status: 418, headers: new Headers() }, {}).code).toBeUndefined();
  });

  it('ne se rabat sur la base intégrée que sans réseau ou si le serveur est en panne', () => {
    expect(shouldFallbackOffline(new ApiError('', 0, 'offline'))).toBe(true);
    expect(shouldFallbackOffline(new ApiError('', 502, 'ai_unavailable'))).toBe(true);
    expect(shouldFallbackOffline(new ApiError('', 503, 'ai_not_configured'))).toBe(true);
    for (const status of [400, 401, 402, 413, 422, 429]) expect(shouldFallbackOffline(new ApiError('', status))).toBe(false);
  });

  it('traduit chaque code, sinon garde le texte du serveur', () => {
    for (const code of ERROR_CODES) {
      const text = errorText(new ApiError('texte serveur', 400, code), en);
      expect(text).not.toBe('texte serveur');
      expect(text).not.toContain('error.');
    }
    expect(errorText(new ApiError('x', 402, 'quota_quote'), en)).toBe(translate('en', 'error.quota_quote'));
    expect(errorText(new ApiError('x', 429, 'rate_limited', 90), en)).toBe(
      'Too many requests in a short time. Try again in 2 minutes.',
    );
    expect(errorText(new ApiError('Message du serveur', 400, 'nouveau_code'), en)).toBe('Message du serveur');
    expect(errorText(new Error('interne'), en, 'Fallback')).toBe('Fallback');
  });
});

describe('résultats gardés sur l’appareil', () => {
  it('borne le nombre de résultats en gardant les plus récents', () => {
    let map = putSaved(undefined, 'a', 1, 2, '2026-01-01');
    map = putSaved(map, 'b', 2, 2, '2026-01-02');
    map = putSaved(map, 'c', 3, 2, '2026-01-03');
    expect(Object.keys(map).sort()).toEqual(['b', 'c']);
    expect(putSaved(map, 'b', 9, 2, '2026-01-04').b).toEqual({ value: 9, at: '2026-01-04' });
  });

  it('borne la conversation et commence par une question', () => {
    const turns = Array.from({ length: 25 }, (_, i) => ({ role: i % 2 ? ('assistant' as const) : ('user' as const), content: 'x'.repeat(5000) }));
    const capped = capTurns(turns);
    expect(capped.length).toBeLessThanOrEqual(20);
    expect(capped[0].role).toBe('user');
    expect(capped.every((t) => t.content.length <= 4000)).toBe(true);
  });
});

describe('suppression des données serveur', () => {
  const free = { premium: false, creditsPurchased: 1 };

  it('efface les avis et recalcule les moyennes, garde quotas et crédits', async () => {
    const store = new MemoryUsageStore();
    await recordFeedback(store, 'moi', { guideId: 'vidange', rating: 1, outcome: 'fixed' });
    await recordFeedback(store, 'autre', { guideId: 'vidange', rating: 5, outcome: 'garage' });
    await recordFeedback(store, 'moi', { guideId: GUIDE_IDS[1], rating: 4, outcome: 'partial' });
    // Quota du mois précédent (encore vivant un jour) et du mois courant, plus un crédit consommé.
    await reserveQuota(store, 'moi', 'quote', free, Date.UTC(2026, 9, 31, 23));
    for (let i = 0; i < 4; i++) await reserveQuota(store, 'moi', 'diagnose', free, NOW);
    await reserveQuota(store, 'autre', 'quote', free, NOW);
    await checkRateLimit(store, 'ai', { userId: 'moi' }, NOW);

    expect(await deleteUserData(store, 'moi', GUIDE_IDS)).toEqual({ deleted: true });

    expect(await readStats(store, 'vidange')).toEqual({ count: 1, average: 5, fixedShare: 0 });
    expect((await readStats(store, GUIDE_IDS[1])).count).toBe(0);
    expect(await store.getMany(GUIDE_IDS.map((g) => `fb:u:moi:${g}`))).toEqual(GUIDE_IDS.map(() => 0));
    // Quotas et crédits restent : une suppression ne remet pas le quota gratuit à zéro.
    expect(await store.get('quota:diagnose:moi:2026-11')).toBe(3);
    expect(await store.get('credits-used:moi')).toBe(1);
    expect(await store.get('quota:quote:moi:2026-10')).toBe(1);
    // Les données des autres restent ; la limite de débit aussi.
    expect(await store.get('quota:quote:autre:2026-11')).toBe(1);
    expect(await store.get(`rl:ai:u:moi:${Math.floor(NOW / 1000 / 600)}`)).toBe(1);
    // Une seconde suppression ne change rien.
    await deleteUserData(store, 'moi', GUIDE_IDS);
    expect((await readStats(store, 'vidange')).count).toBe(1);
  });

  it('expose POST /api/delete-data, session requise', async () => {
    process.env = { ...env, SESSION_SECRET: 'test-secret-0123456789abcdef' };
    const store = new MemoryUsageStore();
    setUsageStore(store);
    const s = await mintSession(Date.now(), ['test-secret-0123456789abcdef']);
    await recordFeedback(store, s.userId, { guideId: 'vidange', rating: 3, outcome: 'fixed' });

    const anonymous = await deleteData(new Request('https://cle12.test/api/delete-data', { method: 'POST' }));
    expect(anonymous.status).toBe(401);

    const res = await deleteData(
      new Request('https://cle12.test/api/delete-data', { method: 'POST', headers: { Authorization: `Bearer ${s.token}` } }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });
    expect((await readStats(store, 'vidange')).count).toBe(0);
  });

  it('Upstash : MGET et DEL dans un pipeline', async () => {
    const bodies: unknown[] = [];
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      bodies.push(body);
      return Response.json(body[0][0] === 'MGET' ? [{ result: ['3', null] }] : [{ result: 2 }]);
    });
    const store = new UpstashUsageStore('https://redis.example', 'tok');
    expect(await store.getMany(['a', 'b'])).toEqual([3, 0]);
    await store.del(['a', 'b']);
    await store.del([]);
    fetchMock.mockRestore();
    expect(bodies).toEqual([[['MGET', 'a', 'b']], [['DEL', 'a', 'b']]]);
  });
});
