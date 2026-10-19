import { z } from 'zod';

export const RepairPlanSchema = z.object({
  level: z.number(),
  duration: z.string(),
  tools: z.array(z.string()),
  parts: z.array(z.string()),
  steps: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      torques: z.array(z.string()),
      danger: z.boolean(),
    }),
  ),
  warnings: z.array(z.string()),
});
export type RepairPlan = z.infer<typeof RepairPlanSchema>;
