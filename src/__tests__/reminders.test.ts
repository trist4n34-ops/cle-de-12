import { describe, expect, it } from '@jest/globals';

import type { Vehicle } from '@/lib/diagnosis';
import {
  ctDeadline,
  ctStatus,
  DEFAULT_SETTINGS,
  nextMonthStarts,
  nextSaturdayMorning,
  type PlanInput,
  planReminders,
  type PlannedReminder,
  REMINDER_PREFIX,
  type SchedulerAdapter,
  syncScheduled,
} from '@/lib/reminders';
import type { LogEntry } from '@/lib/store';

const TODAY = '2026-11-04';
// Mercredi 4 novembre 2026, 9 h (heure locale).
const NOW = new Date(2026, 10, 4, 9);

const car: Vehicle = { id: 'v1', make: 'Peugeot', model: '208', year: '2017', mileage: '98000', engine: '1.2 PureTech', fuel: 'Essence' };

describe('échéance du contrôle technique', () => {
  it('premier contrôle 4 ans après la mise en circulation', () => {
    expect(ctDeadline({ firstRegistration: '2023-03-15' }, TODAY)).toEqual({ date: '2027-03-15', kind: 'premier' });
  });

  it('puis tous les 2 ans après le dernier contrôle', () => {
    expect(ctDeadline({ firstRegistration: '2017-05-02', lastCt: '2025-04-20' }, TODAY)).toEqual({
      date: '2027-04-20',
      kind: 'periodique',
    });
  });

  it('contre-visite dans les 2 mois', () => {
    expect(ctDeadline({ lastCt: '2026-10-10', counterVisit: true }, TODAY)).toEqual({ date: '2026-12-10', kind: 'contre-visite' });
  });

  it('inconnue sans date, ou pour un véhicule de plus de 4 ans sans dernier contrôle', () => {
    expect(ctDeadline(undefined, TODAY)).toBeNull();
    expect(ctDeadline({}, TODAY)).toBeNull();
    expect(ctDeadline({ firstRegistration: '2017-05-02' }, TODAY)).toBeNull();
  });

  it('en retard, bientôt (2 mois) ou à jour', () => {
    expect(ctStatus({ date: '2026-11-03', kind: 'periodique' }, TODAY)).toBe('retard');
    expect(ctStatus({ date: '2026-11-04', kind: 'periodique' }, TODAY)).toBe('bientot');
    expect(ctStatus({ date: '2027-01-04', kind: 'periodique' }, TODAY)).toBe('bientot');
    expect(ctStatus({ date: '2027-01-05', kind: 'periodique' }, TODAY)).toBe('ok');
  });
});

describe('dates des rappels', () => {
  it('samedi suivant à 10 h', () => {
    expect(nextSaturdayMorning(NOW)).toEqual(new Date(2026, 10, 7, 10));
    expect(nextSaturdayMorning(new Date(2026, 10, 7, 9))).toEqual(new Date(2026, 10, 7, 10));
    expect(nextSaturdayMorning(new Date(2026, 10, 7, 11))).toEqual(new Date(2026, 10, 14, 10));
  });

  it('les 1ers des mois suivants à 18 h', () => {
    expect(nextMonthStarts(NOW, 3)).toEqual([new Date(2026, 11, 1, 18), new Date(2027, 0, 1, 18), new Date(2027, 1, 1, 18)]);
    expect(nextMonthStarts(new Date(2026, 10, 1, 17), 1)).toEqual([new Date(2026, 10, 1, 18)]);
  });
});

const t: PlanInput['t'] = (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key);
const plan = (p: Partial<PlanInput> = {}) =>
  planReminders({
    vehicles: [car],
    log: [],
    extras: {},
    settings: { ...DEFAULT_SETTINGS, enabled: true },
    now: NOW,
    t,
    formatDate: (iso) => iso,
    ...p,
  });

