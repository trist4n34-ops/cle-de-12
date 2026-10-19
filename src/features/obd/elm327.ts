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

/* ------------------------------------------------------------------------- */
/* Données en direct (mode 01, SAE J1979)                                    */
/* ------------------------------------------------------------------------- */

/** État du moteur, déduit du régime lu dans le même relevé. */
export type EngineState = 'running' | 'stopped';

/** Plage normale d'une mesure, éventuellement selon que le moteur tourne ou non. */
export type PidRange = {
  min?: number;
  max?: number;
  /** Explication en français simple, affichée quand la valeur sort de la plage. */
  hint: string;
  /** La plage ne vaut que moteur tournant ou moteur coupé ; sans précision, toujours. */
  when?: EngineState;
};

export type PidDef = {
  label: string;
  unit: string;
  /** Nombre d'octets de données (A, ou A et B). */
  bytes: 1 | 2;
  /** Formule SAE J1979 appliquée aux octets A et B. */
  decode: (a: number, b: number) => number;
  /** Décimales affichées. */
  decimals: number;
  /** Affiche le signe + (corrections de richesse). */
  signed?: boolean;
  ranges?: PidRange[];
};

const pct = (a: number) => (a * 100) / 255;
const temp = (a: number) => a - 40;
const trim = (a: number) => ((a - 128) * 100) / 128;

const TRIM_RANGE: PidRange = {
  min: -10,
  max: 10,
  when: 'running',
  hint:
    'Au-delà de ±10 %, le calculateur compense un mélange anormal. Valeur positive (mélange trop pauvre) : prise d’air, injecteur encrassé ou pompe à carburant faible. Valeur négative (trop riche) : injecteur qui fuit, sonde lambda ou débitmètre à contrôler.',
};

const VOLTAGE_RANGES: PidRange[] = [
  {
    min: 13.5,
    max: 14.7,
    when: 'running',
    hint:
      'Moteur tournant, la charge doit être de 13,5 à 14,7 V. En dessous : alternateur ou courroie fatigués ; au-dessus : régulateur de l’alternateur défaillant.',
  },
  {
    min: 12.2,
    max: 13.0,
    when: 'stopped',
    hint:
      'Moteur coupé, une batterie chargée affiche 12,4 à 12,7 V. En dessous de 12,2 V, elle est faible : rechargez-la ou faites-la tester.',
  },
];

/** PID du mode 01 lus en direct, avec libellé, unité et formule SAE J1979. */
export const PIDS: Record<number, PidDef> = {
  0x04: { label: 'Charge moteur', unit: '%', bytes: 1, decode: pct, decimals: 0 },
  0x05: {
    label: 'Liquide de refroidissement',
    unit: '°C',
    bytes: 1,
    decode: temp,
    decimals: 0,
    ranges: [
      {
        min: 80,
        max: 105,
        hint:
          'Normal moteur chaud : 80 à 105 °C. Plus bas, le moteur n’a pas fini de chauffer (ou le thermostat reste ouvert) ; plus haut, risque de surchauffe : arrêtez-vous et laissez refroidir.',
      },
    ],
  },
  0x06: { label: 'Correction de richesse court terme (banc 1)', unit: '%', bytes: 1, decode: trim, decimals: 1, signed: true, ranges: [TRIM_RANGE] },
  0x07: { label: 'Correction de richesse long terme (banc 1)', unit: '%', bytes: 1, decode: trim, decimals: 1, signed: true, ranges: [TRIM_RANGE] },
  0x0b: { label: 'Pression d’admission', unit: 'kPa', bytes: 1, decode: (a) => a, decimals: 0 },
  0x0c: { label: 'Régime moteur', unit: 'tr/min', bytes: 2, decode: (a, b) => (a * 256 + b) / 4, decimals: 0 },
  0x0d: { label: 'Vitesse', unit: 'km/h', bytes: 1, decode: (a) => a, decimals: 0 },
  0x0f: { label: 'Température d’air d’admission', unit: '°C', bytes: 1, decode: temp, decimals: 0 },
  0x10: { label: 'Débit d’air (débitmètre)', unit: 'g/s', bytes: 2, decode: (a, b) => (a * 256 + b) / 100, decimals: 1 },
  0x11: { label: 'Position du papillon', unit: '%', bytes: 1, decode: pct, decimals: 0 },
  0x2f: {
    label: 'Niveau de carburant',
    unit: '%',
    bytes: 1,
    decode: pct,
    decimals: 0,
    ranges: [{ min: 10, hint: 'Vous roulez sur la réserve : faites le plein.' }],
  },
  0x42: { label: 'Tension batterie (calculateur)', unit: 'V', bytes: 2, decode: (a, b) => (a * 256 + b) / 1000, decimals: 1, ranges: VOLTAGE_RANGES },
  0x5c: {
    label: 'Température d’huile',
    unit: '°C',
    bytes: 1,
    decode: temp,
    decimals: 0,
    ranges: [
      {
        max: 130,
        hint: 'Au-delà de 130 °C, l’huile surchauffe : levez le pied, puis vérifiez le niveau d’huile et le refroidissement.',
      },
    ],
  },
};

