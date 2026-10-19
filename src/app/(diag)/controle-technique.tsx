import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Dots, Eyebrow, Heading, LockBox, Row, Screen, Tag, Title, Verdict } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { CT_AREAS, CT_CHECKLIST } from '@/data/ct-checklist';
import { findGuide } from '@/data/guides';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { api, ApiError, stripId } from '@/lib/api';
import { CtLevel, CtReport } from '@/lib/ct';
import { garageLinks, partLinks } from '@/lib/partners';
import { pickPhoto } from '@/lib/photo';
import { usePremium } from '@/lib/purchases';
import { FREE_CT_REPORTS_PER_MONTH, usage, useCurrentVehicle, useStore } from '@/lib/store';

const LEVEL = {
  mineure: { label: 'ct.level.mineure', fg: 'ok', bg: 'okBg' },
  majeure: { label: 'ct.level.majeure', fg: 'warn', bg: 'warnBg' },
  critique: { label: 'ct.level.critique', fg: 'stop', bg: 'stopBg' },
} as const satisfies Record<CtLevel, { label: string; fg: 'ok' | 'warn' | 'stop'; bg: 'okBg' | 'warnBg' | 'stopBg' }>;

const VERDICT = {
  critique: { urgency: 'stop', title: 'ct.verdict.critique' },
  majeure: { urgency: 'prudence', title: 'ct.verdict.majeure' },
  mineure: { urgency: 'ok', title: 'ct.verdict.mineure' },
} as const;

function worstLevel(report: CtReport): CtLevel {
  const levels = report.defects.map((d) => d.level);
  return levels.includes('critique') ? 'critique' : levels.includes('majeure') ? 'majeure' : 'mineure';
}

function LevelBadge({ level }: { level: CtLevel }) {
  const theme = useTheme();
  const { t } = useT();
  const l = LEVEL[level];
  return (
    <View style={[styles.badge, { backgroundColor: theme[l.bg] }]}>
      <ThemedText style={[styles.badgeText, { color: theme[l.fg] }]}>{t(l.label)}</ThemedText>
    </View>
  );
}

