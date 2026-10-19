import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, Eyebrow, Row, Tag } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { knownIssuesFor, KnownIssue } from '@/data/known-issues';
import { useTheme } from '@/hooks/use-theme';
import type { Vehicle } from '@/lib/diagnosis';

const LEVEL: Record<KnownIssue['severity'], { label: string; color: 'stop' | 'warn' | 'textSecondary' }> = {
  grave: { label: 'À surveiller de près', color: 'stop' },
  surveiller: { label: 'Fréquent', color: 'warn' },
  info: { label: 'Bon à savoir', color: 'textSecondary' },
};

/** Pannes connues du moteur ou du modèle, gratuites pour tous. */
export function KnownIssues({ vehicle }: { vehicle: Vehicle }) {
  const theme = useTheme();
  const issues = knownIssuesFor(vehicle);
  const [open, setOpen] = useState<string | null>(null);
  if (!issues.length) return null;

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Eyebrow>Pannes connues sur ce véhicule</Eyebrow>
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
              {LEVEL[k.severity].label}
            </ThemedText>
            {expanded ? (
              <View style={{ gap: Spacing.one }}>
                <ThemedText type="small">
                  <ThemedText type="smallBold">Signes : </ThemedText>
                  {k.signs}
                </ThemedText>
                <ThemedText type="small">
                  <ThemedText type="smallBold">Que faire : </ThemedText>
                  {k.advice}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {k.cost}
                </ThemedText>
              </View>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Toucher pour voir les signes et que faire
              </ThemedText>
            )}
          </Pressable>
        );
      })}
    </Card>
  );
}
