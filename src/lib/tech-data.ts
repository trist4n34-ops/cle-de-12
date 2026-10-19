/**
 * Source des données techniques (couples, procédures). Le fournisseur intégré
 * renvoie les valeurs types des guides ; un fournisseur sous licence
 * (HaynesPro, ETAI/RTA…) implémentera la même interface pour un véhicule précis.
 */
import { findGuide, GuideStep } from '@/data/guides';
import { Vehicle } from '@/lib/diagnosis';

export type TechSource = { kind: 'typical' } | { kind: 'licensed'; provider: string; reference: string };

export interface TechDataProvider {
  steps(guideId: string, vehicle: Partial<Vehicle>): Promise<{ steps: GuideStep[]; source: TechSource } | null>;
}

export const builtInTechData: TechDataProvider = {
  async steps(guideId) {
    const guide = findGuide(guideId);
    return guide ? { steps: guide.steps, source: { kind: 'typical' } } : null;
  },
};

export function sourceLabel(source: TechSource): string {
  return source.kind === 'typical'
    ? 'Couples indiqués : valeurs types. Vérifiez la valeur constructeur de votre véhicule.'
    : `Données ${source.provider}, réf. ${source.reference}.`;
}
