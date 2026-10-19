import { afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { webcrypto } from 'node:crypto';

// Les mêmes constantes que celles exportées par src/lib/store.tsx (qui les réexporte).
import { FREE_CT_REPORTS_PER_MONTH, FREE_DIAGNOSES_PER_MONTH, FREE_QUOTES_PER_MONTH } from '@/lib/quotas';
import { parseSubscriber } from '@/server/entitlements';
import { authenticate, preflight, secure } from '@/server/http';
import { checkRateLimit, clientIp, RATE_LIMITS, reserveQuota } from '@/server/limits';
import {
  ChatInput,
  CtInput,
  DiagnoseInput,
  imageMediaType,
  MAX_BODY_BYTES,
  MAX_PHOTO_BASE64,
  readJson,
} from '@/server/requests';
import { mintSession, sessionSecrets, SessionUnavailable, verifySession } from '@/server/session';
import { MemoryUsageStore, UpstashUsageStore } from '@/server/usage-store';

beforeAll(() => {
  // Web Crypto est global sur Node 19+ ; on le fournit si l'environnement de test ne l'expose pas.
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  }
});

const SECRETS = ['test-secret-0123456789abcdef'];
const NOW = Date.UTC(2026, 9, 19, 12, 0, 0);

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
});

describe('session signée', () => {
  it('crée un identifiant UUID et un jeton vérifiable', async () => {
    const s = await mintSession(NOW, SECRETS);
    expect(s.userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(s.token.split('.')).toHaveLength(2);
    expect(await verifySession(s.token, SECRETS)).toEqual({ userId: s.userId, issuedAt: Math.floor(NOW / 1000) });
  });

  it('tire un identifiant différent à chaque session', async () => {
    const [a, b] = await Promise.all([mintSession(NOW, SECRETS), mintSession(NOW, SECRETS)]);
    expect(a.userId).not.toBe(b.userId);
  });

  it('refuse un jeton dont l’identifiant a été modifié', async () => {
    const victim = await mintSession(NOW, SECRETS);
    const attacker = await mintSession(NOW, SECRETS);
    const [, signature] = attacker.token.split('.');
    const [payload] = victim.token.split('.');
    // Charge utile d'un autre utilisateur avec sa propre signature : refusé.
    expect(await verifySession(`${payload}.${signature}`, SECRETS)).toBeNull();
    // Charge utile forgée à la main avec l'identifiant de la victime.
    const forged = btoa(`${victim.userId}.${Math.floor(NOW / 1000)}`).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    expect(await verifySession(`${forged}.${signature}`, SECRETS)).toBeNull();
  });

  it('refuse une signature altérée ou un autre secret', async () => {
    const s = await mintSession(NOW, SECRETS);
    const last = s.token.slice(-1);
    const flipped = s.token.slice(0, -1) + (last === 'A' ? 'B' : 'A');
    expect(await verifySession(flipped, SECRETS)).toBeNull();
    expect(await verifySession(s.token, ['un-autre-secret'])).toBeNull();
  });

  it('accepte l’ancien secret pendant une rotation', async () => {
    const s = await mintSession(NOW, ['ancien']);
    expect(await verifySession(s.token, ['nouveau', 'ancien'])).not.toBeNull();
  });

  it('refuse les jetons mal formés', async () => {
    for (const bad of [null, undefined, '', 'abc', 'a.b.c', '.', 'a.', '.b', '!!!.???', 'x'.repeat(300), 'eyJ.' + 'A'.repeat(43)]) {
      expect(await verifySession(bad, SECRETS)).toBeNull();
    }
  });

  it('exige SESSION_SECRET en production', () => {
    process.env = { ...env, NODE_ENV: 'production' };
    delete process.env.SESSION_SECRET;
    expect(() => sessionSecrets()).toThrow(SessionUnavailable);
    process.env.SESSION_SECRET = 's3cret';
    expect(sessionSecrets()).toEqual(['s3cret']);
  });

  it('utilise un secret de développement en local', () => {
    process.env = { ...env, NODE_ENV: 'development' };
    delete process.env.SESSION_SECRET;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(sessionSecrets()).toHaveLength(1);
    warn.mockRestore();
  });
});

describe('authenticate', () => {
  it('répond 401 sans jeton valide et renvoie l’utilisateur sinon', async () => {
    process.env = { ...env, SESSION_SECRET: SECRETS[0] };
    const none = await authenticate(new Request('https://cle12.test/api/diagnose', { method: 'POST' }));
    expect(none).toBeInstanceOf(Response);
    expect((none as Response).status).toBe(401);

    const s = await mintSession(NOW, SECRETS);
    const ok = await authenticate(
      new Request('https://cle12.test/api/diagnose', { method: 'POST', headers: { Authorization: `Bearer ${s.token}` } }),
    );
    expect(ok).toEqual({ userId: s.userId });
  });
});

describe('quotas côté serveur', () => {
  const free = { premium: false, creditsPurchased: 0 };

  it('reprend les constantes de l’app', async () => {
    const store = new MemoryUsageStore();
    for (const [feature, limit] of [
      ['diagnose', FREE_DIAGNOSES_PER_MONTH],
      ['quote', FREE_QUOTES_PER_MONTH],
      ['ct', FREE_CT_REPORTS_PER_MONTH],
    ] as const) {
      for (let i = 0; i < limit; i++) expect((await reserveQuota(store, 'u1', feature, free, NOW))?.source).toBe('free');
      expect(await reserveQuota(store, 'u1', feature, free, NOW)).toBeNull();
    }
  });

  it('rend l’unité réservée quand l’appel IA échoue', async () => {
    const store = new MemoryUsageStore();
    for (let i = 0; i < FREE_DIAGNOSES_PER_MONTH - 1; i++) await reserveQuota(store, 'u1', 'diagnose', free, NOW);
    const last = await reserveQuota(store, 'u1', 'diagnose', free, NOW);
    expect(await reserveQuota(store, 'u1', 'diagnose', free, NOW)).toBeNull();
    await last!.release();
    expect(await reserveQuota(store, 'u1', 'diagnose', free, NOW)).not.toBeNull();
  });

  it('compte par utilisateur et repart le mois suivant', async () => {
    const store = new MemoryUsageStore();
    await reserveQuota(store, 'u1', 'quote', free, NOW);
    expect(await reserveQuota(store, 'u1', 'quote', free, NOW)).toBeNull();
    expect(await reserveQuota(store, 'u2', 'quote', free, NOW)).not.toBeNull();
    expect(await reserveQuota(store, 'u1', 'quote', free, Date.UTC(2026, 10, 1))).not.toBeNull();
  });

  it('laisse Premium sans limite', async () => {
    const store = new MemoryUsageStore();
    for (let i = 0; i < 10; i++) {
      expect((await reserveQuota(store, 'u1', 'ct', { premium: true, creditsPurchased: 0 }, NOW))?.source).toBe('premium');
    }
  });

  it('consomme les diagnostics achetés après le quota gratuit', async () => {
    const store = new MemoryUsageStore();
    const paid = { premium: false, creditsPurchased: 2 };
    const sources = [];
    for (let i = 0; i < FREE_DIAGNOSES_PER_MONTH + 3; i++) sources.push((await reserveQuota(store, 'u1', 'diagnose', paid, NOW))?.source ?? null);
    expect(sources).toEqual([...Array(FREE_DIAGNOSES_PER_MONTH).fill('free'), 'credit', 'credit', null]);
    // Les crédits ne servent qu'au diagnostic.
    await reserveQuota(store, 'u1', 'quote', paid, NOW);
    expect(await reserveQuota(store, 'u1', 'quote', paid, NOW)).toBeNull();
  });

  it('compte les achats consommables RevenueCat', () => {
    const body = {
      subscriber: {
        entitlements: { premium: { expires_date: '2020-01-01T00:00:00Z' } },
        non_subscriptions: { diag_unit: [{}, {}], autre: [{}] },
      },
    };
    expect(parseSubscriber(body, new Date(NOW))).toEqual({ premium: false, creditsPurchased: 2 });
  });

  it('fait expirer les compteurs du stockage en mémoire', async () => {
    let t = 0;
    const store = new MemoryUsageStore(() => t);
    await store.incr('k', 10);
    expect(await store.get('k')).toBe(1);
    t = 11_000;
    expect(await store.get('k')).toBe(0);
  });
});

describe('UpstashUsageStore', () => {
  it('envoie SET NX EX puis INCRBY dans un pipeline authentifié', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      return Response.json([{ result: 'OK' }, { result: 4 }]);
    });
    const store = new UpstashUsageStore('https://redis.example/', 'tok');
    expect(await store.incr('quota:x', 60)).toBe(4);
    fetchMock.mockRestore();
    expect(calls[0].url).toBe('https://redis.example/pipeline');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(String(calls[0].init.body))).toEqual([
      ['SET', 'quota:x', 0, 'EX', 60, 'NX'],
      ['INCRBY', 'quota:x', 1],
    ]);
  });

  it('lève une erreur si Upstash répond une erreur', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json([{ error: 'WRONGTYPE' }]));
    await expect(new UpstashUsageStore('https://redis.example', 'tok').get('k')).rejects.toThrow('WRONGTYPE');
    fetchMock.mockRestore();
  });
});

