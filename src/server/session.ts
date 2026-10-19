/**
 * Session signée par le serveur. L'identifiant utilisateur est tiré au sort
 * ici (jamais par l'app) puis signé en HMAC-SHA256 avec SESSION_SECRET :
 *
 *   token = base64url(userId + "." + issuedAt) + "." + base64url(HMAC(partie 1))
 *
 * Seul le serveur peut produire un jeton valide : connaître l'identifiant d'un
 * abonné ne suffit plus à se faire passer pour lui. Web Crypto (`crypto.subtle`)
 * fonctionne sur EAS Hosting (workers) comme sur Node 18+.
 *
 * Le jeton n'expire pas : l'identifiant est aussi l'appUserID RevenueCat, en
 * changer ferait perdre les achats. Pour changer de secret sans déconnecter tout
 * le monde, mettez l'ancien dans SESSION_SECRET_PREVIOUS le temps de la transition.
 */

export type Session = { userId: string; token: string };
export type VerifiedSession = { userId: string; issuedAt: number };

const DEV_SECRET = 'cle12-dev-only-secret-do-not-use-in-production';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const B64URL = /^[A-Za-z0-9_-]+$/;
const MAX_TOKEN_LENGTH = 256;

const encoder = new TextEncoder();
let warned = false;

/** Secret absent en production : les routes répondent 503. */
export class SessionUnavailable extends Error {}

/** Secrets acceptés, le premier sert à signer. */
export function sessionSecrets(): string[] {
  const current = process.env.SESSION_SECRET;
  const previous = process.env.SESSION_SECRET_PREVIOUS;
  if (current) return previous ? [current, previous] : [current];
  if (process.env.NODE_ENV === 'production') throw new SessionUnavailable('SESSION_SECRET manquant');
  if (!warned) {
    warned = true;
    console.warn('[session] SESSION_SECRET absent : secret de développement utilisé. Ne déployez jamais ainsi.');
  }
  return [DEV_SECRET];
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!B64URL.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

const keys = new Map<string, Promise<CryptoKey>>();
function hmacKey(secret: string): Promise<CryptoKey> {
  let key = keys.get(secret);
  if (!key) {
    key = crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    keys.set(secret, key);
  }
  return key;
}

async function sign(payload: string, secret: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload)));
}

/** Comparaison en temps constant (pour des longueurs égales). */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Crée un nouvel utilisateur et son jeton. */
export async function mintSession(now: number = Date.now(), secrets: string[] = sessionSecrets()): Promise<Session> {
  const userId = crypto.randomUUID();
  const issuedAt = Math.floor(now / 1000);
  const payload = toBase64Url(encoder.encode(`${userId}.${issuedAt}`));
  const signature = toBase64Url(await sign(payload, secrets[0]));
  return { userId, token: `${payload}.${signature}` };
}

/** Renvoie l'utilisateur du jeton, ou null si le jeton est mal formé ou falsifié. */
export async function verifySession(
  token: string | null | undefined,
  secrets: string[] = sessionSecrets(),
): Promise<VerifiedSession | null> {
  if (typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signaturePart] = parts;
  const signature = fromBase64Url(signaturePart);
  if (!payload || !signature || signature.length !== 32) return null;

  let valid = false;
  for (const secret of secrets) {
    // Pas de sortie anticipée : chaque secret est essayé.
    if (timingSafeEqual(await sign(payload, secret), signature)) valid = true;
  }
  if (!valid) return null;

  const decoded = fromBase64Url(payload);
  if (!decoded) return null;
  const match = new TextDecoder().decode(decoded).match(/^([0-9a-f-]{36})\.(\d{1,12})$/);
  if (!match || !UUID.test(match[1])) return null;
  return { userId: match[1], issuedAt: Number(match[2]) };
}

/** Lit `Authorization: Bearer <jeton>`. */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}
