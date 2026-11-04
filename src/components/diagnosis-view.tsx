import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiErrorNotice } from '@/components/api-error-notice';
import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Dots, Field, Heading, LockBox, Row, Tag, Verdict } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { findGuide } from '@/data/guides';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { api, type ChatMessage, stripId } from '@/lib/api';
import { Cause, DiagnosisRecord, recordVehicle, Vehicle } from '@/lib/diagnosis';
import { garageLinks, partLinks } from '@/lib/partners';
import { usePremium } from '@/lib/purchases';
import { RepairPlan } from '@/lib/repair-plan';
import { capTurns, MAX_SAVED_PLANS, planKey, putSaved } from '@/lib/saved-results';
import { useCurrentVehicle, useStore } from '@/lib/store';

const goPremium = () => router.push('/premium');

/** Retour à l'écran Diagnostic, prérempli avec ce diagnostic ; `auto` le relance aussitôt. */
export function retryDiagnosis(record: DiagnosisRecord, auto = false) {
  // `at` distingue deux demandes successives pour le même diagnostic.
  const at = String(Date.now());
  router.navigate({ pathname: '/', params: auto ? { retry: record.id, auto: '1', at } : { retry: record.id, at } });
}

/** Le véhicule diagnostiqué (et non le véhicule choisi aujourd'hui). */
function useRecordVehicle(record: DiagnosisRecord): Vehicle | undefined {
  const { state } = useStore();
  const current = useCurrentVehicle();
  return recordVehicle(record, state.vehicles, current);
}

export function DiagnosisView({ record }: { record: DiagnosisRecord }) {
  const r = record.result;
  const theme = useTheme();
  const { t, date } = useT();
  return (
    <View style={{ gap: Spacing.three }}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <ThemedText type="small" themeColor="textSecondary">
            {date(record.date)} · {record.vehicleLabel}
          </ThemedText>
          <Tag label={record.source === 'ai' ? t('dv.source.ai') : t('dv.source.offline')} />
        </Row>
        {record.source === 'offline' ? (
          <Row>
            <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1, minWidth: 180 }}>
              {t('dv.offlineNote')}
            </ThemedText>
            <Button kind="ghost" label={t('diag.retryAi')} onPress={() => retryDiagnosis(record, true)} />
          </Row>
        ) : null}
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
        <Heading>{t('dv.causes')}</Heading>
        {r.causes.length ? (
          r.causes.map((cause, i) => <CauseRow key={cause.title} cause={cause} index={i} record={record} />)
        ) : (
          <ThemedText themeColor="textSecondary">{t('dv.noCause')}</ThemedText>
        )}
      </Card>

      <Card>
        <Heading>{t('dv.start')}</Heading>
        {r.checks.map((c, i) => (
          <ThemedText key={c}>
            {i + 1}. {c}
          </ThemedText>
        ))}
        {r.safety.length ? <Verdict urgency="prudence" title={t('dv.safety')} reason={r.safety.join('\n')} /> : null}
      </Card>

      <Feedback record={record} />
      <Chat record={record} />

      <ThemedText type="small" themeColor="textSecondary">
        {t('dv.disclaimer')}
      </ThemedText>
    </View>
  );
}

