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
  /** Véhicule diagnostiqué (absent des diagnostics enregistrés avant la v4). */
  vehicleId?: string;
  /** Le véhicule tel qu'il était au moment du diagnostic, si on l'a supprimé depuis. */
  vehicle?: Vehicle;
  symptoms: string;
  codes: string[];
  result: Diagnosis;
  source: 'ai' | 'offline';
  /**
   * Retour de l'utilisateur après réparation : sert à recaler les probabilités.
   * `fixed: false` (« pas encore ») garde la question ouverte : elle revient à
   * la prochaine ouverture, `at` date le dernier « pas encore ».
   */
  feedback?: { fixed: boolean; causeIndex?: number; at: string };
  /** Questions de suivi posées sur ce diagnostic (bornées, voir capTurns). */
  chat?: { role: 'user' | 'assistant'; content: string }[];
};

/**
 * Véhicule d'un diagnostic : la fiche actuelle du véhicule diagnostiqué, sinon
 * sa copie gardée dans le diagnostic (véhicule supprimé), sinon, pour un
 * ancien diagnostic sans véhicule, le véhicule courant.
 */
export function recordVehicle(
  record: Pick<DiagnosisRecord, 'vehicleId' | 'vehicle'>,
  vehicles: Vehicle[],
  current: Vehicle | undefined,
): Vehicle | undefined {
  if (record.vehicleId) return vehicles.find((v) => v.id === record.vehicleId) ?? record.vehicle;
  return record.vehicle ?? current;
}

/**
 * Dernier diagnostic du véhicule courant (l'historique est du plus récent au
 * plus ancien). Les anciens diagnostics sans véhicule ne comptent que s'il n'y
 * a qu'un véhicule : on ne peut pas savoir à quelle voiture ils se rapportent.
 */
export function latestForVehicle(
  history: DiagnosisRecord[],
  vehicleId: string | undefined,
  vehicleCount: number,
): DiagnosisRecord | undefined {
  if (!vehicleId) return undefined;
  return history.find((h) => (h.vehicleId ? h.vehicleId === vehicleId : vehicleCount <= 1));
}

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
