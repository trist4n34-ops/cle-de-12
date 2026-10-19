/**
 * Identification du véhicule par la plaque (fichier SIV). Le fournisseur de
 * données est payant et se branche par variables d'environnement :
 *   PLATE_API_URL  ex. https://fournisseur.example/v1/plates/{plate}
 *   PLATE_API_KEY  clé envoyée en Authorization: Bearer
 * La réponse du fournisseur est ramenée au format `PlateResult` par `mapProvider`,
 * à adapter au fournisseur retenu.
 */
import type { Fuel } from '@/lib/diagnosis';

export type PlateResult = {
  plate: string;
  make: string;
  model: string;
  engine: string;
  year: string;
  fuel: Fuel;
  vin?: string;
};

/** Plaque SIV (AB-123-CD) ou ancien format FNI (123 ABC 75). */
export function normalizePlate(input: string): string | null {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const siv = s.match(/^([A-HJ-NP-TV-Z]{2})(\d{3})([A-HJ-NP-TV-Z]{2})$/);
  if (siv) return `${siv[1]}-${siv[2]}-${siv[3]}`;
  if (/^\d{1,4}[A-Z]{1,3}\d{2,3}$/.test(s)) return s;
  return null;
}

const FUEL_MAP: Record<string, Fuel> = { ES: 'Essence', GO: 'Diesel', EH: 'Hybride', GH: 'Hybride', EL: 'Électrique', GP: 'GPL', EG: 'GPL' };

function mapProvider(plate: string, raw: Record<string, unknown>): PlateResult {
  const str = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string) : '');
  return {
    plate,
    make: str('make') || str('marque'),
    model: str('model') || str('modele'),
    engine: str('engine') || str('version'),
    year: (str('first_registration') || str('date_mise_en_circulation')).slice(0, 4),
    fuel: FUEL_MAP[str('fuel_code') || str('energie')] ?? 'Essence',
    vin: str('vin') || undefined,
  };
}

export class PlateLookupUnavailable extends Error {}

export async function lookupPlate(input: string): Promise<PlateResult | null> {
  const plate = normalizePlate(input);
  if (!plate) return null;
  const url = process.env.PLATE_API_URL;
  const key = process.env.PLATE_API_KEY;
  if (!url || !key) throw new PlateLookupUnavailable();
  const res = await fetch(url.replace('{plate}', encodeURIComponent(plate)), {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Fournisseur plaque : HTTP ${res.status}`);
  return mapProvider(plate, (await res.json()) as Record<string, unknown>);
}
