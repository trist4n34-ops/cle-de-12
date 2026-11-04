/**
 * Codes d'erreur stables renvoyés par le serveur (`{ error, code }`) et posés
 * par le client (hors ligne, réponse invalide). Le texte affiché vient des
 * traductions `error.<code>` (src/i18n/errors.ts) ; le message français du
 * serveur ne sert que de repli. Module sans dépendance, partagé avec le serveur.
 */
export const ERROR_CODES = [
  'offline',
  'bad_response',
  'origin_forbidden',
  'service_unavailable',
  'server_error',
  'session_invalid',
  'rate_limited',
  'premium_required',
  'quota_diagnose',
  'quota_quote',
  'quota_ct',
  'ai_not_configured',
  'ai_unavailable',
  'ai_refused',
  'ai_incomplete',
  'invalid_request',
  'too_large',
  'guide_unknown',
  'plate_not_found',
  'plate_lookup_unavailable',
  'plate_lookup_down',
  'plate_unreadable',
  'plate_read_down',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export function isErrorCode(code: unknown): code is ErrorCode {
  return typeof code === 'string' && (ERROR_CODES as readonly string[]).includes(code);
}
