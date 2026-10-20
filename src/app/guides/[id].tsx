import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PlanView } from '@/components/diagnosis-view';
import { GuideFeedbackCard } from '@/components/guide-feedback';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Dots, Eyebrow, Heading, LockBox, Row, Screen, Tag, Title } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { findCategory, findGuide, formatMinutes, GuideStep } from '@/data/guides';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { api, ApiError, stripId } from '@/lib/api';
import { usePremium } from '@/lib/purchases';
import { RepairPlan } from '@/lib/repair-plan';
import { useCurrentVehicle, useStore } from '@/lib/store';
import { builtInTechData, TechSource } from '@/lib/tech-data';

export default function GuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const guide = findGuide(id);
  const theme = useTheme();
  const { t, tn } = useT();
  const vehicle = useCurrentVehicle();
  const { isPremium } = usePremium();
  const { state, update } = useStore();
  const [data, setData] = useState<{ steps: GuideStep[]; source: TechSource } | null>(null);
  const [plan, setPlan] = useState<RepairPlan | null>(null);
  const [planError, setPlanError] = useState('');
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => {
    if (guide) builtInTechData.steps(guide.id, vehicle ?? {}).then(setData);
  }, [guide, vehicle]);

  if (!guide)
    return (
      <Screen>
        <ThemedText>{t('guides.notFound')}</ThemedText>
      </Screen>
    );
  const locked = guide.premium && !isPremium;
  const progress = state.progress[guide.id] ?? [];
  const steps = data?.steps ?? guide.steps;

  const adapt = async () => {
    if (!vehicle) return;
    setPlanLoading(true);
    setPlanError('');
    try {
      setPlan(await api.repairPlan(stripId(vehicle), guide.title, 'Guide ' + guide.title));
    } catch (e) {
      setPlanError(
        e instanceof ApiError
          ? t('guides.adaptFailedReason', { reason: e.message })
          : t('guides.adaptFailed'),
      );
    } finally {
      setPlanLoading(false);
    }
  };

  const sourceText = (source: TechSource) =>
    source.kind === 'typical'
      ? t('dv.plan.torqueNote')
      : t('guides.source.licensed', { provider: source.provider, reference: source.reference });

  const toggle = (i: number) =>
    update((s) => {
      const p = [...(s.progress[guide.id] ?? [])];
      p[i] = !p[i];
      return { ...s, progress: { ...s.progress, [guide.id]: p } };
    });

  return (
    <Screen>
      <Stack.Screen options={{ title: guide.title }} />
      <Eyebrow>{findCategory(guide.category).label}</Eyebrow>
      <Title>{guide.title}</Title>
      <Row style={{ gap: Spacing.three }}>
        <Dots value={guide.level} />
        <ThemedText type="small" themeColor="textSecondary">
          {formatMinutes(guide.minutes)} · {tn('guides.steps', guide.steps.length)}
        </ThemedText>
        {guide.garage ? <Tag label={t('guides.tag.garage')} /> : null}
      </Row>
      <Card>
        <View style={{ gap: Spacing.one }}>
          <Eyebrow>{t('dv.plan.tools')}</Eyebrow>
          {guide.tools.map((tool) => (
            <ThemedText key={tool}>• {tool}</ThemedText>
          ))}
        </View>
        {guide.parts.length ? (
          <View style={{ gap: Spacing.one }}>
            <Eyebrow>{t('dv.parts')}</Eyebrow>
            {guide.parts.map((part) => (
              <ThemedText key={part}>• {part}</ThemedText>
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
              {s.torques?.map((torque) => (
                <ThemedText key={torque} type="code">
                  {torque}
                </ThemedText>
              ))}
            </View>
          </Pressable>
        ))}
      </Card>
      {locked ? (
        <LockBox text={t('guides.locked')} onUnlock={() => router.push('/premium')} />
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {data ? sourceText(data.source) : ''}
        </ThemedText>
      )}
      {isPremium ? (
        <Card>
          <Heading>{t('guides.adapt.title')}</Heading>
          {vehicle ? (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                {t('guides.adapt.body', {
                  vehicle: [vehicle.make, vehicle.model, vehicle.engine].filter(Boolean).join(' '),
                })}
              </ThemedText>
              {plan ? (
                <PlanView plan={plan} />
              ) : (
                <Button label={t('guides.adapt.title')} loading={planLoading} onPress={adapt} />
              )}
              {planError ? <ThemedText themeColor="textSecondary">{planError}</ThemedText> : null}
            </>
          ) : (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                {t('guides.adapt.noVehicle')}
              </ThemedText>
              <Button kind="ghost" label={t('guides.adapt.addVehicle')} onPress={() => router.push('/garage')} />
            </>
          )}
        </Card>
      ) : null}
      {!locked ? <GuideFeedbackCard guideId={guide.id} allDone={steps.length > 0 && steps.every((_, i) => progress[i])} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.three },
  box: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
