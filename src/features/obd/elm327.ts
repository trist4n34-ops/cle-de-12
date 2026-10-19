/**
 * Protocole ELM327 : les dongles OBD2 à 15–30 € parlent tous ce langage de
 * commandes texte. Ce module est pur (sans Bluetooth) pour être testable ;
 * le transport est fourni par `ble-transport.ts`.
 */

/** Commandes d'initialisation : reset, pas d'écho, pas d'espaces, pas d'en-têtes, protocole auto. */
export const INIT_COMMANDS = ['ATZ', 'ATE0', 'ATL0', 'ATS0', 'ATH0', 'ATSP0'];

export const CMD = {
  /** Codes confirmés (mode 03). */
  storedCodes: '03',
  /** Codes en attente (mode 07). */
  pendingCodes: '07',
  /** Effacement des codes et du voyant (mode 04). */
  clearCodes: '04',
  /** État du voyant moteur et nombre de codes (mode 01 PID 01). */
  monitorStatus: '0101',
  /** Numéro de série du véhicule (mode 09 PID 02). */
  vin: '0902',
} as const;

const LETTERS = ['P', 'C', 'B', 'U'];

/** Décode deux octets en code défaut : 0x01 0x33 → « P0133 ». */
export function decodeDtc(a: number, b: number): string {
  const letter = LETTERS[(a >> 6) & 0b11];
  const first = (a >> 4) & 0b11;
  const hex = (n: number) => n.toString(16).toUpperCase();
  return `${letter}${first}${hex(a & 0xf)}${hex(b >> 4)}${hex(b & 0xf)}`;
}

/** Nettoie une réponse ELM327 : retire le prompt `>`, `SEARCHING...`, et sépare les lignes. */
export function cleanLines(raw: string): string[] {
  return raw
    .replace(/>/g, '')
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter((l) => l && !/^SEARCHING/i.test(l) && !/^(OK|ELM327.*)$/i.test(l));
}

export class ElmError extends Error {}

function assertNoError(lines: string[]) {
  const bad = lines.find((l) => /NO DATA|UNABLE TO CONNECT|CAN ERROR|BUS INIT|STOPPED|\?/i.test(l));
  if (bad) throw new ElmError(bad);
}

function toBytes(hex: string): number[] {
  const clean = hex.replace(/[^0-9A-Fa-f]/g, '');
  const out: number[] = [];
  for (let i = 0; i + 1 < clean.length; i += 2) out.push(parseInt(clean.slice(i, i + 2), 16));
  return out;
}

/**
 * Lit la réponse à une demande de codes (mode 03 ou 07).
 * Gère les deux formes courantes :
 * - protocoles anciens (ISO 9141, KWP) : « 43 01 33 00 00 00 00 » par ligne, complétée de zéros ;
 * - CAN : un octet de comptage après le mode (« 43 02 01 33 02 44 »), éventuellement
 *   sur plusieurs trames ISO-TP préfixées « 0: », « 1: ».
 */
export function parseDtcResponse(raw: string, mode: '03' | '07' = '03'): string[] {
  const lines = cleanLines(raw);
  assertNoError(lines);
  const responseByte = (parseInt(mode, 16) + 0x40).toString(16).toUpperCase();

  const framed = lines.some((l) => /^[0-9A-F]:/i.test(l));
  let payloads: number[][];
  if (framed) {
    // Trames ISO-TP : la première ligne seule est la longueur totale, puis « n: données ».
    const data = lines
      .filter((l) => /^[0-9A-F]:/i.test(l))
      .map((l) => l.replace(/^[0-9A-F]:/i, ''))
      .join('');
    payloads = [toBytes(data)];
  } else {
    payloads = lines.map(toBytes);
  }

  const codes: string[] = [];
  for (const bytes of payloads) {
    const start = bytes.findIndex((b) => b.toString(16).toUpperCase() === responseByte);
    if (start < 0) continue;
    let body = bytes.slice(start + 1);
    // En CAN, un octet de comptage précède les paires : la longueur restante est impaire.
    if (body.length % 2 === 1) {
      const count = body[0];
      body = body.slice(1, 1 + count * 2);
    }
    for (let i = 0; i + 1 < body.length; i += 2) {
      if (body[i] === 0 && body[i + 1] === 0) continue;
      codes.push(decodeDtc(body[i], body[i + 1]));
    }
  }
  return [...new Set(codes)];
}

/** Lit la réponse 0101 : voyant moteur allumé et nombre de codes confirmés. */
export function parseMonitorStatus(raw: string): { milOn: boolean; codeCount: number } {
  const lines = cleanLines(raw);
  assertNoError(lines);
  for (const line of lines) {
    const bytes = toBytes(line);
    const i = bytes.findIndex((b, idx) => b === 0x41 && bytes[idx + 1] === 0x01);
    if (i >= 0 && bytes.length > i + 2) {
      const a = bytes[i + 2];
      return { milOn: (a & 0x80) !== 0, codeCount: a & 0x7f };
    }
  }
  throw new ElmError('Réponse 0101 illisible');
}

/** Lit le VIN (mode 09 PID 02) : 17 caractères ASCII répartis sur plusieurs trames. */
export function parseVin(raw: string): string | null {
  const lines = cleanLines(raw);
  assertNoError(lines);
  let data: number[];
  if (lines.some((l) => /^[0-9A-F]:/i.test(l))) {
    // CAN : « 014 », puis « 0: 49 02 01 57 30 4C », « 1: … » ; on retire l'en-tête 49 02 01.
    const bytes = toBytes(lines.filter((l) => /^[0-9A-F]:/i.test(l)).map((l) => l.slice(2)).join(''));
    const start = bytes.findIndex((b, i) => b === 0x49 && bytes[i + 1] === 0x02);
    if (start < 0) return null;
    data = bytes.slice(start + 3);
  } else {
    // Protocoles anciens : chaque ligne commence par 49 02 <numéro de trame>.
    data = lines.flatMap((l) => {
      const bytes = toBytes(l);
      return bytes[0] === 0x49 && bytes[1] === 0x02 ? bytes.slice(3) : [];
    });
  }
  const text = String.fromCharCode(...data.filter((b) => b >= 0x30 && b <= 0x5a));
  const vin = text.match(/[A-HJ-NPR-Z0-9]{17}/);
  return vin ? vin[0] : null;
}
