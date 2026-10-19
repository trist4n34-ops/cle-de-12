/** Validation des corps de requête reçus par les routes `/api`. */
import { z } from 'zod';

import { FUELS } from '@/lib/diagnosis';

const MAX_PHOTO = 7_000_000; // ~5 Mo une fois décodée

export const VehicleInput = z.object({
  plate: z.string().max(16).optional(),
  make: z.string().max(60),
  model: z.string().max(60),
  year: z.string().max(10),
  mileage: z.string().max(12),
  engine: z.string().max(80),
  fuel: z.enum(FUELS),
  vin: z.string().max(17).optional(),
});

export const DiagnoseInput = z.object({
  vehicle: VehicleInput,
  symptoms: z.string().max(4000),
  symptomTags: z.array(z.string().max(40)).max(20),
  codes: z.array(z.string().regex(/^[PCBU][0-3][0-9A-F]{3}$/)).max(30),
  photo: z.string().max(MAX_PHOTO).optional(),
});

export const RepairPlanInput = z.object({
  vehicle: VehicleInput,
  repair: z.string().min(1).max(300),
  context: z.string().max(4000),
});

export const ChatInput = z.object({
  vehicle: VehicleInput,
  context: z.string().max(6000),
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(40)
    .refine((m) => m[0].role === 'user' && m[m.length - 1].role === 'user', 'La conversation doit commencer et finir par un message utilisateur.'),
});

export const QuoteInput = z.object({
  vehicle: VehicleInput,
  photo: z.string().min(1).max(MAX_PHOTO),
  context: z.string().max(4000).optional(),
});

export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T> | Response> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Requête invalide.' }, { status: 400 });
  return parsed.data;
}
