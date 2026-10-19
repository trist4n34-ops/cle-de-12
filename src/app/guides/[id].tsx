import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, Dots, Eyebrow, LockBox, Row, Screen, Title } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { findGuide, GuideStep } from '@/data/guides';
import { useTheme } from '@/hooks/use-theme';
import { usePremium } from '@/lib/purchases';
import { useCurrentVehicle, useStore } from '@/lib/store';
import { builtInTechData, sourceLabel, TechSource } from '@/lib/tech-data';

export default function GuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const guide = findGuide(id);
  const theme = useTheme();
  const vehicle = useCurrentVehicle();
  const { isPremium } = usePremium();
  const { state, update } = useStore();
  const [data, setData] = useState<{ steps: GuideStep[]; source: TechSource } | null>(null);

  useEffect(() => {
    if (guide) builtInTechData.steps(guide.id, vehicle ?? {}).then(setData);
  }, [guide, vehicle]);

  if (!guide) return <Screen><ThemedText>Guide introuvable.</ThemedText></Screen>;
  const locked = guide.premium && !isPremium;
  const progress = state.progress[guide.id] ?? [];
  const steps = data?.steps ?? guide.steps;

  const toggle = (i: number) =>
    update((s) => {
      const p = [...(s.progress[guide.id] ?? [])];
      p[i] = !p[i];
      return { ...s, progress: { ...s.progress, [guide.id]: p } };
    });

  return (
    <Screen>
      <Stack.Screen options={{ title: guide.title }} />
      <Title>{guide.title}</Title>
      <Row style={{ gap: Spacing.three }}>
        <Dots value={guide.level} />
        <ThemedText type="small" themeColor="textSecondary">
          {guide.minutes} min · {guide.steps.length} étapes
        </ThemedText>
      </Row>
      <Card>
        <View style={{ gap: Spacing.one }}>
          <Eyebrow>Outillage</Eyebrow>
          {guide.tools.map((t) => (
            <ThemedText key={t}>• {t}</ThemedText>
          ))}
        </View>
        {guide.parts.length ? (
          <View style={{ gap: Spacing.one }}>
            <Eyebrow>Pièces</Eyebrow>
            {guide.parts.map((t) => (
              <ThemedText key={t}>• {t}</ThemedText>
            ))}
          </View>
        ) : null}
      </Card>
      <Card style={{ gap: 0 }}>
        {(locked ? steps.slice(0, 1) : steps).map((s, i) => (
          <Pressable
            key={s.title}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!progress[i] }}
            onPress={() => toggle(i)}
            style={[styles.step, i > 0 && { borderTopWidth: 1, borderTopColor: theme.line }]}>
            <View style={[styles.box, { borderColor: theme.accent, backgroundColor: progress[i] ? theme.accent : 'transparent' }]}>
              {progress[i] ? <ThemedText style={{ color: theme.accentText, fontSize: 13 }}>✓</ThemedText> : null}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText
                type="smallBold"
                style={[
                  progress[i] && { textDecorationLine: 'line-through', color: theme.textSecondary },
                  s.danger && !progress[i] && { color: theme.stop },
                ]}>
                {i + 1}. {s.title}
              </ThemedText>
              {s.detail ? <ThemedText type="small">{s.detail}</ThemedText> : null}
              {s.torques?.map((t) => (
                <ThemedText key={t} type="code">
                  {t}
                </ThemedText>
              ))}
            </View>
          </Pressable>
        ))}
      </Card>
      {locked ? (
        <LockBox text="Ce guide complet, avec couples de serrage, fait partie de Premium." onUnlock={() => router.push('/premium')} />
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {data ? sourceLabel(data.source) : ''}
        </ThemedText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.three },
  box: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
