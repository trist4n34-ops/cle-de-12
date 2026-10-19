import { Stack } from 'expo-router';

import { useT } from '@/i18n';

export default function GuidesLayout() {
  const { t } = useT();
  return (
    <Stack screenOptions={{ headerBackTitle: t('tabs.guides') }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: t('guides.header') }} />
    </Stack>
  );
}
