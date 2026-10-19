import { describe, expect, it } from '@jest/globals';

import { KNOWN_ISSUES, knownIssuesFor } from '@/data/known-issues';
import { maintenanceDue, maintenancePlan } from '@/data/maintenance';
import { noiseCauses, noiseSentence } from '@/data/noises';
import type { Vehicle } from '@/lib/diagnosis';
import { localDiagnosis } from '@/lib/local-diagnosis';

const v208: Vehicle = { id: 'v1', make: 'Peugeot', model: '208', year: '2017', mileage: '98000', engine: '1.2 PureTech 82 ch', fuel: 'Essence' };

describe('pannes connues', () => {
  it('a des identifiants uniques', () => {
    const ids = KNOWN_ISSUES.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('trouve la courroie PureTech, la plus grave en premier', () => {
    const issues = knownIssuesFor(v208);
    expect(issues[0].id).toBe('puretech-courroie');
    expect(issues.map((k) => k.id)).not.toContain('k9k-coussinets');
  });

  it('tient compte de l’année, de la marque et de l’énergie', () => {
    expect(knownIssuesFor({ ...v208, year: '2026' }).map((k) => k.id)).not.toContain('puretech-courroie');
    const clio = knownIssuesFor({ make: 'Renault', model: 'Clio III', year: '2008', engine: '1.5 dCi 85 ch', fuel: 'Diesel' }).map((k) => k.id);
    expect(clio).toEqual(expect.arrayContaining(['k9k-coussinets', 'k9k-egr']));
    expect(knownIssuesFor({ make: 'Toyota', model: 'Yaris', year: '2020', engine: '1.5 Hybrid 116 ch', fuel: 'Hybride' }).map((k) => k.id)).toEqual(['hybride-12v']);
  });

  it('remonte dans le diagnostic hors ligne', () => {
    const d = localDiagnosis({ vehicle: v208, symptoms: 'voyant huile', symptomTags: [], codes: [] });
    expect(d.checks.some((c) => c.includes('PureTech'))).toBe(true);
  });
});

describe('plan d’entretien', () => {
  it('adapte la distribution au moteur', () => {
    expect(maintenancePlan(v208).find((i) => i.id === 'distribution')?.everyKm).toBe(100_000);
    expect(maintenancePlan({ engine: '1.6 THP 156 ch', fuel: 'Essence' }).find((i) => i.id === 'distribution')?.everyKm).toBeUndefined();
    const ev = maintenancePlan({ engine: '', fuel: 'Électrique' }).map((i) => i.id);
    expect(ev).not.toContain('vidange');
    expect(ev).not.toContain('distribution');
    expect(maintenancePlan({ engine: '1.5 dCi', fuel: 'Diesel' }).map((i) => i.id)).toContain('filtre-gasoil');
  });

  it('calcule les échéances depuis le carnet', () => {
    const log = [
      { id: 'a', vehicleId: 'v1', date: '2025-09-01', mileage: '85000', operation: 'Vidange + filtre' },
      { id: 'b', vehicleId: 'v1', date: '2026-06-01', mileage: '95000', operation: 'Plaquettes avant' },
    ];
    const due = maintenanceDue(v208, log, '2026-10-19');
    const vidange = due.find((d) => d.item.id === 'vidange');
    expect(vidange?.status).toBe('retard');
    expect(vidange?.nextKm).toBe(100_000);
    expect(due.find((d) => d.item.id === 'freins')?.status).toBe('ok');
    expect(due.find((d) => d.item.id === 'distribution')).toMatchObject({ status: 'inconnu', nextKm: 100_000 });
    expect(due[0].status).toBe('retard');
  });
});

describe('identifier un bruit', () => {
  it('met les causes graves en premier', () => {
    const causes = noiseCauses(['freinage'], ['frottement', 'grincement']);
    expect(causes[0].stop).toBe(true);
    expect(causes.length).toBe(2);
  });

  it('rédige une phrase pour le diagnostic', () => {
    expect(noiseSentence(['virage'], ['claquement'])).toBe('Bruit : claquement, en tournant.');
  });
});
