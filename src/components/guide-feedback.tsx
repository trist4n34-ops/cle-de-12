import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, Field, Heading, Row } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type TKey, useT } from '@/i18n';
import { api } from '@/lib/api';
import {
  FELT_DIFFICULTY,
  type FeltDifficulty,
  type GuideFeedback,
  type GuideStats,
  MAX_FEEDBACK_COMMENT,
  type Outcome,
  OUTCOMES,
} from '@/lib/guide-feedback';
import { useStore } from '@/lib/store';

const OUTCOME_KEYS: Record<Outcome, TKey> = {
  fixed: 'feedback.outcome.fixed',
  partial: 'feedback.outcome.partial',
  garage: 'feedback.outcome.garage',
};
const DIFFICULTY_KEYS: Record<FeltDifficulty, TKey> = {
  easier: 'feedback.difficulty.easier',
  as_expected: 'feedback.difficulty.asExpected',
  harder: 'feedback.difficulty.harder',
};

/** Note de 1 à 5, chaque étoile est un bouton (lecteurs d'écran compris). */
function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const theme = useTheme();
  const { t } = useT();
  return (
    <Row style={{ gap: Spacing.one }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === n }}
          accessibilityLabel={t('feedback.stars', { n })}
          hitSlop={6}
          onPress={() => onChange(n)}
          style={{ minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' }}>
          <ThemedText style={{ fontSize: 30, lineHeight: 34, color: n <= value ? theme.signal : theme.textSecondary }}>
            {n <= value ? '★' : '☆'}
          </ThemedText>
        </Pressable>
      ))}
    </Row>
  );
}

/** Avis de la communauté : « 4,6/5 · 87 % ont réparé · 23 avis ». */
function CommunityLine({ stats }: { stats: GuideStats | null }) {
  const { t, tn, num } = useT();
  if (!stats?.count || stats.average === null) return null;
  const parts = [
    t('feedback.community.average', { average: num(stats.average) }),
    stats.fixedShare !== null ? t('feedback.community.fixed', { percent: num(Math.round(stats.fixedShare * 100)) }) : '',
    tn('feedback.community.count', stats.count),
  ].filter(Boolean);
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {parts.join(' · ')}
    </ThemedText>
  );
}

/**
 * Retour après un guide : note, résultat (réparé, en partie, garage), difficulté
 * ressentie et commentaire. Gardé sur l'appareil et envoyé au serveur ; un avis
 * non envoyé (hors ligne) repart à la prochaine ouverture du guide.
 */
export function GuideFeedbackCard({ guideId, allDone }: { guideId: string; allDone: boolean }) {
  const { t } = useT();
  const { state, update } = useStore();
  const saved = state.guideFeedback?.[guideId];
  const [editing, setEditing] = useState(!saved);
  const [rating, setRating] = useState(saved?.rating ?? 0);
  const [outcome, setOutcome] = useState<Outcome | null>(saved?.outcome ?? null);
  const [difficulty, setDifficulty] = useState<FeltDifficulty | null>(saved?.difficulty ?? null);
  const [comment, setComment] = useState(saved?.comment ?? '');
  const [stats, setStats] = useState<GuideStats | null>(null);
  const [sending, setSending] = useState(false);

  const store = (f: GuideFeedback) => update((s) => ({ ...s, guideFeedback: { ...s.guideFeedback, [guideId]: f } }));

  const send = async (f: GuideFeedback) => {
    try {
      setStats(await api.guideFeedback(guideId, f));
      store({ ...f, sent: true });
    } catch {
      // Hors ligne ou serveur indisponible : l'avis reste sur l'appareil et repartira.
    }
  };

  useEffect(() => {
    let alive = true;
    // Un avis resté sur l'appareil part maintenant ; sinon on lit seulement les avis de la communauté.
    const pending = saved && !saved.sent ? saved : null;
    (pending ? api.guideFeedback(guideId, pending) : api.guideStats(guideId))
      .then((s) => {
        if (!alive) return;
        setStats(s);
        if (pending) store({ ...pending, sent: true });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // Une fois par guide ouvert : l'avis enregistré ensuite est envoyé par submit().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideId]);

  const submit = async () => {
    if (!rating || !outcome || !difficulty) return;
    const f: GuideFeedback = {
      rating,
      outcome,
      difficulty,
      comment: comment.trim().slice(0, MAX_FEEDBACK_COMMENT) || undefined,
      at: new Date().toISOString(),
      sent: false,
    };
    store(f);
    setEditing(false);
    setSending(true);
    await send(f);
    setSending(false);
  };

  if (!editing && saved) {
    return (
      <Card>
        <Heading>{t('feedback.thanks.title')}</Heading>
        <ThemedText type="small">
          {'★'.repeat(saved.rating)}
          {'☆'.repeat(5 - saved.rating)} · {t(OUTCOME_KEYS[saved.outcome])} · {t(DIFFICULTY_KEYS[saved.difficulty])}
        </ThemedText>
        {saved.comment ? <ThemedText type="small" themeColor="textSecondary">« {saved.comment} »</ThemedText> : null}
        <CommunityLine stats={stats} />
        {!saved.sent && !sending ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('feedback.pending')}
          </ThemedText>
        ) : null}
        <Row>
          <Button kind="ghost" label={t('feedback.edit')} onPress={() => setEditing(true)} />
        </Row>
      </Card>
    );
  }

  return (
    <Card>
      <Heading>{allDone ? t('feedback.titleDone') : t('feedback.title')}</Heading>
      <ThemedText type="small" themeColor="textSecondary">
        {t('feedback.lede')}
      </ThemedText>
      <CommunityLine stats={stats} />
      <ThemedText type="smallBold">{t('feedback.rating')}</ThemedText>
      <Stars value={rating} onChange={setRating} />
      <ThemedText type="smallBold">{t('feedback.outcome')}</ThemedText>
      <Row>
        {OUTCOMES.map((o) => (
          <Chip key={o} label={t(OUTCOME_KEYS[o])} selected={outcome === o} onPress={() => setOutcome(o)} />
        ))}
      </Row>
      <ThemedText type="smallBold">{t('feedback.difficulty')}</ThemedText>
      <Row>
        {FELT_DIFFICULTY.map((d) => (
          <Chip key={d} label={t(DIFFICULTY_KEYS[d])} selected={difficulty === d} onPress={() => setDifficulty(d)} />
        ))}
      </Row>
      <Row>
        <Field
          label={t('feedback.comment')}
          placeholder={t('feedback.commentPlaceholder')}
          multiline
          maxLength={MAX_FEEDBACK_COMMENT}
          value={comment}
          onChangeText={setComment}
        />
      </Row>
      <Row>
        <Button label={t('feedback.send')} loading={sending} disabled={!rating || !outcome || !difficulty} onPress={submit} />
        {saved ? <Button kind="ghost" label={t('feedback.cancel')} onPress={() => setEditing(false)} /> : null}
      </Row>
    </Card>
  );
}
