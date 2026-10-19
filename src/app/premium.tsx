import { useState } from 'react';
import { View } from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Eyebrow, Row, Screen, Tag, Title } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type TKey, useT } from '@/i18n';
import { usePremium } from '@/lib/purchases';
import { FREE_CT_REPORTS_PER_MONTH, FREE_DIAGNOSES_PER_MONTH, FREE_QUOTES_PER_MONTH, useStore } from '@/lib/store';

/** Valeur d'une colonne : inclus ou non, ou un texte (clé traduite, ou nombre par mois). */
type Value = boolean | TKey | { perMonth: number };
type Feature = [label: TKey, free: Value, premium: Value];

const FEATURES: Feature[] = [
  ['premium.feature.obd', true, true],
  ['premium.feature.verdict', true, true],
  ['premium.feature.causes', true, true],
  ['premium.feature.catalog', true, true],
  ['premium.feature.knownIssues', true, true],
  ['premium.feature.tools', true, true],
  ['premium.feature.aiDiagnoses', { perMonth: FREE_DIAGNOSES_PER_MONTH }, 'premium.value.unlimitedDiagnoses'],
  ['premium.feature.quotes', { perMonth: FREE_QUOTES_PER_MONTH }, 'premium.value.unlimitedAnalyses'],
  ['premium.feature.ctReports', { perMonth: FREE_CT_REPORTS_PER_MONTH }, 'premium.value.unlimitedAnalyses'],
  ['premium.feature.live', false, true],
  ['premium.feature.guides', true, true],
  ['premium.feature.photo', false, true],
  ['premium.feature.plan', false, true],
  ['premium.feature.chat', false, true],
  ['premium.feature.advancedGuides', false, true],
  ['premium.feature.multiVehicle', false, true],
];

export default function PremiumScreen() {
  const theme = useTheme();
  const { t, tn } = useT();
  const { isPremium, demo, packages, purchase, restore, setDemo, buyCredit, creditPrice } = usePremium();
  const { state } = useStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const buy = async (pkg: PurchasesPackage) => {
    setBusy(true);
    setMessage('');
    try {
      if (await purchase(pkg)) setMessage(t('premium.msg.activated'));
    } catch {
      setMessage(t('common.paymentFailed'));
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async () => {
    setBusy(true);
    try {
      setMessage((await restore()) ? t('premium.msg.restored') : t('premium.msg.noSubscription'));
    } catch {
      setMessage(t('premium.msg.restoreFailed'));
    } finally {
      setBusy(false);
    }
  };

  const valueText = (v: Value) =>
    typeof v === 'string'
      ? t(v)
      : typeof v === 'object'
        ? t('premium.value.perMonth', { count: v.perMonth })
        : '';

  const column = (premium: boolean) =>
    FEATURES.map(([label, free, pro]) => {
      const v = premium ? pro : free;
      const text = valueText(v);
      return (
        <Row key={label} style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <ThemedText style={{ width: 20, color: v ? theme.ok : theme.textSecondary, fontWeight: 700 }}>{v ? '✓' : '–'}</ThemedText>
          <ThemedText type="small" themeColor={v ? 'text' : 'textSecondary'} style={{ flex: 1 }}>
            {t(label)}
            {text ? `${t('premium.value.separator')}${text}` : ''}
          </ThemedText>
        </Row>
      );
    });

  return (
    <Screen>
      <Title lede={t('premium.lede')}>{t('premium.title')}</Title>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }}>
        <Card style={{ flexGrow: 1, flexBasis: 260 }}>
          <Eyebrow>{t('premium.free')}</Eyebrow>
          <ThemedText style={{ fontSize: 36, fontWeight: 800 }}>{t('premium.price.free')}</ThemedText>
          {column(false)}
        </Card>
        <Card style={{ flexGrow: 1, flexBasis: 260, borderColor: theme.signal, borderWidth: 2 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Eyebrow>Premium</Eyebrow>
            <Tag label={t('premium.trial')} premium />
          </Row>
          {demo ? (
            <>
              <ThemedText style={{ fontSize: 36, fontWeight: 800 }}>
                {t('premium.price.annual')}
                <ThemedText themeColor="textSecondary">{t('premium.price.perYear')}</ThemedText>
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('premium.price.orMonthly')}
              </ThemedText>
            </>
          ) : null}
          {column(true)}
          {isPremium ? (
            <Tag label={t('premium.active')} premium />
          ) : demo ? (
            <Button kind="signal" label={t('premium.tryDemo')} onPress={() => setDemo(true)} />
          ) : (
            packages.map((pkg) => (
              <Button
                key={pkg.identifier}
                kind="signal"
                loading={busy}
                label={`${pkg.product.title || 'Premium'} · ${pkg.product.priceString}`}
                onPress={() => buy(pkg)}
              />
            ))
          )}
          {!demo ? <Button kind="ghost" label={t('premium.restore')} onPress={doRestore} disabled={busy} /> : null}
          {demo && isPremium ? <Button kind="ghost" label={t('premium.backToFree')} onPress={() => setDemo(false)} /> : null}
          {message ? <ThemedText type="small">{message}</ThemedText> : null}
        </Card>
      </View>
      {!isPremium ? (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, minWidth: 200, gap: Spacing.one }}>
              <Eyebrow>{t('premium.oneOff.eyebrow')}</Eyebrow>
              <ThemedText type="smallBold">{t('premium.oneOff.title', { price: creditPrice })}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('premium.oneOff.body')}
                {state.credits ? ` ${tn('premium.oneOff.credits', state.credits)}` : ''}
              </ThemedText>
            </View>
            <Button
              kind="ghost"
              label={t('premium.oneOff.buy')}
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  setMessage((await buyCredit()) ? t('premium.oneOff.added') : t('common.purchaseCancelled'));
                } catch {
                  setMessage(t('common.paymentFailed'));
                } finally {
                  setBusy(false);
                }
              }}
            />
          </Row>
        </Card>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary">
        {demo ? t('premium.demoNote') : t('premium.renewNote')}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('premium.disclaimer')}
      </ThemedText>
    </Screen>
  );
}
