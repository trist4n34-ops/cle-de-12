/**
 * Compteurs côté serveur (quotas gratuits, crédits consommés, limites de débit).
 *
 * - En production : Upstash Redis via son API REST (simple `fetch`, aucune
 *   dépendance), configurée par UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN.
 * - Sans ces variables : un stockage en mémoire, propre à chaque instance du
 *   serveur et vidé à chaque redémarrage. Sur EAS Hosting (plusieurs workers),
 *   les quotas ne sont alors PAS fiables : ce repli ne sert qu'au développement.
 */

export interface UsageStore {
  /**
   * Ajoute `by` (1 par défaut, négatif pour rendre une unité) au compteur `key`
   * et renvoie la nouvelle valeur. `ttlSeconds` fixe l'expiration à la création
   * du compteur (0 : jamais).
   */
  incr(key: string, ttlSeconds: number, by?: number): Promise<number>;
  /** Valeur courante du compteur, 0 s'il n'existe pas. */
  get(key: string): Promise<number>;
}

/** Stockage en mémoire, par instance : développement et tests uniquement. */
export class MemoryUsageStore implements UsageStore {
  private entries = new Map<string, { value: number; expiresAt: number | null }>();

  constructor(private readonly now: () => number = Date.now) {}

  private live(key: string) {
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt !== null && entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  private sweep() {
    if (this.entries.size < 10_000) return;
    const t = this.now();
    for (const [key, entry] of this.entries) if (entry.expiresAt !== null && entry.expiresAt <= t) this.entries.delete(key);
  }

  async incr(key: string, ttlSeconds: number, by = 1): Promise<number> {
    this.sweep();
    const entry = this.live(key) ?? { value: 0, expiresAt: ttlSeconds > 0 ? this.now() + ttlSeconds * 1000 : null };
    entry.value += by;
    this.entries.set(key, entry);
    return entry.value;
  }

  async get(key: string): Promise<number> {
    return this.live(key)?.value ?? 0;
  }
}

type UpstashResult = { result?: unknown; error?: string };

/** Upstash Redis par l'API REST (pipeline). */
export class UpstashUsageStore implements UsageStore {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private async pipeline(commands: (string | number)[][]): Promise<UpstashResult[]> {
    const res = await fetch(`${this.url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
    });
    if (!res.ok) throw new Error(`Upstash : HTTP ${res.status}`);
    const results = (await res.json()) as UpstashResult[];
    const failed = results.find((r) => r.error);
    if (failed) throw new Error(`Upstash : ${failed.error}`);
    return results;
  }

  async incr(key: string, ttlSeconds: number, by = 1): Promise<number> {
    // SET NX EX crée le compteur avec son expiration ; INCRBY conserve ensuite le TTL.
    const commands: (string | number)[][] =
      ttlSeconds > 0 ? [['SET', key, 0, 'EX', ttlSeconds, 'NX'], ['INCRBY', key, by]] : [['INCRBY', key, by]];
    const results = await this.pipeline(commands);
    return Number(results[results.length - 1].result);
  }

  async get(key: string): Promise<number> {
    const [r] = await this.pipeline([['GET', key]]);
    return r.result == null ? 0 : Number(r.result);
  }
}

let store: UsageStore | null = null;

export function usageStore(): UsageStore {
  if (store) return store;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    store = new UpstashUsageStore(url, token);
  } else {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[usage-store] UPSTASH_REDIS_REST_URL/TOKEN absents : quotas et limites en mémoire, par instance, non fiables en production.');
    }
    store = new MemoryUsageStore();
  }
  return store;
}

/** Pour les tests : remplace le stockage utilisé par les routes. */
export function setUsageStore(next: UsageStore | null) {
  store = next;
}
