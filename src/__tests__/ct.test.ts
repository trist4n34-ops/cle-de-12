import { describe, expect, it } from '@jest/globals';

import { CT_AREAS, CT_CHECKLIST } from '@/data/ct-checklist';
import { GUIDE_IDS } from '@/data/guides';
import { CtReportSchema } from '@/lib/ct';
import { CtInput } from '@/server/requests';

describe('CT_CHECKLIST', () => {
  it('a des identifiants uniques', () => {
    const ids = CT_CHECKLIST.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('couvre chaque rubrique, et seulement celles-ci', () => {
    for (const area of CT_AREAS) expect(CT_CHECKLIST.some((i) => i.area === area.id)).toBe(true);
    const known = new Set(CT_AREAS.map((a) => a.id));
    for (const item of CT_CHECKLIST) expect(known.has(item.area)).toBe(true);
  });

  it('garde une liste faisable en 20 minutes', () => {
    expect(CT_CHECKLIST.length).toBeGreaterThanOrEqual(25);
    expect(CT_CHECKLIST.length).toBeLessThanOrEqual(35);
    for (const item of CT_CHECKLIST) expect(item.how.length).toBeGreaterThan(20);
  });
});

describe('CtReportSchema', () => {
  const sample = {
    summary: 'Deux défaillances majeures faciles à corriger et une mineure.',
    deadline: 'Contre-visite avant le 19 décembre 2026.',
    defects: [
      {
        code: '4.1.1.b.1',
        label: 'Feu de croisement : ne fonctionne pas',
        level: 'majeure',
        explanation: 'Une ampoule de code est grillée.',
        diy: true,
        difficulty: 1,
        partsCost: '8–15 €',
        garageCost: '25–40 €',
        partQuery: 'ampoule H7',
        guideId: null,
      },
      {
        code: '',
        label: 'Disques de frein usés',
        level: 'majeure',
        explanation: 'Les disques avant sont sous la cote minimale.',
        diy: false,
        difficulty: 3,
        partsCost: '60–120 €',
        garageCost: '180–280 €',
        partQuery: 'disques de frein avant',
        guideId: GUIDE_IDS.includes('plaquettes') ? 'plaquettes' : null,
      },
    ],
    totalDiy: '70–140 €',
    totalGarage: '200–320 €',
  };

  it('accepte un rapport complet', () => {
    const parsed = CtReportSchema.parse(sample);
    expect(parsed.defects).toHaveLength(2);
    expect(parsed.defects[0].level).toBe('majeure');
  });

  it('refuse un niveau inconnu', () => {
    const bad = { ...sample, defects: [{ ...sample.defects[0], level: 'grave' }] };
    expect(CtReportSchema.safeParse(bad).success).toBe(false);
  });
});

describe('CtInput', () => {
  it('exige une photo', () => {
    const vehicle = { make: 'Renault', model: 'Clio', year: '2015', mileage: '120000', engine: '1.5 dCi', fuel: 'Diesel' };
    expect(CtInput.safeParse({ vehicle, photo: 'abc' }).success).toBe(true);
    expect(CtInput.safeParse({ vehicle, photo: '' }).success).toBe(false);
  });
});
