/**
 * Pages légales servies avec l'API (dossier public/ sur EAS Hosting) :
 * confidentialité, suppression des données, CGV, mentions légales.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const LEGAL_PAGES = [
  { key: 'privacy', path: '/confidentialite.html' },
  { key: 'deletion', path: '/suppression-donnees.html' },
  { key: 'terms', path: '/cgv.html' },
  { key: 'legal', path: '/mentions-legales.html' },
] as const;

/** URL complète d'une page du site, ou null si l'origine du serveur est inconnue (développement). */
export function siteUrl(path: string): string | null {
  if (Platform.OS === 'web' && typeof location !== 'undefined') return new URL(path, location.origin).toString();
  const origin = (Constants.expoConfig?.extra as { router?: { origin?: unknown } } | undefined)?.router?.origin;
  return typeof origin === 'string' && origin ? origin.replace(/\/$/, '') + path : null;
}
