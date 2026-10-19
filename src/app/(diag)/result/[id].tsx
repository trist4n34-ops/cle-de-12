import { useLocalSearchParams } from 'expo-router';

import { DiagnosisView } from '@/components/diagnosis-view';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui';
import { useStore } from '@/lib/store';

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useStore();
  const record = state.history.find((h) => h.id === id);
  return <Screen>{record ? <DiagnosisView record={record} /> : <ThemedText>Diagnostic introuvable.</ThemedText>}</Screen>;
}