function CauseRow({ cause, index, record }: { cause: Cause; index: number; record: DiagnosisRecord }) {
  const theme = useTheme();
  const { t } = useT();
  const { state, update } = useStore();
  const vehicle = useRecordVehicle(record);
  const { isPremium } = usePremium();
  const guide = findGuide(cause.guideId);
  const key = vehicle ? planKey(vehicle.id, cause.title) : null;
  const plan: RepairPlan | null = (key && state.repairPlans?.[key]?.value) || null;
  const [planError, setPlanError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const p = Math.max(0, Math.min(100, Math.round(cause.probability)));

  const loadPlan = async () => {
    if (!vehicle || !key) return;
    setLoading(true);
    setPlanError(null);
    try {
      const next = await api.repairPlan(stripId(vehicle), cause.title, `${record.symptoms} ${record.codes.join(' ')} ${record.result.summary}`);
      update((s) => ({ ...s, repairPlans: putSaved(s.repairPlans, key, next, MAX_SAVED_PLANS) }));
    } catch (e) {
      setPlanError(e);
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
        <ThemedText style={styles.prob}>{t('common.percent', { value: p })}</ThemedText>
      </Row>
      <View style={[styles.bar, { backgroundColor: theme.backgroundSelected }]}>
        <View style={{ width: `${p}%`, height: '100%', backgroundColor: theme.accent }} />
      </View>
      <ThemedText>{cause.explanation}</ThemedText>
      <Row style={{ gap: Spacing.three }}>
        <Row style={{ gap: Spacing.one }}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('dv.difficulty')}
          </ThemedText>
          <Dots value={cause.difficulty} />
        </Row>
        <ThemedText type="small" themeColor="textSecondary">
          {t('dv.parts')} <ThemedText type="smallBold">{cause.partsCost}</ThemedText>
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('dv.garage')} <ThemedText type="smallBold">{cause.garageCost}</ThemedText>
        </ThemedText>
      </Row>
      {cause.partQuery ? (
        <Row>
          <ThemedText type="small" themeColor="textSecondary">
            {t('common.partPrices')}
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
            {t('common.garageRepair')}
          </ThemedText>
          {garageLinks().map((l) => (
            <ExternalLink key={l.label} href={l.url}>
              <ThemedText type="linkPrimary">{t('common.quoteOn', { site: l.label })}</ThemedText>
            </ExternalLink>
          ))}
        </Row>
      ) : null}
      <Row>
        {guide ? <Button kind="ghost" label={t('common.guide', { title: guide.title })} onPress={() => router.push(`/guides/${guide.id}`)} /> : null}
        {isPremium ? (
          <Button kind="ghost" label={plan ? t('dv.planRedo') : t('dv.planButton')} loading={loading} onPress={loadPlan} />
        ) : null}
      </Row>
      {!isPremium && index === 0 ? (
        <LockBox text={t('dv.planLocked')} onUnlock={goPremium} />
      ) : null}
      {planError ? <ApiErrorNotice error={planError} fallback={t('dv.planFailed')} /> : null}
      {plan ? <PlanView plan={plan} /> : null}
    </View>
  );
}

export function PlanView({ plan }: { plan: RepairPlan }) {
  const theme = useTheme();
  const { t } = useT();
  return (
    <View style={[styles.plan, { borderColor: theme.line }]}>
      <Row>
        <Tag label={t('dv.plan.tag')} />
        <Dots value={plan.level} />
        <ThemedText type="small">{plan.duration}</ThemedText>
      </Row>
      <ThemedText type="smallBold">{t('dv.plan.tools')}</ThemedText>
      <ThemedText type="small">{plan.tools.join(' · ')}</ThemedText>
      {plan.parts.length ? (
        <>
          <ThemedText type="smallBold">{t('dv.parts')}</ThemedText>
          <ThemedText type="small">{plan.parts.join(' · ')}</ThemedText>
        </>
      ) : null}
      {plan.warnings.length ? <Verdict urgency="prudence" title={t('dv.plan.warning')} reason={plan.warnings.join('\n')} /> : null}
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
        {t('dv.plan.torqueNote')}
      </ThemedText>
    </View>
  );
}

/**
 * « Ça a réglé le problème ? » : alimente, à terme, les probabilités par modèle.
 * « Pas encore » garde la question ouverte : elle revient à la prochaine ouverture.
 */
