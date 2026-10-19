import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Heading, LockBox, Row, Screen, Tag, Title, Verdict } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError, stripId } from '@/lib/api';
import { pickPhoto } from '@/lib/photo';
import { usePremium } from '@/lib/purchases';
import { QuoteReview } from '@/lib/quote';
import { FREE_QUOTES_PER_MONTH, usage, useCurrentVehicle, useStore } from '@/lib/store';

const VERDICT = {
  normal: { urgency: 'ok', title: 'Devis dans les prix' },
  eleve: { urgency: 'stop', title: 'Devis au-dessus du marché' },
  a_verifier: { urgency: 'prudence', title: 'Des lignes à faire préciser' },
} as const;

const LINE_LABEL = { ok: 'Normal', cher: 'Cher', inutile: 'Peut-être inutile', a_verifier: 'À vérifier' } as const;

export default function QuoteScreen() {
  const theme = useTheme();
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
      setError(e instanceof ApiError ? e.message : 'Analyse impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title lede="Prenez le devis en photo, bien à plat et lisible. Chaque ligne est comparée aux prix habituels pour votre véhicule.">
        Mon devis est-il normal ?
      </Title>
      {!vehicle ? (
        <ThemedText>Ajoutez d’abord votre véhicule dans l’onglet Diagnostic.</ThemedText>
      ) : blocked ? (
        <LockBox text="Votre analyse de devis gratuite du mois est utilisée. Premium les rend illimitées." onUnlock={() => router.push('/premium')} />
      ) : (
        <Card>
          <Row>
            {Platform.OS !== 'web' ? <Button label="Photographier le devis" loading={loading} onPress={() => analyse('camera')} /> : null}
            <Button kind={Platform.OS === 'web' ? 'primary' : 'ghost'} label="Choisir une photo" loading={loading} onPress={() => analyse('library')} />
          </Row>
          <ThemedText type="small" themeColor="textSecondary">
            {isPremium ? 'Analyses illimitées.' : `${left} analyse gratuite ce mois-ci.`} La photo sert uniquement à l’analyse et n’est pas conservée.
          </ThemedText>
          {error ? <ThemedText>{error}</ThemedText> : null}
        </Card>
      )}

      {review ? (
        <>
          <Card>
            <Verdict urgency={VERDICT[review.verdict].urgency} title={VERDICT[review.verdict].title} reason={review.summary} />
            <ThemedText type="smallBold">Total du devis : {review.total}</ThemedText>
          </Card>
          <Card>
            <Heading>Ligne par ligne</Heading>
            {review.lines.map((l, i) => (
              <View key={`${i}-${l.label}`} style={{ gap: Spacing.one, paddingTop: Spacing.two, borderTopWidth: i ? 1 : 0, borderTopColor: theme.line }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <ThemedText type="smallBold" style={{ flex: 1 }}>
                    {l.label}
                  </ThemedText>
                  <Tag label={LINE_LABEL[l.assessment]} />
                </Row>
                <ThemedText type="small">
                  Devis : {l.quoted} · Marché : {l.marketRange}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {l.comment}
                </ThemedText>
              </View>
            ))}
          </Card>
          {review.questionsForGarage.length ? (
            <Card>
              <Heading>À demander au garage</Heading>
              {review.questionsForGarage.map((q) => (
                <ThemedText key={q}>• {q}</ThemedText>
              ))}
            </Card>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            Estimation indicative fondée sur les prix moyens constatés. Un garage peut justifier un écart (pièce d’origine, accès difficile).
          </ThemedText>
        </>
      ) : null}
    </Screen>
  );
}
