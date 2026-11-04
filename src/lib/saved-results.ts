/**
 * Résultats d'IA gardés sur l'appareil (analyse de devis, de PV, plans de
 * réparation, conversation) : on les retrouve en revenant sur l'écran. Les
 * tailles sont bornées pour que l'état persisté reste léger.
 */

export type Saved<T> = { value: T; at: string };
export type SavedMap<T> = Record<string, Saved<T>>;

/** Dernière analyse de devis / de PV gardée par véhicule. */
export const MAX_SAVED_ANALYSES = 10;
/** Plans de réparation gardés, tous véhicules confondus. */
export const MAX_SAVED_PLANS = 30;
/** Messages de conversation gardés par diagnostic. */
export const MAX_CHAT_TURNS = 20;
/** Longueur gardée par message. */
export const MAX_CHAT_TURN_LENGTH = 4000;

/** Ajoute (ou remplace) `key`, puis ne garde que les `max` plus récents. */
export function putSaved<T>(
  map: SavedMap<T> | undefined,
  key: string,
  value: T,
  max: number,
  at = new Date().toISOString(),
): SavedMap<T> {
  const entries = Object.entries({ ...map, [key]: { value, at } });
  entries.sort(([, a], [, b]) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return Object.fromEntries(entries.slice(0, Math.max(0, max)));
}

export function removeSaved<T>(map: SavedMap<T> | undefined, key: string): SavedMap<T> {
  const { [key]: _removed, ...rest } = map ?? {};
  return rest;
}

/** Clé d'un plan de réparation : un véhicule et une réparation (cause ou guide). */
export function planKey(vehicleId: string, repair: string): string {
  return `${vehicleId}|${repair.trim().toLowerCase()}`;
}

export const guidePlanKey = (vehicleId: string, guideId: string) => planKey(vehicleId, `guide:${guideId}`);

type Turn = { role: 'user' | 'assistant'; content: string };

/** Derniers messages d'une conversation, chacun raccourci, en commençant par une question. */
export function capTurns<T extends Turn>(turns: T[], max = MAX_CHAT_TURNS, maxLength = MAX_CHAT_TURN_LENGTH): T[] {
  const recent = turns.slice(-max);
  while (recent.length && recent[0].role !== 'user') recent.shift();
  return recent.map((t) => (t.content.length > maxLength ? { ...t, content: t.content.slice(0, maxLength) } : t));
}