function Feedback({ record }: { record: DiagnosisRecord }) {
  const { update } = useStore();
  const { t, date } = useT();
  // Réponse donnée pendant cette visite : on remercie au lieu de reposer la question.
  const [answered, setAnswered] = useState(false);
  const give = (fixed: boolean, causeIndex?: number) => {
    setAnswered(true);
    update((s) => ({
      ...s,
      history: s.history.map((h) =>
        h.id === record.id ? { ...h, feedback: { fixed, causeIndex, at: new Date().toISOString() } } : h,
      ),
    }));
  };

  const feedback = record.feedback;
  if (feedback?.fixed || (feedback && answered)) {
    const cause = feedback.causeIndex != null ? record.result.causes[feedback.causeIndex] : undefined;
    return (
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          {feedback.fixed
            ? cause
              ? t('dv.feedback.fixedCause', { cause: cause.title })
              : t('dv.feedback.fixed')
            : t('dv.feedback.notFixed')}
        </ThemedText>
        {!feedback.fixed ? (
          <Row>
            <Button kind="ghost" label={t('dv.feedback.stillNot')} onPress={() => retryDiagnosis(record)} />
          </Row>
        ) : null}
      </Card>
    );
  }
  return (
    <Card>
      <Heading>{t('dv.feedback.question')}</Heading>
      {feedback ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('dv.feedback.lastNotYet', { date: date(feedback.at) })}
        </ThemedText>
      ) : null}
      <Row>
        {record.result.causes.slice(0, 3).map((c, i) => (
          <Button key={c.title} kind="ghost" label={t('dv.feedback.yes', { cause: c.title })} onPress={() => give(true, i)} />
        ))}
        <Button kind="ghost" label={t('dv.feedback.notYet')} onPress={() => give(false)} />
        {feedback ? <Button kind="ghost" label={t('dv.feedback.stillNot')} onPress={() => retryDiagnosis(record)} /> : null}
      </Row>
    </Card>
  );
}

function Chat({ record }: { record: DiagnosisRecord }) {
  const { isPremium } = usePremium();
  const { update } = useStore();
  const vehicle = useRecordVehicle(record);
  const theme = useTheme();
  const { t } = useT();
  const saved = record.chat ?? [];
  // Question en cours d'envoi, affichée avant la réponse.
  const [pending, setPending] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<unknown>(null);
  const turns: ChatMessage[] = pending ? [...saved, { role: 'user', content: pending }] : saved;

  const context = `${record.result.summary} Causes : ${record.result.causes.map((c) => `${c.title} (${c.probability} %)`).join(', ')}. Symptômes : ${record.symptoms}. Codes : ${record.codes.join(', ') || 'aucun'}.`;

  const setChat = (chat: ChatMessage[]) =>
    update((s) => ({ ...s, history: s.history.map((h) => (h.id === record.id ? { ...h, chat } : h)) }));

  const send = async () => {
    const q = draft.trim();
    if (!q || !vehicle || pending) return;
    const next: ChatMessage[] = [...saved, { role: 'user', content: q }];
    setPending(q);
    setDraft('');
    setError(null);
    try {
      const { text } = await api.chat(stripId(vehicle), context, next);
      setChat(capTurns([...next, { role: 'assistant', content: text }]));
    } catch (e) {
      setDraft(q);
      setError(e);
    } finally {
      setPending(null);
    }
  };

  return (
    <Card>
      <Heading>{t('dv.chat.title')}</Heading>
      {record.result.questions.length ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('dv.chat.refine', { questions: record.result.questions.join(' ') })}
        </ThemedText>
      ) : null}
      {!isPremium ? (
        <LockBox text={t('dv.chat.locked')} onUnlock={goPremium} />
      ) : (
        <>
          {turns.map((turn, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                turn.role === 'user'
                  ? { alignSelf: 'flex-end', backgroundColor: theme.accent }
                  : { alignSelf: 'flex-start', backgroundColor: theme.background, borderColor: theme.line, borderWidth: 1 },
              ]}>
              <ThemedText style={turn.role === 'user' ? { color: theme.accentText } : undefined}>{turn.content}</ThemedText>
            </View>
          ))}
          {error ? <ApiErrorNotice error={error} fallback={t('dv.chat.failed')} /> : null}
          <Field label={t('dv.chat.label')} placeholder={t('dv.chat.placeholder')} value={draft} onChangeText={setDraft} />
          <Row>
            <Button label={t('dv.chat.send')} loading={!!pending} disabled={!draft.trim()} onPress={send} />
            {saved.length > 0 && !pending ? <Button kind="ghost" label={t('dv.chat.reset')} onPress={() => setChat([])} /> : null}
          </Row>
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
