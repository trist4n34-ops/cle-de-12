import { Stack } from 'expo-router';

export default function DiagnosticLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Retour' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="devis" options={{ title: 'Mon devis est-il normal ?' }} />
      <Stack.Screen name="controle-technique" options={{ title: 'Contrôle technique' }} />
      <Stack.Screen name="result/[id]" options={{ title: 'Diagnostic' }} />
    </Stack>
  );
}
