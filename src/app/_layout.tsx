import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { setApiUser } from '@/lib/api';
import { PremiumProvider } from '@/lib/purchases';
import { StoreProvider, useStore } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

function Ready() {
  const { state, ready } = useStore();
  useEffect(() => {
    if (!ready) return;
    setApiUser(state.userId);
    SplashScreen.hideAsync();
  }, [ready, state.userId]);
  return <AppTabs />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StoreProvider>
        <PremiumProvider>
          <Ready />
        </PremiumProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
