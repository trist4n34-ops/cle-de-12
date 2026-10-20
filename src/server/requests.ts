/** Validation des corps de requête reçus par les routes `/api`. */
import { z } from 'zod';

import { FUELS } from '@/lib/diagnosis';
import { FELT_DIFFICULTY, MAX_FEEDBACK_COMMENT, OUTCOMES } from '@/lib/guide-feedback';

/** Corps JSON maximal accepté (photo base64 comprise). */
export const MAX_BODY_BYTES = 6 * 1024 * 1024;
/**
 * Photo en base64 : 5 Mio de texte au plus, soit environ 3,75 Mio une fois
 * décodée. C'est aussi la limite par image de l'API Claude, et cela laisse le
 * corps entier sous MAX_BODY_BYTES. Les photos de l'app (JPEG qualité 0,6) font
 * en général 0,5 à 2 Mo.
 */
export const MAX_PHOTO_BASE64 = 5 * 1024 * 1024;
export const MAX_SYMPTOMS = 2000;
export const MAX_CHAT_MESSAGE = 2000;
export const MAX_CHAT_MESSAGES = 12;
export const MAX_CODES = 20;
export const OBD_CODE = /^[PCBU][0-3][0-9A-F]{3}$/;

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** Type d'image d'après ses premiers octets (JPEG FF D8 FF, PNG 89 50 4E 47 0D 0A 1A 0A). */
export function imageMediaType(base64: string): 'image/jpeg' | 'image/png' | null {
  if (base64.length < 12 || !BASE64.test(base64.slice(0, 12))) return null;
  let head: string;
  try {
    head = atob(base64.slice(0, 12));
  } catch {
    return null;
  }
  const b = Array.from(head, (c) => c.charCodeAt(0));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x)) return 'image/png';
  return null;
}

/** Photo base64 : taille bornée, alphabet base64 et en-tête JPEG ou PNG. */
export const PhotoInput = z
  .string()
  .min(1)
  .max(MAX_PHOTO_BASE64)
  .refine((s) => s.length % 4 === 0 && BASE64.test(s), 'Photo mal encodée.')
  .refine((s) => imageMediaType(s) !== null, 'La photo doit être un JPEG ou un PNG.');

/** Langue des réponses de l'IA, choisie dans l'app (français par défaut). */
export const LanguageInput = z.enum(['fr', 'en', 'es', 'de', 'it', 'pt']).optional();

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
  language: LanguageInput,
  symptoms: z.string().max(MAX_SYMPTOMS),
  symptomTags: z.array(z.string().max(40)).max(20),
  codes: z.array(z.string().regex(OBD_CODE)).max(MAX_CODES),
  photo: PhotoInput.optional(),
});

export const RepairPlanInput = z.object({
  vehicle: VehicleInput,
  language: LanguageInput,
  repair: z.string().min(1).max(300),
  context: z.string().max(4000),
});

export const ChatInput = z.object({
  vehicle: VehicleInput,
  language: LanguageInput,
  context: z.string().max(6000),
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(MAX_CHAT_MESSAGE) }))
    .min(1)
    .max(MAX_CHAT_MESSAGES)
    .refine((m) => m[0].role === 'user' && m[m.length - 1].role === 'user', 'La conversation doit commencer et finir par un message utilisateur.'),
});

export const QuoteInput = z.object({
  vehicle: VehicleInput,
  language: LanguageInput,
  photo: PhotoInput,
  context: z.string().max(4000).optional(),
});

export const GuideFeedbackInput = z.object({
  guideId: z.string().regex(/^[a-z0-9-]{1,60}$/),
  rating: z.number().int().min(1).max(5),
  outcome: z.enum(OUTCOMES),
  difficulty: z.enum(FELT_DIFFICULTY),
  comment: z.string().max(MAX_FEEDBACK_COMMENT).optional(),
  language: LanguageInput,
});

export const PlatePhotoInput = z.object({ photo: PhotoInput });

export const CtInput = z.object({
  vehicle: VehicleInput,
  language: LanguageInput,
  photo: PhotoInput,
});

const invalid = () => Response.json({ error: 'Requête invalide.' }, { status: 400 });
const tooLarge = () => Response.json({ error: 'Requête trop volumineuse.' }, { status: 413 });

/** Lit le corps en s'arrêtant dès qu'il dépasse `max` octets ; null s'il est trop gros. */
export async function readBodyText(request: Request, max = MAX_BODY_BYTES): Promise<string | null> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T> | Response> {
  const text = await readBodyText(request);
  if (text === null) return tooLarge();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return invalid();
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return invalid();
  return parsed.data;
}
