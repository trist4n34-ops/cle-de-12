/**
 * Règles du garage sans React (testables) : lecture des dates et kilométrages
 * saisis, enregistrement d'une entrée du carnet, historique par véhicule.
 */
import type { DiagnosisRecord, Vehicle } from '@/lib/diagnosis';
import type { LogEntry } from '@/lib/store';
import type { TKey } from '@/i18n/locales/fr';

export type DateError = 'format' | 'invalid' | 'future' | 'tooOld';
export type MileageError = 'format' | 'range';
export type Parsed<T, E> = { ok: true; value: T } | { ok: false; error: E };

/** Message de chaque erreur de saisie. */
export const DATE_ERROR_KEYS: Record<DateError, TKey> = {
  format: 'garage.err.date.format',
  invalid: 'garage.err.date.invalid',
  future: 'garage.err.date.future',
  tooOld: 'garage.err.date.tooOld',
};

export const MILEAGE_ERROR_KEYS: Record<MileageError, TKey> = {
  format: 'garage.err.mileage.format',
  range: 'garage.err.mileage.range',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Date locale au format AAAA-MM-JJ (pas toISOString, qui passe en UTC). */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** AAAA-MM-JJ → Date locale à l'heure donnée. */
export function localDate(iso: string, hour = 0, minute = 0): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute);
}

/** AAAA-MM-JJ → JJ/MM/AAAA, la forme proposée dans les champs de date. */
export function formatDateInput(iso: string): string {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export function addDays(iso: string, days: number): string {
  const d = localDate(iso, 12);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

/** Ajoute des mois en restant sur le dernier jour du mois si besoin (31 janvier + 1 mois → 28 ou 29 février). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1 + months, 1, 12);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, last));
  return isoDate(target);
}

const MIN_YEAR = 1950;

/**
 * Date saisie : AAAA-MM-JJ, ou JJ/MM/AAAA (aussi JJ-MM-AAAA et JJ.MM.AAAA).
 * Refuse les dates qui n'existent pas (31/02), futures ou antérieures à 1950.
 */
export function parseDateInput(text: string, today: string = isoDate(new Date())): Parsed<string, DateError> {
  const s = text.trim();
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else {
    match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
    if (!match) return { ok: false, error: 'format' };
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  const date = new Date(y, m - 1, d, 12);
  if (m < 1 || m > 12 || date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return { ok: false, error: 'invalid' };
  }
  const iso = isoDate(date);
  if (y < MIN_YEAR) return { ok: false, error: 'tooOld' };
  if (iso > today) return { ok: false, error: 'future' };
  return { ok: true, value: iso };
}

export const MAX_MILEAGE = 2_000_000;

/** Kilométrage saisi (« 98000 », « 98 000 », « 98.000 ») ; vide → null. */
export function parseMileage(text: string): Parsed<number | null, MileageError> {
  const s = text.trim();
  if (!s) return { ok: true, value: null };
  if (!/^\d{1,3}([\s.,  ]?\d{3})*$/.test(s) && !/^\d+$/.test(s)) return { ok: false, error: 'format' };
  const km = Number(s.replace(/\D/g, ''));
  if (!Number.isSafeInteger(km) || km > MAX_MILEAGE) return { ok: false, error: 'range' };
  return { ok: true, value: km };
}

/** Kilométrage du véhicule en nombre (le store le garde en texte). */
export const vehicleKm = (v: Pick<Vehicle, 'mileage'>) => Number(String(v.mileage ?? '').replace(/\D/g, '')) || 0;

/**
 * Ajoute ou remplace une entrée du carnet. Si elle indique plus de kilomètres
 * que le véhicule, le kilométrage du véhicule suit.
 */
export function saveLogEntry<S extends { log: LogEntry[]; vehicles: Vehicle[] }>(s: S, entry: LogEntry): S {
  const exists = s.log.some((l) => l.id === entry.id);
  const log = exists ? s.log.map((l) => (l.id === entry.id ? entry : l)) : [...s.log, entry];
  const km = Number(entry.mileage) || 0;
  const vehicles = s.vehicles.map((v) => (v.id === entry.vehicleId && km > vehicleKm(v) ? { ...v, mileage: String(km) } : v));
  return { ...s, log, vehicles };
}

/** Retire une entrée du carnet (le kilométrage du véhicule ne redescend pas). */
export function removeLogEntry<S extends { log: LogEntry[] }>(s: S, id: string): S {
  return { ...s, log: s.log.filter((l) => l.id !== id) };
}

/** Retire un véhicule et tout son carnet ; le véhicule courant passe au suivant. */
export function removeVehicle<S extends { log: LogEntry[]; vehicles: Vehicle[]; vehicleId: string | null }>(s: S, id: string): S {
  return {
    ...s,
    vehicles: s.vehicles.filter((x) => x.id !== id),
    vehicleId: s.vehicleId === id ? (s.vehicles.find((x) => x.id !== id)?.id ?? null) : s.vehicleId,
    log: s.log.filter((l) => l.vehicleId !== id),
  };
}

/**
 * Le diagnostic concerne-t-il ce véhicule ? Les diagnostics ne gardent que le
 * libellé du véhicule (« Peugeot 208 1.2 PureTech, 2017, 98 000 km ») : on
 * compare la désignation et l'année, pas le kilométrage qui change.
 */
export function recordMatchesVehicle(record: Pick<DiagnosisRecord, 'vehicleLabel'> & { vehicleId?: string }, v: Vehicle): boolean {
  if (record.vehicleId) return record.vehicleId === v.id;
  const [name, year] = record.vehicleLabel.split(', ');
  const fold = (x: string) => x.replace(/\s+/g, ' ').trim().toLowerCase();
  const own = fold([v.make, v.model, v.engine].filter(Boolean).join(' '));
  if (!own || fold(name ?? '') !== own) return false;
  return !v.year || !year || !/^\d{4}$/.test(year) || year === v.year;
}
