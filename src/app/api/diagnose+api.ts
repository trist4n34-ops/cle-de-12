import { diagnose } from '@/server/claude';
import { aiRoute, preflight } from '@/server/http';
import { DiagnoseInput } from '@/server/requests';

/**
 * Diagnostic : quota gratuit mensuel puis diagnostics achetés à l'unité, vérifiés
 * par le serveur ; illimité en Premium. La photo est réservée à Premium.
 */
export function POST(request: Request) {
  return aiRoute(request, DiagnoseInput, (input) => (input.photo ? 'premium' : 'diagnose'), diagnose);
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
