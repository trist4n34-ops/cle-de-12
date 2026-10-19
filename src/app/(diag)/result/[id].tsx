import { useLocalSearchParams } from 'expo-router';

import { DiagnosisView } from '@/components/diagnosis-view';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui';
import { useT } from '@/i18n';
import { useStore } from '@/lib/store';

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useStore();
  const { t } = useT();
  const record = state.history.find((h) => h.id === id);
  return <Screen>{record ? <DiagnosisView record={record} /> : <ThemedText>{t('result.notFound')}</ThemedText>}</Screen>;
}
