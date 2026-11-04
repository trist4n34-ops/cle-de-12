import { describe, expect, it } from '@jest/globals';

import type { DiagnosisRecord, Vehicle } from '@/lib/diagnosis';
import {
  addMonths,
  formatDateInput,
  parseDateInput,
  parseMileage,
  recordMatchesVehicle,
  removeLogEntry,
  removeVehicle,
  saveLogEntry,
} from '@/lib/garage';
import type { LogEntry } from '@/lib/store';

const TODAY = '2026-11-04';
const car: Vehicle = { id: 'v1', make: 'Peugeot', model: '208', year: '2017', mileage: '98000', engine: '1.2 PureTech', fuel: 'Essence' };
const other: Vehicle = { ...car, id: 'v2', make: 'Renault', model: 'Clio', mileage: '50000', engine: '' };

describe('saisie des dates', () => {
  it('accepte JJ/MM/AAAA et AAAA-MM-JJ', () => {
    expect(parseDateInput('19/10/2026', TODAY)).toEqual({ ok: true, value: '2026-10-19' });
    expect(parseDateInput(' 2026-10-19 ', TODAY)).toEqual({ ok: true, value: '2026-10-19' });
    expect(parseDateInput('1/2/2024', TODAY)).toEqual({ ok: true, value: '2024-02-01' });
    expect(parseDateInput('29.02.2024', TODAY)).toEqual({ ok: true, value: '2024-02-29' });
  });

  it('refuse les formats inconnus, dates impossibles, futures ou trop anciennes', () => {
    expect(parseDateInput('19/10/26', TODAY)).toEqual({ ok: false, error: 'format' });
    expect(parseDateInput('2026/10/19', TODAY)).toEqual({ ok: false, error: 'format' });
    expect(parseDateInput('', TODAY)).toEqual({ ok: false, error: 'format' });
    expect(parseDateInput('31/02/2026', TODAY)).toEqual({ ok: false, error: 'invalid' });
    expect(parseDateInput('29/02/2025', TODAY)).toEqual({ ok: false, error: 'invalid' });
    expect(parseDateInput('2026-13-01', TODAY)).toEqual({ ok: false, error: 'invalid' });
    expect(parseDateInput('05/11/2026', TODAY)).toEqual({ ok: false, error: 'future' });
    expect(parseDateInput('01/01/1900', TODAY)).toEqual({ ok: false, error: 'tooOld' });
  });

  it('repasse en JJ/MM/AAAA pour l’édition', () => {
    expect(formatDateInput('2026-03-07')).toBe('07/03/2026');
  });

  it('ajoute des mois sans déborder sur le mois suivant', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-02-29', 48)).toBe('2028-02-29');
    expect(addMonths('2023-02-28', 24)).toBe('2025-02-28');
  });
});

describe('saisie du kilométrage', () => {
  it('accepte chiffres et séparateurs de milliers ; vide = pas de kilométrage', () => {
    expect(parseMileage('98000')).toEqual({ ok: true, value: 98000 });
    expect(parseMileage('98 000')).toEqual({ ok: true, value: 98000 });
    expect(parseMileage('98.000')).toEqual({ ok: true, value: 98000 });
    expect(parseMileage('  ')).toEqual({ ok: true, value: null });
  });

  it('refuse le reste', () => {
    expect(parseMileage('98 km')).toEqual({ ok: false, error: 'format' });
    expect(parseMileage('-5')).toEqual({ ok: false, error: 'format' });
    expect(parseMileage('98,5')).toEqual({ ok: false, error: 'format' });
    expect(parseMileage('3000000')).toEqual({ ok: false, error: 'range' });
  });
});

describe('carnet d’entretien', () => {
  const base = { vehicles: [car, other], vehicleId: 'v1' as string | null, log: [] as LogEntry[] };
  const entry: LogEntry = { id: 'e1', vehicleId: 'v1', date: '2026-10-01', mileage: '101000', operation: 'Vidange' };

  it('une entrée plus kilométrée met à jour le véhicule, pas les autres', () => {
    const s = saveLogEntry(base, entry);
    expect(s.log).toEqual([entry]);
    expect(s.vehicles.find((v) => v.id === 'v1')?.mileage).toBe('101000');
    expect(s.vehicles.find((v) => v.id === 'v2')?.mileage).toBe('50000');
  });

  it('une entrée moins kilométrée ne fait pas redescendre le compteur', () => {
    const s = saveLogEntry(base, { ...entry, mileage: '90000' });
    expect(s.vehicles[0].mileage).toBe('98000');
  });

  it('modifie une entrée existante sans la dupliquer, puis la supprime', () => {
    const s1 = saveLogEntry(base, entry);
    const s2 = saveLogEntry(s1, { ...entry, operation: 'Vidange + filtre' });
    expect(s2.log).toHaveLength(1);
    expect(s2.log[0].operation).toBe('Vidange + filtre');
    expect(removeLogEntry(s2, 'e1').log).toEqual([]);
  });

  it('retirer un véhicule retire son carnet et choisit le véhicule suivant', () => {
    const s = removeVehicle(saveLogEntry(base, entry), 'v1');
    expect(s.vehicles.map((v) => v.id)).toEqual(['v2']);
    expect(s.vehicleId).toBe('v2');
    expect(s.log).toEqual([]);
  });
});

describe('historique par véhicule', () => {
  const record = (p: Partial<DiagnosisRecord>) => ({ vehicleLabel: '', ...p });

  it('utilise l’identifiant du véhicule quand il est connu', () => {
    expect(recordMatchesVehicle(record({ vehicleId: 'v1', vehicleLabel: 'Renault Clio' }), car)).toBe(true);
    expect(recordMatchesVehicle(record({ vehicleId: 'v2' }), car)).toBe(false);
  });

  it('sinon compare désignation et année, pas le kilométrage', () => {
    expect(recordMatchesVehicle(record({ vehicleLabel: 'Peugeot 208 1.2 PureTech, 2017, 90 000 km' }), car)).toBe(true);
    expect(recordMatchesVehicle(record({ vehicleLabel: 'Peugeot 208 1.2 PureTech, 2019, 90 000 km' }), car)).toBe(false);
    expect(recordMatchesVehicle(record({ vehicleLabel: 'Renault Clio, 2017' }), car)).toBe(false);
  });
});
