import { Stack } from 'expo-router';

import { useT } from '@/i18n';

export default function DiagnosticLayout() {
  const { t } = useT();
  return (
    <Stack screenOptions={{ headerBackTitle: t('nav.back') }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="devis" options={{ title: t('quote.title') }} />
      <Stack.Screen name="controle-technique" options={{ title: t('ct.title') }} />
      <Stack.Screen name="result/[id]" options={{ title: t('nav.result') }} />
    </Stack>
  );
}
