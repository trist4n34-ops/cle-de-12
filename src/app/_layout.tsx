import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { I18nProvider } from '@/i18n';
import { ensureSession, setApiSession } from '@/lib/api';
import { PremiumProvider } from '@/lib/purchases';
import { StoreProvider, useStore } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

function Ready() {
  const { state, ready, update } = useStore();
  useEffect(() => {
    if (!ready) return;
    setApiSession(state.session, (session) => update((s) => ({ ...s, session })));
    SplashScreen.hideAsync();
  }, [ready, state.session, update]);
  useEffect(() => {
    // Crée la session signée par le serveur dès le lancement. Hors ligne, on
    // réessaie au prochain appel ; la base intégrée prend le relais en attendant.
    if (ready) ensureSession().catch(() => undefined);
  }, [ready]);
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