export default function ControleTechniqueScreen() {
  const theme = useTheme();
  const { t, tn } = useT();
  const { state, update } = useStore();
  const { isPremium } = usePremium();
  const vehicle = useCurrentVehicle();
  const [report, setReport] = useState<CtReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const key = `ct:${vehicle?.id ?? 'sans-vehicule'}`;
  const checked = state.progress[key] ?? [];
  const done = CT_CHECKLIST.filter((_, i) => checked[i]).length;

  const toggle = (i: number) =>
    update((s) => {
      const p = [...(s.progress[key] ?? [])];
      p[i] = !p[i];
      return { ...s, progress: { ...s.progress, [key]: p } };
    });
  const reset = () => update((s) => ({ ...s, progress: { ...s.progress, [key]: [] } }));

  const left = Math.max(0, FREE_CT_REPORTS_PER_MONTH - usage(state).ct);
  const blocked = !isPremium && left === 0;

  const analyse = async (source: 'camera' | 'library') => {
    if (!vehicle) return;
    const photo = await pickPhoto(source);
    if (!photo) return;
    setLoading(true);
    setError('');
    try {
      setReport(await api.ct(stripId(vehicle), photo));
      if (!isPremium) update((s) => ({ ...s, usage: { ...s.usage, ct: (s.usage.ct ?? 0) + 1 } }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.analysisFailed'));
    } finally {
      setLoading(false);
    }
  };

  const worst = report ? worstLevel(report) : null;

  return (
    <Screen>
      <Title lede={t('ct.lede')}>{t('ct.title')}</Title>

      <View style={[styles.safety, { backgroundColor: theme.stopBg, borderLeftColor: theme.stop }]}>
        <ThemedText type="smallBold" style={{ color: theme.stop }}>
          {t('ct.safety.title')}
        </ThemedText>
        <ThemedText type="small">{t('ct.safety.body')}</ThemedText>
      </View>

      <Card style={{ gap: Spacing.two }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Heading>{t('ct.before.title')}</Heading>
          <Tag label={t('ct.before.progress', { done, total: CT_CHECKLIST.length })} />
        </Row>
        <ThemedText type="small" themeColor="textSecondary">
          {t('ct.before.intro')}
        </ThemedText>
        {CT_AREAS.map((area) => (
          <View key={area.id} style={{ paddingTop: Spacing.two }}>
            <Eyebrow>{area.label}</Eyebrow>
            {CT_CHECKLIST.map((item, i) =>
              item.area !== area.id ? null : (
                <Pressable
                  key={item.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: !!checked[i] }}
                  onPress={() => toggle(i)}
                  style={[styles.item, { borderBottomColor: theme.line }]}>
                  <View style={[styles.box, { borderColor: theme.accent, backgroundColor: checked[i] ? theme.accent : 'transparent' }]}>
                    {checked[i] ? <ThemedText style={{ color: theme.accentText, fontSize: 13 }}>✓</ThemedText> : null}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <ThemedText
                      type="smallBold"
                      style={checked[i] ? { textDecorationLine: 'line-through', color: theme.textSecondary } : undefined}>
                      {item.title}
                    </ThemedText>
                    <ThemedText type="small">{item.how}</ThemedText>
                    <Row style={{ gap: Spacing.one }}>
                      <LevelBadge level={item.defect} />
                      {item.defectNote ? (
                        <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
                          {item.defectNote}
                        </ThemedText>
                      ) : null}
                    </Row>
                  </View>
                </Pressable>
              ),
            )}
          </View>
        ))}
        {done ? <Button kind="ghost" label={t('ct.uncheckAll')} onPress={reset} /> : null}
      </Card>

      <Heading>{t('ct.report.title')}</Heading>
      <ThemedText themeColor="textSecondary">
        {t('ct.report.intro')}
      </ThemedText>
      {!vehicle ? (
        <ThemedText>{t('common.addVehicleFirst')}</ThemedText>
      ) : blocked ? (
        <LockBox text={t('ct.report.locked')} onUnlock={() => router.push('/premium')} />
      ) : (
        <Card>
          <Row>
            {Platform.OS !== 'web' ? <Button label={t('ct.report.takePhoto')} loading={loading} onPress={() => analyse('camera')} /> : null}
            <Button kind={Platform.OS === 'web' ? 'primary' : 'ghost'} label={t('common.choosePhoto')} loading={loading} onPress={() => analyse('library')} />
          </Row>
          <ThemedText type="small" themeColor="textSecondary">
            {isPremium ? t('common.unlimitedAnalyses') : tn('common.freeAnalysesLeft', left)} {t('common.photoPrivacy')}
          </ThemedText>
          {error ? <ThemedText>{error}</ThemedText> : null}
        </Card>
      )}

      {report && worst ? (
        <>
          <Card>
            <Verdict urgency={VERDICT[worst].urgency} title={t(VERDICT[worst].title)} reason={report.summary} />
            <ThemedText type="smallBold">{report.deadline}</ThemedText>
            <ThemedText type="small">{t('ct.report.costs', { diy: report.totalDiy, garage: report.totalGarage })}</ThemedText>
          </Card>
          <Card>
            <Heading>{t('ct.report.byDefect')}</Heading>
            {report.defects.map((d, i) => {
              const guide = findGuide(d.guideId);
              return (
                <View key={`${i}-${d.label}`} style={{ gap: Spacing.one, paddingTop: Spacing.two, borderTopWidth: i ? 1 : 0, borderTopColor: theme.line }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <ThemedText type="smallBold" style={{ flex: 1 }}>
                      {d.code ? `${d.code} · ` : ''}
                      {d.label}
                    </ThemedText>
                    <LevelBadge level={d.level} />
                  </Row>
                  <ThemedText type="small">{d.explanation}</ThemedText>
                  <Row style={{ gap: Spacing.three }}>
                    {d.diy ? <Tag label={t('ct.report.diy')} /> : null}
                    <Dots value={d.difficulty} />
                  </Row>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('common.partsGarage', { parts: d.partsCost, garage: d.garageCost })}
                  </ThemedText>
                  {d.partQuery ? (
                    <Row>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('common.partPrices')}
                      </ThemedText>
                      {partLinks(d.partQuery, vehicle ?? {}).map((l) => (
                        <ExternalLink key={l.label} href={l.url}>
                          <ThemedText type="linkPrimary">{l.label}</ThemedText>
                        </ExternalLink>
                      ))}
                    </Row>
                  ) : null}
                  {!d.diy ? (
                    <Row>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('common.garageRepair')}
                      </ThemedText>
                      {garageLinks().map((l) => (
                        <ExternalLink key={l.label} href={l.url}>
                          <ThemedText type="linkPrimary">{t('common.quoteOn', { site: l.label })}</ThemedText>
                        </ExternalLink>
                      ))}
                    </Row>
                  ) : null}
                  {guide ? (
                    <Row>
                      <Button kind="ghost" label={t('common.guide', { title: guide.title })} onPress={() => router.push(`/guides/${guide.id}`)} />
                    </Row>
                  ) : null}
                </View>
              );
            })}
          </Card>
          <ThemedText type="small" themeColor="textSecondary">
            {t('ct.report.disclaimer')}
          </ThemedText>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  safety: { borderLeftWidth: 6, borderRadius: 10, padding: Spacing.three, gap: Spacing.one },
  item: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  box: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  badge: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 },
});
