import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Heading, LockBox, Row, Screen, Tag, Title, Verdict } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { api, ApiError, stripId } from '@/lib/api';
import { pickPhoto } from '@/lib/photo';
import { usePremium } from '@/lib/purchases';
import { QuoteReview } from '@/lib/quote';
import { FREE_QUOTES_PER_MONTH, usage, useCurrentVehicle, useStore } from '@/lib/store';

const VERDICT = {
  normal: { urgency: 'ok', title: 'quote.verdict.normal' },
  eleve: { urgency: 'stop', title: 'quote.verdict.eleve' },
  a_verifier: { urgency: 'prudence', title: 'quote.verdict.a_verifier' },
} as const;

const LINE_LABEL = {
  ok: 'quote.line.ok',
  cher: 'quote.line.cher',
  inutile: 'quote.line.inutile',
  a_verifier: 'quote.line.a_verifier',
} as const;

export default function QuoteScreen() {
  const theme = useTheme();
  const { t, tn } = useT();
  const { state, update } = useStore();
  const { isPremium } = usePremium();
  const vehicle = useCurrentVehicle();
  const [review, setReview] = useState<QuoteReview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const left = Math.max(0, FREE_QUOTES_PER_MONTH - usage(state).quotes);
  const blocked = !isPremium && left === 0;

  const analyse = async (source: 'camera' | 'library') => {
    if (!vehicle) return;
    const photo = await pickPhoto(source);
    if (!photo) return;
    setLoading(true);
    setError('');
    try {
      const last = state.history[0];
      setReview(await api.quote(stripId(vehicle), photo, last?.result.summary));
      if (!isPremium) update((s) => ({ ...s, usage: { ...s.usage, quotes: s.usage.quotes + 1 } }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.analysisFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title lede={t('quote.lede')}>{t('quote.title')}</Title>
      {!vehicle ? (
        <ThemedText>{t('common.addVehicleFirst')}</ThemedText>
      ) : blocked ? (
        <LockBox text={t('quote.locked')} onUnlock={() => router.push('/premium')} />
      ) : (
        <Card>
          <Row>
            {Platform.OS !== 'web' ? <Button label={t('quote.takePhoto')} loading={loading} onPress={() => analyse('camera')} /> : null}
            <Button kind={Platform.OS === 'web' ? 'primary' : 'ghost'} label={t('common.choosePhoto')} loading={loading} onPress={() => analyse('library')} />
          </Row>
          <ThemedText type="small" themeColor="textSecondary">
            {isPremium ? t('common.unlimitedAnalyses') : tn('common.freeAnalysesLeft', left)} {t('common.photoPrivacy')}
          </ThemedText>
          {error ? <ThemedText>{error}</ThemedText> : null}
        </Card>
      )}

      {review ? (
        <>
          <Card>
            <Verdict urgency={VERDICT[review.verdict].urgency} title={t(VERDICT[review.verdict].title)} reason={review.summary} />
            <ThemedText type="smallBold">{t('quote.total', { total: review.total })}</ThemedText>
          </Card>
          <Card>
            <Heading>{t('quote.byLine')}</Heading>
            {review.lines.map((l, i) => (
              <View key={`${i}-${l.label}`} style={{ gap: Spacing.one, paddingTop: Spacing.two, borderTopWidth: i ? 1 : 0, borderTopColor: theme.line }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <ThemedText type="smallBold" style={{ flex: 1 }}>
                    {l.label}
                  </ThemedText>
                  <Tag label={t(LINE_LABEL[l.assessment])} />
                </Row>
                <ThemedText type="small">{t('quote.lineDetail', { quoted: l.quoted, market: l.marketRange })}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {l.comment}
                </ThemedText>
              </View>
            ))}
          </Card>
          {review.questionsForGarage.length ? (
            <Card>
              <Heading>{t('quote.askGarage')}</Heading>
              {review.questionsForGarage.map((q) => (
                <ThemedText key={q}>• {q}</ThemedText>
              ))}
            </Card>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            {t('quote.disclaimer')}
          </ThemedText>
        </>
      ) : null}
    </Screen>
  );
}
