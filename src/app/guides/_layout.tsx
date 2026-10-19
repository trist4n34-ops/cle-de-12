import { Stack } from 'expo-router';

export default function GuidesLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Guides' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Guide' }} />
    </Stack>
  );
}
