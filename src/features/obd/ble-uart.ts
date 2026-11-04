/**
 * Choix de la liaison série d'un dongle ELM327 BLE, sans dépendance native
 * (testable). Un dongle expose plusieurs services GATT : sur Android, le
 * service générique « Service Changed » (0x1801) arrive souvent en premier et
 * a lui aussi une caractéristique « indicate ». On privilégie donc les services
 * UART connus et on prend l'écriture et la lecture dans le même service.
 */

/** Services UART des dongles OBD2 BLE, par ordre de préférence. */
export const KNOWN_SERVICES = [
  'fff0', // Vgate iCar Pro, Veepeak, la plupart des clones
  'ffe0', // HM-10 et dérivés (Konnwei, clones « OBDII »)
  '18f0', // Vgate vLinker, OBDLink CX
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Vgate iCar Pro BLE 4.0 (iOS)
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
] as const;

/** Services standard qui ne transportent jamais la liaison série. */
const GENERIC_SERVICES = new Set(['1800', '1801', '180a', '180f']);

export const NAME_HINT = /obd|elm|vgate|veepeak|icar|konnwei|v-link|vlink|ios-vlink|carly|scan/i;

const BASE_SUFFIX = '-0000-1000-8000-00805f9b34fb';

/** UUID normalisé : la forme courte (« fff0 ») pour les UUID 16 bits du Bluetooth SIG, sinon la forme longue en minuscules. */
export function shortUuid(uuid: string): string {
  const u = uuid.trim().toLowerCase();
  if (/^[0-9a-f]{4}$/.test(u)) return u;
  if (/^[0-9a-f]{8}$/.test(u) && u.startsWith('0000')) return u.slice(4);
  if (u.endsWith(BASE_SUFFIX) && u.startsWith('0000')) return u.slice(4, 8);
  return u;
}

const knownRank = (uuid: string) => KNOWN_SERVICES.indexOf(shortUuid(uuid) as (typeof KNOWN_SERVICES)[number]);

export const isKnownService = (uuid: string) => knownRank(uuid) >= 0;
export const isGenericService = (uuid: string) => GENERIC_SERVICES.has(shortUuid(uuid));

/** Un appareil vu au scan ressemble-t-il à un dongle OBD2 ? */
export function looksLikeDongle(serviceUUIDs: readonly string[] | null | undefined, name: string | null | undefined): boolean {
  return (serviceUUIDs ?? []).some(isKnownService) || NAME_HINT.test(name ?? '');
}

/** Forme minimale d'une caractéristique (compatible avec `Characteristic` de react-native-ble-plx). */
export type CharLike = {
  uuid: string;
  isWritableWithResponse: boolean;
  isWritableWithoutResponse: boolean;
  isNotifiable: boolean;
  isIndicatable: boolean;
};

export type ServiceLike<C extends CharLike = CharLike> = { uuid: string; characteristics: C[] };

export type UartPair<C extends CharLike> = { service: string; writer: C; reader: C };

const writable = (c: CharLike) => c.isWritableWithResponse || c.isWritableWithoutResponse;
const readable = (c: CharLike) => c.isNotifiable || c.isIndicatable;

function pairIn<C extends CharLike>(s: ServiceLike<C>): UartPair<C> | null {
  // Notification plutôt qu'indication : c'est ce qu'utilisent les ELM327.
  const reader = s.characteristics.find((c) => c.isNotifiable) ?? s.characteristics.find(readable);
  const writer = s.characteristics.find(writable);
  return reader && writer ? { service: s.uuid, writer, reader } : null;
}

/**
 * Écriture et lecture du dongle, prises dans un même service : d'abord les
 * services UART connus (dans l'ordre de `KNOWN_SERVICES`), puis tout autre
 * service non standard. Les services génériques (0x1800, 0x1801…) sont ignorés.
 */
export function pickUartPair<C extends CharLike>(services: readonly ServiceLike<C>[]): UartPair<C> | null {
  const candidates = services
    .filter((s) => !isGenericService(s.uuid))
    .map((s, i) => ({ s, i, rank: knownRank(s.uuid) }))
    .sort((a, b) => (a.rank < 0 ? 99 : a.rank) - (b.rank < 0 ? 99 : b.rank) || a.i - b.i);
  for (const { s } of candidates) {
    const pair = pairIn(s);
    if (pair) return pair;
  }
  return null;
}
