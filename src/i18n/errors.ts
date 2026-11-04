/**
 * Message affichable pour une erreur d'appel au serveur, dans la langue de
 * l'app : le `code` stable renvoyé par le serveur est traduit (`error.<code>`),
 * sinon on garde le texte du serveur, sinon le repli donné par l'écran.
 */
import { ApiError } from '@/lib/api';
import { isErrorCode } from '@/lib/error-codes';

import type { Params, PluralKey, TKey } from './core';

type Translator = {
  t: (key: TKey, params?: Params) => string;
  tn: (key: PluralKey, count: number, params?: Params) => string;
};

export function errorText(e: unknown, { t, tn }: Translator, fallback?: string): string {
  if (!(e instanceof ApiError)) return fallback ?? t('error.server_error');
  if (e.code === 'rate_limited' && e.retryAfter) return tn('error.rateLimitedIn', Math.ceil(e.retryAfter / 60));
  if (isErrorCode(e.code)) return t(`error.${e.code}`);
  return e.message || fallback || t('error.server_error');
}
