/**
 * Multilingue léger : `I18nProvider` choisit la langue (choix de l'utilisateur
 * dans le store, sinon langue de l'appareil, sinon français) et `useT()` donne
 * `t(clé, params)`, `tn(clé, nombre)` et le formatage des nombres et dates.
 */
import { useLocales } from 'expo-localization';
import { createContext, ReactNode, useCallback, useContext, useMemo } from 'react';

import { useStore } from '@/lib/store';

import {
  currentLanguage,
  type Language,
  localeFor,
  normalizeLanguage,
  type Params,
  type PluralKey,
  resolveLanguage,
  setCurrentLanguage,
  type TKey,
  translate,
  translatePlural,
} from './core';

export {
  aiLanguageName,
  currentLanguage,
  currentLocale,
  DEFAULT_LANGUAGE,
  detectLanguage,
  DICTIONARIES,
  isLanguage,
  LANGUAGES,
  normalizeLanguage,
  resolveLanguage,
  translate,
  translatePlural,
} from './core';
export type { Dict, Language, Params, PluralKey, TKey } from './core';

type I18n = {
  /** Langue active. */
  lang: Language;
  /** Locale de formatage (ex. fr-FR, en-US). */
  locale: string;
  /** Langue choisie à la main, ou null si l'app suit l'appareil. */
  override: Language | null;
  t: (key: TKey, params?: Params) => string;
  tn: (key: PluralKey, count: number, params?: Params) => string;
  /** Nombre formaté dans la locale active (1 234 / 1,234 / 1.234). */
  num: (n: number) => string;
  /** Date (ISO ou Date) formatée dans la locale active. */
  date: (d: string | number | Date) => string;
  /** null : revenir à la langue de l'appareil. */
  setLanguage: (code: Language | null) => void;
};

function build(lang: Language, locale: string, override: Language | null, setLanguage: I18n['setLanguage']): I18n {
  return {
    lang,
    locale,
    override,
    t: (key, params) => translate(lang, key, params),
    tn: (key, count, params) => translatePlural(lang, key, count, params),
    num: (n) => n.toLocaleString(locale),
    date: (d) => new Date(d).toLocaleDateString(locale),
    setLanguage,
  };
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { state, update } = useStore();
  const device = useLocales();
  const override = normalizeLanguage(state.language);
  const tags = device.map((l) => l.languageTag || l.languageCode || '');
  const lang = override ?? resolveLanguage(tags);
  const locale = localeFor(lang, tags);

  const setLanguage = useCallback(
    (code: Language | null) => update((s) => ({ ...s, language: code ?? undefined })),
    [update],
  );

  const value = useMemo(() => {
    setCurrentLanguage(lang);
    return build(lang, locale, override, setLanguage);
  }, [lang, locale, override, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Traductions de la langue active. Hors provider (tests, rendu isolé), suit `currentLanguage()`. */
export function useT(): I18n {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  const lang = currentLanguage();
  return build(lang, localeFor(lang), null, () => undefined);
}