/** Ordre d'affichage : l'essentiel d'abord. */
export const LIVE_ORDER = [0x0c, 0x0d, 0x05, 0x42, 0x5c, 0x04, 0x11, 0x06, 0x07, 0x10, 0x0b, 0x0f, 0x2f];

/** Demande OBD d'un PID du mode 01 : 0x0C → « 010C ». */
export const pidCommand = (pid: number) => `01${pid.toString(16).toUpperCase().padStart(2, '0')}`;

/** Erreurs de bus qui signifient que le véhicule ne répond pas du tout (contact coupé, mauvais protocole). */
const BUS_ERROR = /UNABLE TO CONNECT|CAN ERROR|BUS ERROR|BUS INIT.*ERR|FB ERROR|DATA ERROR|^\?$/i;

function liveLines(raw: string): string[] | null {
  const lines = cleanLines(raw);
  const bad = lines.find((l) => BUS_ERROR.test(l));
  if (bad) throw new ElmError(bad);
  if (lines.some((l) => /NO DATA|STOPPED/i.test(l))) return null;
  return lines;
}

/**
 * Octets d'une ligne. Avec espaces, seuls les jetons de deux caractères comptent, ce qui
 * écarte un éventuel en-tête CAN de trois caractères (« 7E8 ») si ATH0 n'a pas été pris.
 */
function lineBytes(line: string): number[] {
  if (/\s/.test(line)) {
    return line
      .split(/\s+/)
      .filter((t) => /^[0-9A-F]{2}$/i.test(t))
      .map((t) => parseInt(t, 16));
  }
  return toBytes(line);
}

/** Données qui suivent « 41 <pid> » dans la première ligne qui répond à ce PID. */
function pidPayloads(lines: string[], pid: number): number[][] {
  const out: number[][] = [];
  for (const line of lines) {
    const bytes = lineBytes(line);
    const i = bytes.findIndex((b, idx) => b === 0x41 && bytes[idx + 1] === pid);
    if (i >= 0) out.push(bytes.slice(i + 2));
  }
  return out;
}

/**
 * Lit la réponse à une demande mode 01 (« 010C » → « 41 0C 1A F8 » → 1726 tr/min).
 * Quand plusieurs calculateurs répondent (moteur et boîte en CAN, en-têtes coupés),
 * la première réponse complète est retenue. NO DATA → null.
 */
export function parsePidResponse(raw: string, pid: number): number | null {
  const def = PIDS[pid];
  if (!def) throw new Error(`PID ${pidCommand(pid)} inconnu`);
  const lines = liveLines(raw);
  if (!lines) return null;
  const data = pidPayloads(lines, pid).find((p) => p.length >= def.bytes);
  if (!data) return null;
  return def.decode(data[0], data[1] ?? 0);
}

/**
 * Lit un masque de PID pris en charge (réponse à 0100, 0120 ou 0140) : chaque bit
 * de A à D, du poids fort au poids faible, annonce le PID base+1 à base+32.
 * Les réponses de plusieurs calculateurs sont réunies.
 */
export function parseSupportedPids(raw: string): number[] {
  const lines = liveLines(raw);
  if (!lines) return [];
  const supported = new Set<number>();
  for (const line of lines) {
    const bytes = lineBytes(line);
    const i = bytes.findIndex((b, idx) => b === 0x41 && [0x00, 0x20, 0x40, 0x60, 0x80, 0xa0, 0xc0].includes(bytes[idx + 1]));
    if (i < 0 || bytes.length < i + 6) continue;
    const base = bytes[i + 1];
    bytes.slice(i + 2, i + 6).forEach((byte, k) => {
      for (let bit = 0; bit < 8; bit++) {
        if (byte & (0x80 >> bit)) supported.add(base + k * 8 + bit + 1);
      }
    });
  }
  return [...supported].sort((a, b) => a - b);
}

/** Lit la réponse à ATRV, la tension mesurée par le dongle sur la prise OBD (« 12.6V »). */
export function parseBatteryVoltage(raw: string): number | null {
  for (const line of cleanLines(raw)) {
    const m = line.match(/^(\d{1,2}(?:[.,]\d+)?)\s*V?$/i);
    if (m) return parseFloat(m[1].replace(',', '.'));
  }
  return null;
}

export type LiveStatus = 'ok' | 'warn' | 'none';

/** Situe une valeur par rapport à sa plage normale. Sans plage applicable : « none ». */
export function assessPid(pid: number, value: number | null, engine?: EngineState): { status: LiveStatus; hint?: string } {
  const ranges = PIDS[pid]?.ranges;
  if (value === null || !ranges) return { status: 'none' };
  const range = ranges.find((r) => !r.when || r.when === engine);
  if (!range) return { status: 'none' };
  const out = (range.min !== undefined && value < range.min) || (range.max !== undefined && value > range.max);
  return out ? { status: 'warn', hint: range.hint } : { status: 'ok' };
}

/** Moteur tournant au-dessus de 400 tr/min ; inconnu si le régime n'a pas été lu. */
export function engineState(rpm: number | null | undefined): EngineState | undefined {
  if (rpm === null || rpm === undefined) return undefined;
  return rpm > 400 ? 'running' : 'stopped';
}
