import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Tag } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { type Plan, type PlanId } from '@/lib/plans';

/**
 * Choix de la formule : mensuel sans engagement (sélectionné par défaut) ou
 * annuel moins cher. Un seul bouton d'achat reprend le prix choisi.
 */
export function PlanPicker({
  plans,
  savings,
  busy,
  onChoose,
}: {
  plans: Plan[];
  savings: number | null;
  busy: boolean;
  onChoose: (plan: Plan) => void;
}) {
  const theme = useTheme();
  const { t } = useT();
  const [selected, setSelected] = useState<PlanId>(plans.some((p) => p.id === 'monthly') ? 'monthly' : (plans[0]?.id ?? 'monthly'));
  const plan = plans.find((p) => p.id === selected) ?? plans[0];
  if (!plan) return null;

  const priceLabel = (p: Plan) => t(p.id === 'monthly' ? 'premium.plan.perMonth' : 'premium.plan.perYear', { price: p.price });

  return (
    <View accessibilityRole="radiogroup" style={{ gap: Spacing.two }}>
      <ThemedText type="smallBold">{t('premium.plan.title')}</ThemedText>
      {plans.map((p) => {
        const on = p.id === selected;
        return (
          <Pressable
            key={p.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${t(p.id === 'monthly' ? 'premium.plan.monthly' : 'premium.plan.annual')}, ${priceLabel(p)}`}
            onPress={() => setSelected(p.id)}
            style={{
              borderWidth: 2,
              borderRadius: 12,
              borderColor: on ? theme.accent : theme.line,
              backgroundColor: theme.backgroundElement,
              padding: Spacing.three,
              gap: 2,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: theme.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accent }} /> : null}
              </View>
              <ThemedText type="smallBold" style={{ flex: 1 }}>
                {t(p.id === 'monthly' ? 'premium.plan.monthly' : 'premium.plan.annual')}
              </ThemedText>
              {p.id === 'annual' && savings ? <Tag label={t('premium.plan.save', { percent: savings })} premium /> : null}
            </View>
            <ThemedText style={{ fontSize: 22, fontWeight: 800 }}>{priceLabel(p)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {p.id === 'monthly'
                ? t('premium.plan.monthlyNote')
                : p.perMonth
                  ? t('premium.plan.annualNote', { perMonth: p.perMonth })
                  : t('premium.plan.annualNoteShort')}
            </ThemedText>
          </Pressable>
        );
      })}
      <Button kind="signal" loading={busy} label={t('premium.plan.cta', { price: priceLabel(plan) })} onPress={() => onChoose(plan)} />
      <ThemedText type="small" themeColor="textSecondary">
        {t('premium.plan.trialNote', { price: priceLabel(plan) })}
      </ThemedText>
    </View>
  );
}
