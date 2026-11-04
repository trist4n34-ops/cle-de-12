import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, LockBox, Row } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useT } from '@/i18n';
import { errorText } from '@/i18n/errors';
import { ApiError } from '@/lib/api';
import { usePremium } from '@/lib/purchases';

/**
 * Erreur d'un appel IA, traduite. Quota épuisé ou fonction Premium (402) :
 * l'offre Premium, et l'achat d'un diagnostic à l'unité si `credit` est vrai.
 */
export function ApiErrorNotice({
  error,
  fallback,
  credit,
  onPurchased,
}: {
  error: unknown;
  fallback?: string;
  /** Proposer le diagnostic à l'unité (seulement pour le diagnostic, hors photo). */
  credit?: boolean;
  onPurchased?: () => void;
}) {
  const i18n = useT();
  const { t } = i18n;
  const { buyCredit, creditPrice } = usePremium();
  const [buying, setBuying] = useState(false);
  const [note, setNote] = useState('');
  const text = errorText(error, i18n, fallback);

  if (!(error instanceof ApiError) || error.status !== 402) return <ThemedText>{text}</ThemedText>;

  const canBuy = credit && error.code !== 'premium_required';
  return (
    <View style={{ gap: Spacing.two }}>
      <LockBox text={text} onUnlock={() => router.push('/premium')} />
      {canBuy ? (
        <Row>
          <Button
            kind="ghost"
            loading={buying}
            label={t('diag.buyOne', { price: creditPrice })}
            onPress={async () => {
              setBuying(true);
              setNote('');
              try {
                if (await buyCredit()) onPurchased?.();
                else setNote(t('common.purchaseCancelled'));
              } catch {
                setNote(t('common.paymentFailed'));
              } finally {
                setBuying(false);
              }
            }}
          />
        </Row>
      ) : null}
      {note ? (
        <ThemedText type="small" themeColor="textSecondary">
          {note}
        </ThemedText>
      ) : null}
    </View>
  );
}