describe('limites de débit', () => {
  it('bloque un utilisateur au-delà de la limite et donne Retry-After', async () => {
    const store = new MemoryUsageStore();
    const { user, windowSeconds } = RATE_LIMITS.ai;
    for (let i = 0; i < user; i++) expect(await checkRateLimit(store, 'ai', { userId: 'u1' }, NOW)).toBeNull();
    const retry = await checkRateLimit(store, 'ai', { userId: 'u1' }, NOW);
    expect(retry).toBeGreaterThan(0);
    expect(retry).toBeLessThanOrEqual(windowSeconds);
    expect(await checkRateLimit(store, 'ai', { userId: 'u2' }, NOW)).toBeNull();
    expect(await checkRateLimit(store, 'ai', { userId: 'u1' }, NOW + windowSeconds * 1000)).toBeNull();
  });

  it('bloque une IP qui multiplie les utilisateurs', async () => {
    const store = new MemoryUsageStore();
    const { ip } = RATE_LIMITS.ai;
    for (let i = 0; i < ip; i++) expect(await checkRateLimit(store, 'ai', { userId: `u${i}`, ip: '1.2.3.4' }, NOW)).toBeNull();
    expect(await checkRateLimit(store, 'ai', { userId: 'nouveau', ip: '1.2.3.4' }, NOW)).not.toBeNull();
    expect(await checkRateLimit(store, 'ai', { userId: 'nouveau', ip: '5.6.7.8' }, NOW)).toBeNull();
  });

  it('limite la création de sessions par IP', async () => {
    const store = new MemoryUsageStore();
    for (let i = 0; i < RATE_LIMITS.session.ip; i++) expect(await checkRateLimit(store, 'session', { ip: '1.2.3.4' }, NOW)).toBeNull();
    expect(await checkRateLimit(store, 'session', { ip: '1.2.3.4' }, NOW)).not.toBeNull();
  });

  it('lit l’IP du client', () => {
    const req = (headers: Record<string, string>) => new Request('https://cle12.test/', { headers });
    expect(clientIp(req({ 'cf-connecting-ip': '9.9.9.9', 'x-forwarded-for': '1.1.1.1' }))).toBe('9.9.9.9');
    expect(clientIp(req({ 'x-forwarded-for': '1.1.1.1, 10.0.0.1' }))).toBe('1.1.1.1');
    expect(clientIp(req({}))).toBeNull();
  });
});

