/** Avis laissé après un guide : partagé par l'app et la route /api/guide-feedback. */

export const OUTCOMES = ['fixed', 'partial', 'garage'] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const FELT_DIFFICULTY = ['easier', 'as_expected', 'harder'] as const;
export type FeltDifficulty = (typeof FELT_DIFFICULTY)[number];

export const MAX_FEEDBACK_COMMENT = 500;

export type GuideFeedback = {
  /** Note de 1 à 5. */
  rating: number;
  outcome: Outcome;
  difficulty: FeltDifficulty;
  comment?: string;
  /** Date ISO de l'avis. */
  at: string;
  /** Faux tant que le serveur ne l'a pas reçu (hors ligne) : renvoyé à la prochaine ouverture du guide. */
  sent: boolean;
};

/** Avis de la communauté sur un guide. `average` et `fixedShare` valent null sans avis. */
export type GuideStats = { count: number; average: number | null; fixedShare: number | null };

/** Statistiques à partir des compteurs serveur (nombre d'avis, somme des notes, nombre de « réparé »). */
export function guideStats(count: number, sum: number, fixed: number): GuideStats {
  if (count <= 0) return { count: 0, average: null, fixedShare: null };
  return {
    count,
    average: Math.round((sum / count) * 10) / 10,
    fixedShare: Math.round((fixed / count) * 100) / 100,
  };
}
