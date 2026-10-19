/**
 * Format d'un diagnostic, partagé entre le serveur (sortie structurée de Claude)
 * et l'app (affichage, historique, mode hors ligne).
 */
import { z } from 'zod';

export const UrgencySchema = z.enum(['ok', 'prudence', 'stop']);
export type Urgency = z.infer<typeof UrgencySchema>;

export const CauseSchema = z.object({
  title: z.string(),
  probability: z.number(),
  explanation: z.string(),
  difficulty: z.number(),
  partsCost: z.string(),
  garageCost: z.string(),
  /** Pièce à rechercher chez les vendeurs en ligne, vide si aucune pièce. */
  partQuery: z.string(),
  guideId: z.string().nullable(),
});
export type Cause = z.infer<typeof CauseSchema>;

export const DiagnosisSchema = z.object({
  summary: z.string(),
  urgency: UrgencySchema,
  urgencyReason: z.string(),
  codes: z.array(z.object({ code: z.string(), meaning: z.string() })),
  causes: z.array(CauseSchema),
  checks: z.array(z.string()),
  safety: z.array(z.string()),
  questions: z.array(z.string()),
});
export type Diagnosis = z.infer<typeof DiagnosisSchema>;

export type Fuel = 'Essence' | 'Diesel' | 'Hybride' | 'Électrique' | 'GPL';
export const FUELS: Fuel[] = ['Essence', 'Diesel', 'Hybride', 'Électrique', 'GPL'];

export type Vehicle = {
  id: string;
  plate?: string;
  make: string;
  model: string;
  year: string;
  mileage: string;
  engine: string;
  fuel: Fuel;
  vin?: string;
};

export type DiagnosisRequest = {
  vehicle: Omit<Vehicle, 'id'>;
  symptoms: string;
  symptomTags: string[];
  codes: string[];
  /** Photo en base64 (JPEG), réservée à Premium. */
  photo?: string;
};

export type DiagnosisRecord = {
  id: string;
  date: string;
  vehicleLabel: string;
  symptoms: string;
  codes: string[];
  result: Diagnosis;
  source: 'ai' | 'offline';
  /** Retour de l'utilisateur après réparation : sert à recaler les probabilités. */
  feedback?: { fixed: boolean; causeIndex?: number; at: string };
};

export function vehicleLabel(v: Partial<Vehicle>): string {
  const km = v.mileage ? Number(String(v.mileage).replace(/\D/g, '')) : NaN;
  return [
    [v.make, v.model, v.engine].filter(Boolean).join(' '),
    v.year,
    Number.isFinite(km) ? `${km.toLocaleString('fr-FR')} km` : '',
  ]
    .filter(Boolean)
    .join(', ');
}

export function isHighVoltage(fuel: Fuel | undefined): boolean {
  return fuel === 'Hybride' || fuel === 'Électrique';
}