describe('plan des rappels', () => {
  const oilChange: LogEntry = { id: 'e1', vehicleId: 'v1', date: '2025-12-01', mileage: '90000', operation: 'Vidange' };

  it('rien tant que les rappels ne sont pas activés', () => {
    expect(plan({ settings: DEFAULT_SETTINGS })).toEqual([]);
  });

  it('entretien bientôt dû : un rappel le samedi suivant', () => {
    const r = plan({ log: [oilChange], settings: { ...DEFAULT_SETTINGS, enabled: true, ct: false, mileage: false } });
    const summary = r.find((x) => x.id === `${REMINDER_PREFIX}maintenance:v1`);
    expect(summary?.at).toEqual(new Date(2026, 10, 7, 10));
    expect(summary?.body).toContain('Vidange');
    expect(r.every((x) => x.kind === 'maintenance' && x.at > NOW)).toBe(true);
  });

  it('contrôle technique : rappels avant l’échéance, jamais dans le passé', () => {
    const r = plan({ extras: { v1: { lastCt: '2024-12-01' } }, settings: { ...DEFAULT_SETTINGS, enabled: true, maintenance: false, mileage: false } });
    // Échéance le 1er décembre 2026 : J-30 (1er novembre) est passé, restent J-7 et J-1.
    expect(r.map((x) => x.at)).toEqual([new Date(2026, 10, 24, 10), new Date(2026, 10, 30, 10)]);
    expect(r[0].body).toContain('2026-12-01');
  });

  it('contrôle technique dépassé : un rappel de retard', () => {
    const r = plan({ extras: { v1: { lastCt: '2024-10-01' } }, settings: { ...DEFAULT_SETTINGS, enabled: true, maintenance: false, mileage: false } });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe(`${REMINDER_PREFIX}ct:v1:late`);
    expect(r[0].title).toContain('reminders.n.ctLate.title');
  });

  it('kilométrage : un rappel par mois, sauf juste après un relevé', () => {
    const only = { ...DEFAULT_SETTINGS, enabled: true, maintenance: false, ct: false };
    expect(plan({ settings: only }).map((x) => x.at)).toEqual(nextMonthStarts(NOW, 3));
    const fresh = plan({ settings: only, extras: { v1: { mileageUpdatedAt: new Date(2026, 10, 28).toISOString() } } });
    expect(fresh.map((x) => x.at)).toEqual(nextMonthStarts(NOW, 3).slice(1));
    expect(plan({ settings: only, vehicles: [] })).toEqual([]);
  });

  it('mêmes données, mêmes identifiants (reprogrammation idempotente)', () => {
    const input = { log: [oilChange], extras: { v1: { lastCt: '2025-06-01' } } };
    expect(plan(input)).toEqual(plan(input));
    expect(new Set(plan(input).map((x) => x.id)).size).toBe(plan(input).length);
  });
});

/** Planificateur en mémoire, avec une notification qui n'appartient pas à l'app. */
function fakeScheduler() {
  const scheduled = new Map<string, PlannedReminder | null>([['autre-app', null]]);
  const calls = { cancel: 0, schedule: 0 };
  const adapter: SchedulerAdapter = {
    scheduledIds: async () => [...scheduled.keys()],
    cancel: async (id) => {
      calls.cancel++;
      scheduled.delete(id);
    },
    schedule: async (r) => {
      calls.schedule++;
      scheduled.set(r.id, r);
    },
  };
  return { scheduled, calls, adapter };
}

describe('programmation des notifications', () => {
  const p1 = plan({ extras: { v1: { lastCt: '2024-12-01' } } });

  it('programme le plan, puis ne refait rien tant qu’il ne change pas', async () => {
    const { scheduled, calls, adapter } = fakeScheduler();
    const first = await syncScheduled(adapter, p1, null);
    expect(first.changed).toBe(true);
    expect([...scheduled.keys()].sort()).toEqual(['autre-app', ...p1.map((r) => r.id)].sort());
    const again = await syncScheduled(adapter, p1, first.signature);
    expect(again).toEqual({ signature: first.signature, changed: false });
    expect(calls).toEqual({ cancel: 0, schedule: p1.length });
  });

  it('annule les anciens rappels de l’app avant de programmer les nouveaux', async () => {
    const { scheduled, adapter } = fakeScheduler();
    const first = await syncScheduled(adapter, p1, null);
    const p2 = plan({ extras: { v1: { lastCt: '2025-06-01' } } });
    await syncScheduled(adapter, p2, first.signature);
    expect([...scheduled.keys()].sort()).toEqual(['autre-app', ...p2.map((r) => r.id)].sort());
  });

  it('reprogramme si le système a perdu des rappels', async () => {
    const { scheduled, adapter } = fakeScheduler();
    const first = await syncScheduled(adapter, p1, null);
    scheduled.delete(p1[0].id);
    expect((await syncScheduled(adapter, p1, first.signature)).changed).toBe(true);
    expect(scheduled.has(p1[0].id)).toBe(true);
  });

  it('un plan vide annule tous les rappels de l’app et rien d’autre', async () => {
    const { scheduled, adapter } = fakeScheduler();
    await syncScheduled(adapter, p1, null);
    await syncScheduled(adapter, [], null);
    expect([...scheduled.keys()]).toEqual(['autre-app']);
  });
});
