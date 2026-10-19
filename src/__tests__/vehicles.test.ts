import { describe, expect, it } from '@jest/globals';

import { CAR_MAKES, findModel, MODEL_COUNT, searchMakes, searchModels } from '@/data/vehicles';

describe('catalogue véhicules', () => {
  it('couvre les marques du marché français', () => {
    expect(CAR_MAKES.length).toBeGreaterThanOrEqual(40);
    expect(MODEL_COUNT).toBeGreaterThan(400);
  });

  it('n’a pas de doublons de marque, de modèle ni de motorisation', () => {
    const makes = CAR_MAKES.map((mk) => mk.name);
    expect(new Set(makes).size).toBe(makes.length);
    for (const mk of CAR_MAKES) {
      const models = mk.models.map((md) => md.name);
      expect({ make: mk.name, dup: models.length - new Set(models).size }).toEqual({ make: mk.name, dup: 0 });
      for (const md of mk.models) {
        const engines = (md.engines ?? []).map((en) => en.label);
        expect({ model: `${mk.name} ${md.name}`, dup: engines.length - new Set(engines).size }).toEqual({
          model: `${mk.name} ${md.name}`,
          dup: 0,
        });
        if (md.to) expect(md.to).toBeGreaterThanOrEqual(md.from);
      }
    }
  });

  it('cherche sans tenir compte des accents ni de la casse', () => {
    expect(searchMakes('citroen').map((mk) => mk.name)).toEqual(['Citroën']);
    expect(searchModels('renault', 'megane').length).toBeGreaterThanOrEqual(4);
  });

  it('filtre les modèles par année', () => {
    const clio2010 = searchModels('Renault', 'clio', 2010).map((md) => md.name);
    expect(clio2010).toContain('Clio III');
    expect(clio2010).not.toContain('Clio V');
  });

  it('propose les motorisations courantes avec leur énergie', () => {
    const engines = findModel('Peugeot', '208')?.engines ?? [];
    expect(engines.find((en) => en.label.includes('BlueHDi'))?.fuel).toBe('Diesel');
  });
});
