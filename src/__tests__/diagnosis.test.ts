import { describe, expect, it } from '@jest/globals';

import { extractCodes } from '@/data/obd-codes';
import { GUIDE_IDS } from '@/data/guides';
import { SYMPTOMS } from '@/data/symptoms';
import { localDiagnosis } from '@/lib/local-diagnosis';
import { DiagnosisRequest, vehicleLabel } from '@/lib/diagnosis';
import { normalizePlate } from '@/server/plate-lookup';
import { DiagnoseInput } from '@/server/requests';

const vehicle: DiagnosisRequest['vehicle'] = {
  make: 'Peugeot',
  model: '208',
  year: '2017',
  mileage: '98000',
  engine: '1.2 PureTech 82 ch',
  fuel: 'Essence',
};

describe('extractCodes', () => {
  it('extrait et dédoublonne les codes d’un texte libre', () => {
    expect(extractCodes('p0301, P0171 et encore p0301')).toEqual(['P0301', 'P0171']);
    expect(extractCodes('rien ici')).toEqual([]);
  });
});

describe('localDiagnosis', () => {
  it('classe les causes d’un code connu, probabilités à 100 %', () => {
    const d = localDiagnosis({ vehicle, symptoms: '', symptomTags: [], codes: ['P0301'] });
    expect(d.causes[0].title).toBe('Bobine du cylindre 1');
    expect(d.causes.reduce((s, c) => s + c.probability, 0)).toBeGreaterThanOrEqual(99);
    expect(d.codes[0]).toEqual({ code: 'P0301', meaning: "Ratés d'allumage, cylindre 1" });
  });

  it('impose l’arrêt pour un problème de freins', () => {
    const d = localDiagnosis({ vehicle, symptoms: 'ça grince au freinage', symptomTags: [], codes: [] });
    expect(d.urgency).toBe('stop');
  });

  it('ajoute la consigne haute tension sur un hybride', () => {
    const d = localDiagnosis({ vehicle: { ...vehicle, fuel: 'Hybride' }, symptoms: '', symptomTags: ['demarrage'], codes: [] });
    expect(d.safety.some((s) => s.includes('haute tension'))).toBe(true);
  });

  it('ne référence que des guides existants', () => {
    for (const s of SYMPTOMS) for (const c of s.causes) if (c.guideId) expect(GUIDE_IDS).toContain(c.guideId);
  });
});

describe('vehicleLabel', () => {
  it('formate le kilométrage à la française', () => {
    expect(vehicleLabel(vehicle).replace(/\s/g, ' ')).toBe('Peugeot 208 1.2 PureTech 82 ch, 2017, 98 000 km');
  });
});

describe('normalizePlate', () => {
  it('accepte les plaques SIV et FNI', () => {
    expect(normalizePlate('ab123cd')).toBe('AB-123-CD');
    expect(normalizePlate('AB-123-CD')).toBe('AB-123-CD');
    expect(normalizePlate('123 ABC 75')).toBe('123ABC75');
    expect(normalizePlate('hello')).toBeNull();
    // Les lettres I, O et U n'existent pas dans le système SIV.
    expect(normalizePlate('IO-123-UU')).toBeNull();
  });
});

describe('DiagnoseInput', () => {
  it('refuse un code défaut mal formé', () => {
    const ok = DiagnoseInput.safeParse({ vehicle, symptoms: 'broute', symptomTags: [], codes: ['P0301'] });
    const bad = DiagnoseInput.safeParse({ vehicle, symptoms: 'broute', symptomTags: [], codes: ['DROP TABLE'] });
    expect(ok.success).toBe(true);
    expect(bad.success).toBe(false);
  });
});
