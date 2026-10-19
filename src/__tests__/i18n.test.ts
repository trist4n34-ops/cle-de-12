import { describe, expect, it, jest } from '@jest/globals';

import {
  aiLanguageName,
  currentLanguage,
  detectLanguage,
  DICTIONARIES,
  LANGUAGES,
  localeFor,
  normalizeLanguage,
  pluralForm,
  resolveLanguage,
  setCurrentLanguage,
  t,
  translate,
  translatePlural,
} from '@/i18n/core';
import fr from '@/i18n/locales/fr';

// Appareil simulé : allemand (Autriche) puis anglais. jest.mock est remonté avant les imports.
jest.mock('expo-localization', () => ({
  getLocales: () => [
    { languageTag: 'de-AT', languageCode: 'de' },
    { languageTag: 'en-US', languageCode: 'en' },
  ],
}));

const frKeys = Object.keys(fr).sort();

describe('i18n', () => {
  it('propose les six langues, chacune avec un dictionnaire', () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(['fr', 'en', 'es', 'de', 'it', 'pt']);
    expect(Object.keys(DICTIONARIES).sort()).toEqual(['de', 'en', 'es', 'fr', 'it', 'pt']);
  });

  it.each(LANGUAGES.map((l) => l.code))('%s a exactement les clés du français, toutes remplies', (code) => {
    const dict = DICTIONARIES[code];
    expect(Object.keys(dict).sort()).toEqual(frKeys);
    for (const [key, value] of Object.entries(dict)) {
      expect({ key, empty: value.trim() === '' }).toEqual({ key, empty: false });
    }
  });

  it.each(LANGUAGES.map((l) => l.code))('%s garde les mêmes paramètres {…} que le français', (code) => {
    const params = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const key of frKeys) {
      const k = key as keyof typeof fr;
      expect({ key, params: params(DICTIONARIES[code][k]) }).toEqual({ key, params: params(fr[k]) });
    }
  });

  it('chaque pluriel a ses formes _one et _other', () => {
    for (const key of frKeys.filter((k) => k.endsWith('_one'))) {
      expect(frKeys).toContain(key.replace(/_one$/, '_other'));
    }
  });

  it('remplace les paramètres et laisse les inconnus tels quels', () => {
    expect(translate('fr', 'ui.difficulty', { n: 3 })).toBe('Difficulté 3 sur 5');
    expect(translate('en', 'ui.difficulty', { n: 3 })).toBe('Difficulty 3 out of 5');
    expect(translate('de', 'quote.lineDetail', { quoted: '120 €', market: '80–110 €' })).toBe(
      'Angebot: 120 € · Markt: 80–110 €',
    );
    expect(translate('fr', 'ui.difficulty')).toBe('Difficulté {n} sur 5');
  });

  it('accorde le pluriel selon la langue', () => {
    expect(pluralForm('fr', 0)).toBe('one');
    expect(pluralForm('en', 0)).toBe('other');
    expect(translatePlural('fr', 'diag.freeLeft', 1)).toBe('1 diagnostic gratuit ce mois-ci');
    expect(translatePlural('fr', 'diag.freeLeft', 2)).toBe('2 diagnostics gratuits ce mois-ci');
    expect(translatePlural('en', 'live.warnings', 1)).toBe('1 value outside the normal range');
    expect(translatePlural('en', 'live.warnings', 3)).toBe('3 values outside the normal range');
  });

  it('se replie sur le français pour une langue inconnue', () => {
    expect(translate('xx', 'verdict.stop')).toBe(fr['verdict.stop']);
    expect(translate('ja-JP', 'tabs.garage')).toBe('Mon garage');
    expect(resolveLanguage(['ja-JP', 'zh'])).toBe('fr');
    expect(resolveLanguage([])).toBe('fr');
    expect(normalizeLanguage('xx')).toBeNull();
  });

  it('reconnaît les variantes régionales', () => {
    expect(normalizeLanguage('en-US')).toBe('en');
    expect(normalizeLanguage('PT_br')).toBe('pt');
    expect(resolveLanguage(['ja', 'es-MX', 'fr'])).toBe('es');
  });

  it('détecte la langue de l’appareil et sa locale de formatage', () => {
    expect(detectLanguage()).toBe('de');
    expect(localeFor('de')).toBe('de-AT');
    expect(localeFor('en')).toBe('en-US');
    expect(localeFor('it')).toBe('it-IT');
  });

  it('expose la langue active hors de React', () => {
    expect(currentLanguage()).toBe('de');
    setCurrentLanguage('it');
    expect(currentLanguage()).toBe('it');
    expect(t('nav.back')).toBe('Indietro');
    setCurrentLanguage('fr');
  });

  it('nomme la langue pour le modèle d’IA', () => {
    expect(aiLanguageName('fr')).toBe('français');
    expect(aiLanguageName('en-GB')).toBe('English');
    expect(aiLanguageName('pt')).toBe('português');
    expect(aiLanguageName('xx')).toBe('français');
    expect(aiLanguageName(undefined)).toBe('français');
  });
});
