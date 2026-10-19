/**
 * Palette « fiche d'atelier » : acier clair ou graphite, bleu atelier pour les
 * actions, jaune signal pour Premium. Le vert, l'orange et le rouge sont
 * réservés au verdict de sécurité.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#15202B',
    background: '#EEF1F3',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E2E7EC',
    textSecondary: '#5A6773',
    line: '#D5DBE1',
    accent: '#1F5FAF',
    accentText: '#FFFFFF',
    signal: '#F2B705',
    signalText: '#2A2100',
    ok: '#1D7A46',
    okBg: '#E3F3E9',
    warn: '#A35F00',
    warnBg: '#FDF0D8',
    stop: '#B3261E',
    stopBg: '#FBE4E2',
  },
  dark: {
    text: '#E6EBEF',
    background: '#12181E',
    backgroundElement: '#1B232B',
    backgroundSelected: '#242E37',
    textSecondary: '#9AA7B2',
    line: '#2C3842',
    accent: '#6AA5EC',
    accentText: '#0B1623',
    signal: '#F2B705',
    signalText: '#1D1700',
    ok: '#5CC98A',
    okBg: '#16301F',
    warn: '#F0B04A',
    warnBg: '#33270F',
    stop: '#FF8A80',
    stopBg: '#3A1A18',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 760;
