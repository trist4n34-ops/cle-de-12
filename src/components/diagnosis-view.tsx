import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Dots, Field, Heading, LockBox, Row, Tag, Verdict } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { findGuide } from '@/data/guides';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError, stripId } from '@/lib/api';
import { Cause, DiagnosisRecord } from '@/lib/diagnosis';
import { garageLinks, partLinks } from '@/lib/partners';
import { usePremium } from '@/lib/purchases';
import { RepairPlan } from '@/lib/repair-plan';
import { useCurrentVehicle, useStore } from '@/lib/store';

const goPremium = () => router.push('/premium');

export function DiagnosisView({ record }: { record: DiagnosisRecord }) {
  const r = record.result;
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.three }}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <ThemedText type="small" themeColor="textSecondary">
            {new Date(record.date).toLocaleDateString('fr-FR')} · {record.vehicleLabel}
          </ThemedText>
          <Tag label={record.source === 'ai' ? 'IA' : 'Base intégrée'} />
        </Row>
        <Verdict urgency={r.urgency} reason={r.urgencyReason} />
        <ThemedText>{r.summary}</ThemedText>
        {r.codes.map((c) => (
          <Row key={c.code}>
            <View style={[styles.code, { backgroundColor: theme.text }]}>
              <ThemedText type="code" style={{ color: theme.backgroundElement }}>
                {c.code}
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ flexShrink: 1 }}>
              {c.meaning}
            </ThemedText>
          </Row>
        ))}
      </Card>

      <Card>
        <Heading>Causes probables</Heading>
        {r.causes.length ? (
          r.causes.map((cause, i) => <CauseRow key={cause.title} cause={cause} index={i} record={record} />)
        ) : (
          <ThemedText themeColor="textSecondary">Aucune cause identifiée.</ThemedText>
        )}
      </Card>

      <Card>
        <Heading>Par quoi commencer</Heading>
        {r.checks.map((c, i) => (
          <ThemedText key={c}>
            {i + 1}. {c}
          </ThemedText>
        ))}
        {r.safety.length ? <Verdict urgency="prudence" title="Sécurité" reason={r.safety.join('\n')} /> : null}
      </Card>

      <Feedback record={record} />
      <Chat record={record} />

      <ThemedText type="small" themeColor="textSecondary">
        Diagnostic indicatif, qui ne remplace pas l’avis d’un professionnel. Freins, direction et haute tension : faites
        toujours contrôler par un garage.
      </ThemedText>
    </View>
  );
}

