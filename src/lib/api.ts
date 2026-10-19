/**
 * Appels aux routes `/api` du serveur Clé de 12. Sur mobile, les URL relatives
 * pointent vers l'origine déclarée dans app.json (plugin expo-router).
 */
import type { CtReport } from '@/lib/ct';
import type { Diagnosis, DiagnosisRequest, Vehicle } from '@/lib/diagnosis';
import type { QuoteReview } from '@/lib/quote';
import type { RepairPlan } from '@/lib/repair-plan';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

let userId = '';
export function setApiUser(id: string) {
  userId = id;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'x-cle12-user': userId, ...init.headers },
    });
  } catch {
    throw new ApiError('Pas de connexion au serveur.', 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((body as { error?: string }).error ?? `Erreur ${res.status}`, res.status);
  return body as T;
}

const post = <T>(path: string, body: unknown) => call<T>(path, { method: 'POST', body: JSON.stringify(body) });

type VehicleInput = Omit<Vehicle, 'id'>;
export const stripId = ({ id: _id, ...v }: Vehicle): VehicleInput => v;

export const api = {
  diagnose: (req: DiagnosisRequest) => post<Diagnosis>('/api/diagnose', req),
  repairPlan: (vehicle: VehicleInput, repair: string, context: string) =>
    post<RepairPlan>('/api/repair-plan', { vehicle, repair, context }),
  chat: (vehicle: VehicleInput, context: string, messages: { role: 'user' | 'assistant'; content: string }[]) =>
    post<{ text: string }>('/api/chat', { vehicle, context, messages }),
  quote: (vehicle: VehicleInput, photo: string, context?: string) =>
    post<QuoteReview>('/api/quote', { vehicle, photo, context }),
  ct: (vehicle: VehicleInput, photo: string) => post<CtReport>('/api/ct', { vehicle, photo }),
  plate: (plate: string) =>
    call<Omit<Vehicle, 'id' | 'mileage'>>(`/api/vehicle?plate=${encodeURIComponent(plate)}`),
};
