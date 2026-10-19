import { describe, expect, it } from '@jest/globals';

import { GUIDE_CATEGORIES, GUIDE_IDS, GUIDES, guidesByCategory, searchGuides } from '@/data/guides';
import { maintenancePlan } from '@/data/maintenance';
import { OBD_CODES } from '@/data/obd-codes';
import { SYMPTOMS } from '@/data/symptoms';
import { FUELS } from '@/lib/diagnosis';

const categoryIds = GUIDE_CATEGORIES.map((c) => c.id);

describe('bibliothèque de guides', () => {
  it('a des identifiants uniques en kebab-case', () => {
    expect(new Set(GUIDE_IDS).size).toBe(GUIDE_IDS.length);
    for (const id of GUIDE_IDS) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('a des catégories uniques', () => {
    expect(new Set(categoryIds).size).toBe(categoryIds.length);
  });

  it('range chaque guide dans une catégorie valide', () => {
    for (const g of GUIDES) expect(categoryIds).toContain(g.category);
  });

  it('a au moins 3 guides par catégorie', () => {
    for (const c of GUIDE_CATEGORIES) expect(GUIDES.filter((g) => g.category === c.id).length).toBeGreaterThanOrEqual(3);
  });

  it('a une difficulté de 1 à 5 et des guides complets', () => {
    for (const g of GUIDES) {
      expect(Number.isInteger(g.level)).toBe(true);
      expect(g.level).toBeGreaterThanOrEqual(1);
      expect(g.level).toBeLessThanOrEqual(5);
      expect(g.minutes).toBeGreaterThan(0);
      expect(g.tools.length).toBeGreaterThan(0);
      expect(g.steps.length).toBeGreaterThan(0);
      // Les titres d’étape servent de clé d’affichage : ils doivent être uniques dans un guide.
      const titles = g.steps.map((s) => s.title);
      expect(new Set(titles).size).toBe(titles.length);
    }
  });

  it('résout tous les guideId des symptômes', () => {
    for (const s of SYMPTOMS) for (const c of s.causes) if (c.guideId) expect(GUIDE_IDS).toContain(c.guideId);
  });

  it('résout tous les guideId des codes OBD', () => {
    for (const info of Object.values(OBD_CODES)) if (info.guideId) expect(GUIDE_IDS).toContain(info.guideId);
  });

  it('résout tous les guideId de l’entretien', () => {
    const engines = ['1.2 PureTech 82 ch', '1.5 dCi 85 ch', '2.0 TDI 150 ch', '1.0 TCe 90 ch'];
    for (const fuel of FUELS)
      for (const engine of engines)
        for (const item of maintenancePlan({ engine, fuel })) if (item.guideId) expect(GUIDE_IDS).toContain(item.guideId);
  });

  it('regroupe tous les guides par catégorie, dans l’ordre', () => {
    const sections = guidesByCategory();
    expect(sections.map((s) => s.category.id)).toEqual(categoryIds);
    expect(sections.reduce((n, s) => n + s.guides.length, 0)).toBe(GUIDES.length);
  });

  it('cherche sans tenir compte des accents ni de la casse', () => {
    expect(searchGuides('electricite').length).toBe(GUIDES.filter((g) => g.category === 'electricite').length);
    expect(searchGuides('THERMOSTAT').map((g) => g.id)).toContain('thermostat');
    expect(searchGuides('plaquettes avant').map((g) => g.id)).toEqual(expect.arrayContaining(['plaquettes', 'disques-avant']));
    expect(searchGuides('   ')).toHaveLength(GUIDES.length);
    expect(searchGuides('zzz introuvable')).toHaveLength(0);
  });
});