function CauseRow({ cause, index, record }: { cause: Cause; index: number; record: DiagnosisRecord }) {
  const theme = useTheme();
  const vehicle = useCurrentVehicle();
  const { isPremium } = usePremium();
  const guide = findGuide(cause.guideId);
  const [plan, setPlan] = useState<RepairPlan | null>(null);
  const [planError, setPlanError] = useState('');
  const [loading, setLoading] = useState(false);
  const p = Math.max(0, Math.min(100, Math.round(cause.probability)));

  const loadPlan = async () => {
    if (!vehicle) return;
    setLoading(true);
    setPlanError('');
    try {
      setPlan(await api.repairPlan(stripId(vehicle), cause.title, `${record.symptoms} ${record.codes.join(' ')} ${record.result.summary}`));
    } catch (e) {
      setPlanError(e instanceof ApiError ? e.message : 'Plan indisponible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.cause, index > 0 && { borderTopWidth: 1, borderTopColor: theme.line }]}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <ThemedText type="smallBold" style={{ flex: 1, fontSize: 17 }}>
          {cause.title}
        </ThemedText>
        <ThemedText style={styles.prob}>{p} %</ThemedText>
      </Row>
      <View style={[styles.bar, { backgroundColor: theme.backgroundSelected }]}>
        <View style={{ width: `${p}%`, height: '100%', backgroundColor: theme.accent }} />
      </View>
      <ThemedText>{cause.explanation}</ThemedText>
      <Row style={{ gap: Spacing.three }}>
        <Row style={{ gap: Spacing.one }}>
          <ThemedText type="small" themeColor="textSecondary">
            Difficulté
          </ThemedText>
          <Dots value={cause.difficulty} />
        </Row>
        <ThemedText type="small" themeColor="textSecondary">
          Pièces <ThemedText type="smallBold">{cause.partsCost}</ThemedText>
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Garage <ThemedText type="smallBold">{cause.garageCost}</ThemedText>
        </ThemedText>
      </Row>
      {cause.partQuery ? (
        <Row>
          <ThemedText type="small" themeColor="textSecondary">
            Prix des pièces :
          </ThemedText>
          {partLinks(cause.partQuery, vehicle ?? {}).map((l) => (
            <ExternalLink key={l.label} href={l.url}>
              <ThemedText type="linkPrimary">{l.label}</ThemedText>
            </ExternalLink>
          ))}
        </Row>
      ) : null}
      {cause.difficulty >= 4 ? (
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
      <Row>
        {guide ? <Button kind="ghost" label={`Guide : ${guide.title}`} onPress={() => router.push(`/guides/${guide.id}`)} /> : null}
        {!plan && isPremium ? <Button kind="ghost" label="Plan de réparation sur mesure" loading={loading} onPress={loadPlan} /> : null}
      </Row>
      {!isPremium && index === 0 ? (
        <LockBox
          text="Le plan sur mesure liste outils, pièces, étapes et couples pour votre modèle exact."
          onUnlock={goPremium}
        />
      ) : null}
      {planError ? <ThemedText themeColor="textSecondary">{planError}</ThemedText> : null}
      {plan ? <PlanView plan={plan} /> : null}
    </View>
  );
}

function PlanView({ plan }: { plan: RepairPlan }) {
  const theme = useTheme();
  return (
    <View style={[styles.plan, { borderColor: theme.line }]}>
      <Row>
        <Tag label="Plan sur mesure" />
        <Dots value={plan.level} />
        <ThemedText type="small">{plan.duration}</ThemedText>
      </Row>
      <ThemedText type="smallBold">Outillage</ThemedText>
      <ThemedText type="small">{plan.tools.join(' · ')}</ThemedText>
      {plan.parts.length ? (
        <>
          <ThemedText type="smallBold">Pièces</ThemedText>
          <ThemedText type="small">{plan.parts.join(' · ')}</ThemedText>
        </>
      ) : null}
      {plan.warnings.length ? <Verdict urgency="prudence" title="Attention" reason={plan.warnings.join('\n')} /> : null}
      {plan.steps.map((s, i) => (
        <View key={`${i}-${s.title}`} style={{ gap: 2 }}>
          <ThemedText type="smallBold" style={s.danger ? { color: theme.stop } : undefined}>
            {i + 1}. {s.title}
          </ThemedText>
          {s.detail ? <ThemedText type="small">{s.detail}</ThemedText> : null}
          {s.torques.map((t) => (
            <ThemedText key={t} type="code">
              {t}
            </ThemedText>
          ))}
        </View>
      ))}
      <ThemedText type="small" themeColor="textSecondary">
        Couples indiqués : valeurs types. Vérifiez la valeur constructeur de votre véhicule.
      </ThemedText>
    </View>
  );
}

/** « Ça a réglé le problème ? » : alimente, à terme, les probabilités par modèle. */
function Feedback({ record }: { record: DiagnosisRecord }) {
  const { update } = useStore();
  const give = (fixed: boolean, causeIndex?: number) =>
    update((s) => ({
      ...s,
      history: s.history.map((h) =>
        h.id === record.id ? { ...h, feedback: { fixed, causeIndex, at: new Date().toISOString() } } : h,
      ),
    }));

  if (record.feedback) {
    const cause = record.feedback.causeIndex != null ? record.result.causes[record.feedback.causeIndex] : undefined;
    return (
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          {record.feedback.fixed ? `Réparé${cause ? ` : ${cause.title}` : ''}. Merci, ce retour améliore les diagnostics.` : 'Pas encore réglé. Relancez un diagnostic avec les nouveaux symptômes.'}
        </ThemedText>
      </Card>
    );
  }
  return (
    <Card>
      <Heading>Ça a réglé le problème ?</Heading>
      <Row>
        {record.result.causes.slice(0, 3).map((c, i) => (
          <Button key={c.title} kind="ghost" label={`Oui : ${c.title}`} onPress={() => give(true, i)} />
        ))}
        <Button kind="ghost" label="Pas encore" onPress={() => give(false)} />
      </Row>
    </Card>
  );
}

type Turn = { role: 'user' | 'assistant'; content: string };

function Chat({ record }: { record: DiagnosisRecord }) {
  const { isPremium } = usePremium();
  const vehicle = useCurrentVehicle();
  const theme = useTheme();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const context = `${record.result.summary} Causes : ${record.result.causes.map((c) => `${c.title} (${c.probability} %)`).join(', ')}. Symptômes : ${record.symptoms}. Codes : ${record.codes.join(', ') || 'aucun'}.`;

  const send = async () => {
    const q = draft.trim();
    if (!q || !vehicle) return;
    const next: Turn[] = [...turns, { role: 'user', content: q }];
    setTurns(next);
    setDraft('');
    setSending(true);
    setError('');
    try {
      const { text } = await api.chat(stripId(vehicle), context, next);
      setTurns([...next, { role: 'assistant', content: text }]);
    } catch (e) {
      setTurns(turns);
      setDraft(q);
      setError(e instanceof ApiError ? e.message : 'Message non envoyé.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <Heading>Poser une question</Heading>
      {record.result.questions.length ? (
        <ThemedText type="small" themeColor="textSecondary">
          Pour affiner : {record.result.questions.join(' ')}
        </ThemedText>
      ) : null}
      {!isPremium ? (
        <LockBox
          text="Discutez avec Clé de 12 pendant la réparation : « j'ai permuté les bobines, le code est passé en P0302, je fais quoi ? »"
          onUnlock={goPremium}
        />
      ) : (
        <>
          {turns.map((t, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                t.role === 'user'
                  ? { alignSelf: 'flex-end', backgroundColor: theme.accent }
                  : { alignSelf: 'flex-start', backgroundColor: theme.background, borderColor: theme.line, borderWidth: 1 },
              ]}>
              <ThemedText style={t.role === 'user' ? { color: theme.accentText } : undefined}>{t.content}</ThemedText>
            </View>
          ))}
          {error ? <ThemedText themeColor="textSecondary">{error}</ThemedText> : null}
          <Field label="Votre question" placeholder="J'ai permuté les bobines, le code a changé…" value={draft} onChangeText={setDraft} />
          <Button label="Envoyer" loading={sending} disabled={!draft.trim()} onPress={send} />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  code: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 1 },
  cause: { gap: Spacing.two, paddingTop: Spacing.two },
  prob: { fontSize: 22, fontWeight: 800, fontVariant: ['tabular-nums'] },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  plan: { borderWidth: 1, borderRadius: 10, padding: Spacing.three, gap: Spacing.two },
  bubble: { maxWidth: '90%', borderRadius: 10, padding: 10 },
});
