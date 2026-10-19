/** « Mon devis est-il normal ? » : analyse d'une photo de devis de garage. */
import { z } from 'zod';

export const QuoteReviewSchema = z.object({
  verdict: z.enum(['normal', 'eleve', 'a_verifier']),
  summary: z.string(),
  total: z.string(),
  lines: z.array(
    z.object({
      label: z.string(),
      quoted: z.string(),
      marketRange: z.string(),
      assessment: z.enum(['ok', 'cher', 'inutile', 'a_verifier']),
      comment: z.string(),
    }),
  ),
  questionsForGarage: z.array(z.string()),
});
export type QuoteReview = z.infer<typeof QuoteReviewSchema>;
