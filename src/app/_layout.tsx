import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect } from 'react';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { I18nProvider } from '@/i18n';
import { type ApiSession, ensureSession, setApiSession } from '@/lib/api';
import { PremiumProvider } from '@/lib/purchases';
import { StoreProvider, useStore } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

function Ready() {
  const { state, ready, update } = useStore();
  const saveSession = useCallback((session: ApiSession) => update((s) => ({ ...s, session })), [update]);
  // La session enregistrée est branchée pendant le rendu, et non dans un effet :
  // les effets des écrans enfants passent avant ceux de ce composant, et leurs
  // premiers appels ne doivent pas créer une session neuve (opération idempotente).
  if (ready) setApiSession(state.session, saveSession);
  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);
  useEffect(() => {
    // Crée la session signée par le serveur dès le lancement. Hors ligne, on
    // réessaie au prochain appel ; la base intégrée prend le relais en attendant.
    if (ready) ensureSession().catch(() => undefined);
  }, [ready]);
  // Tant que l'état enregistré n'est pas relu, l'écran de lancement reste
  // affiché : les écrans s'initialisent une fois, avec les vraies données
  // (sinon l'éditeur de véhicule s'ouvre vide pour un utilisateur qui revient).
  if (!ready) return null;
  return <AppTabs />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StoreProvider>
        <I18nProvider>
          <PremiumProvider>
            <Ready />
          </PremiumProvider>
        </I18nProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