describe('limites des requêtes', () => {
  const vehicle = { make: 'Peugeot', model: '208', year: '2018', mileage: '90000', engine: '1.2 PureTech', fuel: 'Essence' };
  const diag = { vehicle, symptoms: 'broute', symptomTags: [], codes: ['P0301'] };
  const JPEG = '/9j/4AAQSkZJRgABAQ==';
  const PNG = 'iVBORw0KGgoAAAANSUhEUg==';

  it('borne les symptômes et les codes', () => {
    expect(DiagnoseInput.safeParse(diag).success).toBe(true);
    expect(DiagnoseInput.safeParse({ ...diag, symptoms: 'a'.repeat(2000) }).success).toBe(true);
    expect(DiagnoseInput.safeParse({ ...diag, symptoms: 'a'.repeat(2001) }).success).toBe(false);
    expect(DiagnoseInput.safeParse({ ...diag, codes: Array(20).fill('P0301') }).success).toBe(true);
    expect(DiagnoseInput.safeParse({ ...diag, codes: Array(21).fill('P0301') }).success).toBe(false);
    expect(DiagnoseInput.safeParse({ ...diag, codes: ['p0301'] }).success).toBe(false);
    expect(DiagnoseInput.safeParse({ ...diag, codes: ['P4301'] }).success).toBe(false);
  });

  it('n’accepte que des photos JPEG ou PNG de taille raisonnable', () => {
    expect(imageMediaType(JPEG)).toBe('image/jpeg');
    expect(imageMediaType(PNG)).toBe('image/png');
    expect(CtInput.safeParse({ vehicle, photo: JPEG }).success).toBe(true);
    expect(CtInput.safeParse({ vehicle, photo: PNG }).success).toBe(true);
    expect(CtInput.safeParse({ vehicle, photo: btoa('GIF89a......') }).success).toBe(false);
    expect(CtInput.safeParse({ vehicle, photo: btoa('<svg onload=alert(1)>') }).success).toBe(false);
    expect(CtInput.safeParse({ vehicle, photo: 'pas du base64 !' }).success).toBe(false);
    const huge = JPEG + 'A'.repeat(MAX_PHOTO_BASE64 - JPEG.length + 4);
    expect(CtInput.safeParse({ vehicle, photo: huge }).success).toBe(false);
    expect(DiagnoseInput.safeParse({ ...diag, photo: btoa('MZ executable') }).success).toBe(false);
  });

  it('borne la conversation', () => {
    const turns = (n: number, len = 10) =>
      Array.from({ length: n }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'a'.repeat(len) }));
    const chat = (messages: unknown) => ChatInput.safeParse({ vehicle, context: '', messages });
    expect(chat(turns(11)).success).toBe(true);
    expect(chat(turns(13)).success).toBe(false);
    expect(chat([{ role: 'user', content: 'a'.repeat(2000) }]).success).toBe(true);
    expect(chat([{ role: 'user', content: 'a'.repeat(2001) }]).success).toBe(false);
  });

  it('refuse un corps trop volumineux', async () => {
    const big = new Request('https://cle12.test/api/diagnose', {
      method: 'POST',
      body: JSON.stringify({ ...diag, symptoms: 'a'.repeat(MAX_BODY_BYTES) }),
    });
    const res = await readJson(big, DiagnoseInput);
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(413);

    const broken = await readJson(new Request('https://cle12.test/', { method: 'POST', body: '{oops' }), DiagnoseInput);
    expect((broken as Response).status).toBe(400);
  });
});

