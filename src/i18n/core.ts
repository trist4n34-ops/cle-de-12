/**
 * Traductions sans React : langues proposées, détection de la langue de
 * l'appareil, interpolation `{nom}` et pluriel simple. Le français est la
 * langue source et sert de repli.
 */
import { getLocales } from 'expo-localization';

import de from './locales/de';
import en from './locales/en';
import es from './locales/es';
import fr, { type Dict, type TKey } from './locales/fr';
import it from './locales/it';
import pt from './locales/pt';

export type { Dict, TKey };

/** Langues proposées, avec leur nom dans leur propre langue. */
export const LANGUAGES = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];
export const DEFAULT_LANGUAGE: Language = 'fr';

export const DICTIONARIES: Record<Language, Dict> = { fr, en, es, de, it, pt };

/** Locale de formatage (nombres, dates) quand l'appareil n'en fournit pas une de la même langue. */
const DEFAULT_LOCALE: Record<Language, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
  es: 'es-ES',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-PT',
};

/** Nom de la langue tel qu'on le donne au modèle d'IA (« réponds en … »). */
const AI_NAMES: Record<Language, string> = {
  fr: 'français',
  en: 'English',
  es: 'español',
  de: 'Deutsch',
  it: 'italiano',
  pt: 'português',
};

export type Params = Record<string, string | number>;

/** Clés de pluriel : `x_one` / `x_other` deviennent `x`. */
export type PluralKey = { [K in TKey]: K extends `${infer B}_one` ? B : never }[TKey];

export function isLanguage(code: unknown): code is Language {
  return typeof code === 'string' && code in DICTIONARIES;
}

/** 'en-US', 'EN_gb', 'pt' → code pris en charge ; sinon null. */
export function normalizeLanguage(code?: string | null): Language | null {
  if (!code) return null;
  const base = code.trim().toLowerCase().split(/[-_]/)[0];
  return isLanguage(base) ? base : null;
}

/** Première langue prise en charge parmi les candidates, sinon le français. */
export function resolveLanguage(candidates: readonly (string | null | undefined)[]): Language {
  for (const c of candidates) {
    const lang = normalizeLanguage(c);
    if (lang) return lang;
  }
  return DEFAULT_LANGUAGE;
}

/** Balise BCP 47 utilisable par Intl, ou null (certains systèmes renvoient « en-US@posix »). */
export function validLocale(tag: string): string | null {
  try {
    return Intl.getCanonicalLocales(tag.split('@')[0].replace(/_/g, '-'))[0] ?? null;
  } catch {
    return null;
  }
}

/** Locales préférées de l'appareil (balises BCP 47), de la plus à la moins préférée. */
export function deviceLocales(): string[] {
  try {
    return getLocales()
      .map((l) => validLocale(l.languageTag || l.languageCode || ''))
      .filter((tag): tag is string => !!tag);
  } catch {
    return [];
  }
}

export function detectLanguage(): Language {
  return resolveLanguage(deviceLocales());
}

/** Locale de formatage : celle de l'appareil si elle est dans la langue active (fr-BE, en-US…), sinon celle par défaut. */
export function localeFor(lang: Language, device: readonly string[] = deviceLocales()): string {
  const tag = device.find((t) => normalizeLanguage(t) === lang);
  return (tag && validLocale(tag)) || DEFAULT_LOCALE[lang];
}

export function aiLanguageName(code?: string | null): string {
  return AI_NAMES[normalizeLanguage(code) ?? DEFAULT_LANGUAGE];
}

/** Pluriel simple : en français (et selon la CLDR) 0 et 1 sont au singulier ; ailleurs, seul 1. */
export function pluralForm(lang: string, count: number): 'one' | 'other' {
  const n = Math.abs(count);
  if (normalizeLanguage(lang) === 'fr') return n < 2 ? 'one' : 'other';
  return n === 1 ? 'one' : 'other';
}

export function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

/** Texte de `key` dans `lang`, avec repli sur le français pour une langue ou une clé inconnue. */
export function translate(lang: string, key: TKey, params?: Params): string {
  const dict: Partial<Dict> = DICTIONARIES[normalizeLanguage(lang) ?? DEFAULT_LANGUAGE];
  return interpolate(dict[key] ?? fr[key] ?? key, params);
}

/** Pluriel : choisit `key_one` ou `key_other` et fournit `{count}`. */
export function translatePlural(lang: string, key: PluralKey, count: number, params?: Params): string {
  const full = `${key}_${pluralForm(lang, count)}` as TKey;
  return translate(lang, full, { count, ...params });
}

// Langue active, lisible hors de React (appels serveur, export PDF…). Mise à jour par I18nProvider.
let active: Language | null = null;

export function currentLanguage(): Language {
  return active ?? detectLanguage();
}

export function setCurrentLanguage(lang: Language) {
  active = lang;
}

export function currentLocale(): string {
  return localeFor(currentLanguage());
}

/** Raccourcis hors React, dans la langue active. */
export const t = (key: TKey, params?: Params) => translate(currentLanguage(), key, params);
export const tn = (key: PluralKey, count: number, params?: Params) =>
  translatePlural(currentLanguage(), key, count, params);
