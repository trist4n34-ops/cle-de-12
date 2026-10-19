import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, Eyebrow, Row, Tag } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { knownIssuesFor, KnownIssue } from '@/data/known-issues';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import type { Vehicle } from '@/lib/diagnosis';

const LEVEL = {
  grave: { label: 'ki.level.grave', color: 'stop' },
  surveiller: { label: 'ki.level.surveiller', color: 'warn' },
  info: { label: 'ki.level.info', color: 'textSecondary' },
} as const satisfies Record<KnownIssue['severity'], { label: string; color: 'stop' | 'warn' | 'textSecondary' }>;

/** Pannes connues du moteur ou du modèle, gratuites pour tous. */
export function KnownIssues({ vehicle }: { vehicle: Vehicle }) {
  const theme = useTheme();
  const { t } = useT();
  const issues = knownIssuesFor(vehicle);
  const [open, setOpen] = useState<string | null>(null);
  if (!issues.length) return null;

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Eyebrow>{t('ki.title')}</Eyebrow>
        <Tag label={`${issues.length}`} />
      </Row>
      {issues.map((k) => {
        const expanded = open === k.id;
        return (
          <Pressable
            key={k.id}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setOpen(expanded ? null : k.id)}
            style={{ gap: Spacing.one, borderLeftWidth: 4, borderLeftColor: theme[LEVEL[k.severity].color], paddingLeft: Spacing.two }}>
            <ThemedText type="smallBold">{k.title}</ThemedText>
            <ThemedText type="small" style={{ color: theme[LEVEL[k.severity].color] }}>
              {t(LEVEL[k.severity].label)}
            </ThemedText>
            {expanded ? (
              <View style={{ gap: Spacing.one }}>
                <ThemedText type="small">
                  <ThemedText type="smallBold">{t('ki.signs')} </ThemedText>
                  {k.signs}
                </ThemedText>
                <ThemedText type="small">
                  <ThemedText type="smallBold">{t('ki.advice')} </ThemedText>
                  {k.advice}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {k.cost}
                </ThemedText>
              </View>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                {t('ki.tapHint')}
              </ThemedText>
            )}
          </Pressable>
        );
      })}
    </Card>
  );
}
