/** Contrôle technique : analyse d'une photo de procès-verbal avec défaillances. */
import { z } from 'zod';

export const CtLevelSchema = z.enum(['mineure', 'majeure', 'critique']);
export type CtLevel = z.infer<typeof CtLevelSchema>;

export const CtDefectSchema = z.object({
  /** Code de la défaillance tel qu'imprimé sur le PV (« 5.1.1.b.2 »), ou "" s'il est illisible. */
  code: z.string(),
  label: z.string(),
  level: CtLevelSchema,
  explanation: z.string(),
  /** Faisable soi-même par un amateur. */
  diy: z.boolean(),
  difficulty: z.number(),
  partsCost: z.string(),
  garageCost: z.string(),
  partQuery: z.string(),
  guideId: z.string().nullable(),
});
export type CtDefect = z.infer<typeof CtDefectSchema>;

export const CtReportSchema = z.object({
  summary: z.string(),
  /** Délai à respecter, en clair (« Contre-visite avant le 12 décembre 2026 »). */
  deadline: z.string(),
  defects: z.array(CtDefectSchema),
  /** Total des pièces si l'on fait soi-même ce qui est faisable. */
  totalDiy: z.string(),
  /** Total si tout est confié à un garage. */
  totalGarage: z.string(),
});
export type CtReport = z.infer<typeof CtReportSchema>;
