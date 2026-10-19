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
import { api, ApiError, stripId } from '@/lib/api';
import { CtLevel, CtReport } from '@/lib/ct';
import { garageLinks, partLinks } from '@/lib/partners';
import { pickPhoto } from '@/lib/photo';
import { usePremium } from '@/lib/purchases';
import { FREE_CT_REPORTS_PER_MONTH, usage, useCurrentVehicle, useStore } from '@/lib/store';

const LEVEL: Record<CtLevel, { label: string; fg: 'ok' | 'warn' | 'stop'; bg: 'okBg' | 'warnBg' | 'stopBg' }> = {
  mineure: { label: 'Mineure', fg: 'ok', bg: 'okBg' },
  majeure: { label: 'Majeure', fg: 'warn', bg: 'warnBg' },
  critique: { label: 'Critique', fg: 'stop', bg: 'stopBg' },
};

const VERDICT = {
  critique: { urgency: 'stop', title: 'Défaillance critique' },
  majeure: { urgency: 'prudence', title: 'Contre-visite obligatoire' },
  mineure: { urgency: 'ok', title: 'Pas de contre-visite' },
} as const;

function worstLevel(report: CtReport): CtLevel {
  const levels = report.defects.map((d) => d.level);
  return levels.includes('critique') ? 'critique' : levels.includes('majeure') ? 'majeure' : 'mineure';
}

function LevelBadge({ level }: { level: CtLevel }) {
  const theme = useTheme();
  const l = LEVEL[level];
  return (
    <View style={[styles.badge, { backgroundColor: theme[l.bg] }]}>
      <ThemedText style={[styles.badgeText, { color: theme[l.fg] }]}>{l.label}</ThemedText>
    </View>
  );
}

export default function ControleTechniqueScreen() {
  const theme = useTheme();
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
      setError(e instanceof ApiError ? e.message : 'Analyse impossible.');
    } finally {
      setLoading(false);
    }
  };

  const worst = report ? worstLevel(report) : null;

  return (
    <Screen>
      <Title lede="Le contrôle technique vérifie 133 points. Chaque défaut est classé mineur, majeur ou critique : seuls les deux derniers imposent une contre-visite.">
        Contrôle technique
      </Title>

      <View style={[styles.safety, { backgroundColor: theme.stopBg, borderLeftColor: theme.stop }]}>
        <ThemedText type="smallBold" style={{ color: theme.stop }}>
          Défaillance critique : la voiture ne peut rouler que le jour du contrôle, jusqu’à minuit.
        </ThemedText>
        <ThemedText type="small">
          Ensuite, elle ne doit plus circuler avant réparation et contre-visite (dans les 2 mois). Défaillance majeure : vous pouvez rouler, mais la contre-visite doit avoir lieu dans les 2 mois.
        </ThemedText>
      </View>

      <Card style={{ gap: Spacing.two }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Heading>Avant le contrôle</Heading>
          <Tag label={`${done} / ${CT_CHECKLIST.length} vérifiés`} />
        </Row>
        <ThemedText type="small" themeColor="textSecondary">
          20 minutes devant chez vous, à deux si possible pour les feux. Chaque point indique le niveau de défaillance qu’il déclencherait au contrôle.
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
        {done ? <Button kind="ghost" label="Tout décocher" onPress={reset} /> : null}
      </Card>

      <Heading>Analyser mon procès-verbal</Heading>
      <ThemedText themeColor="textSecondary">
        Contre-visite à passer ? Prenez en photo la page des défaillances du procès-verbal : chaque défaut est expliqué, avec ce que vous pouvez réparer vous-même et le coût.
      </ThemedText>
      {!vehicle ? (
        <ThemedText>Ajoutez d’abord votre véhicule dans l’onglet Diagnostic.</ThemedText>
      ) : blocked ? (
        <LockBox text="Votre analyse de procès-verbal gratuite du mois est utilisée. Premium les rend illimitées." onUnlock={() => router.push('/premium')} />
      ) : (
        <Card>
          <Row>
            {Platform.OS !== 'web' ? <Button label="Photographier le PV" loading={loading} onPress={() => analyse('camera')} /> : null}
            <Button kind={Platform.OS === 'web' ? 'primary' : 'ghost'} label="Choisir une photo" loading={loading} onPress={() => analyse('library')} />
          </Row>
          <ThemedText type="small" themeColor="textSecondary">
            {isPremium ? 'Analyses illimitées.' : `${left} analyse gratuite ce mois-ci.`} La photo sert uniquement à l’analyse et n’est pas conservée.
          </ThemedText>
          {error ? <ThemedText>{error}</ThemedText> : null}
        </Card>
      )}

      {report && worst ? (
        <>
          <Card>
            <Verdict urgency={VERDICT[worst].urgency} title={VERDICT[worst].title} reason={report.summary} />
            <ThemedText type="smallBold">{report.deadline}</ThemedText>
            <ThemedText type="small">
              En faisant vous-même ce qui est faisable : {report.totalDiy} · Tout au garage : {report.totalGarage}
            </ThemedText>
          </Card>
          <Card>
            <Heading>Défaut par défaut</Heading>
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
                    {d.diy ? <Tag label="Faisable soi-même" /> : null}
                    <Dots value={d.difficulty} />
                  </Row>
                  <ThemedText type="small" themeColor="textSecondary">
                    Pièces : {d.partsCost} · Garage : {d.garageCost}
                  </ThemedText>
                  {d.partQuery ? (
                    <Row>
                      <ThemedText type="small" themeColor="textSecondary">
                        Prix des pièces :
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
                        Réparation pour un garage :
                      </ThemedText>
                      {garageLinks().map((l) => (
                        <ExternalLink key={l.label} href={l.url}>
                          <ThemedText type="linkPrimary">Devis sur {l.label}</ThemedText>
                        </ExternalLink>
                      ))}
                    </Row>
                  ) : null}
                  {guide ? (
                    <Row>
                      <Button kind="ghost" label={`Guide : ${guide.title}`} onPress={() => router.push(`/guides/${guide.id}`)} />
                    </Row>
                  ) : null}
                </View>
              );
            })}
          </Card>
          <ThemedText type="small" themeColor="textSecondary">
            Estimation indicative. Seul le centre de contrôle valide la réparation lors de la contre-visite : gardez les factures et les pièces remplacées.
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