describe('en-têtes et CORS', () => {
  it('ajoute les en-têtes de sécurité et masque les erreurs internes', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await secure(new Request('https://cle12.test/api/x'), async () => {
      throw new Error('mot de passe de la base : hunter2');
    });
    error.mockRestore();
    expect(res.status).toBe(500);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    expect(JSON.stringify(await res.json())).not.toContain('hunter2');
  });

  it('laisse passer les apps natives, la même origine et ALLOWED_ORIGINS seulement', async () => {
    process.env = { ...env, ALLOWED_ORIGINS: 'https://cle12.fr, https://www.cle12.fr' };
    const ok = async () => Response.json({ ok: true });
    const req = (origin?: string) => new Request('https://api.cle12.test/api/x', { headers: origin ? { Origin: origin } : {} });

    expect((await secure(req(), ok)).status).toBe(200);
    expect((await secure(req(), ok)).headers.get('access-control-allow-origin')).toBeNull();

    const allowed = await secure(req('https://cle12.fr'), ok);
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://cle12.fr');

    expect((await secure(req('https://api.cle12.test'), ok)).status).toBe(200);
    expect((await secure(req('https://evil.example'), ok)).status).toBe(403);
    expect(preflight(req('https://evil.example')).status).toBe(403);
    expect(preflight(req('https://www.cle12.fr')).status).toBe(204);
  });
});
