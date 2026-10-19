import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Dots, Row, Screen, Tag, Title } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { GUIDES } from '@/data/guides';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';

export default function GuidesScreen() {
  const theme = useTheme();
  const { state } = useStore();
  return (
    <Screen>
      <Title lede="Outillage, temps, niveau et couples de serrage. Cochez les étapes au fur et à mesure.">Guides pas à pas</Title>
      <View style={styles.grid}>
        {GUIDES.map((g) => {
          const done = (state.progress[g.id] ?? []).filter(Boolean).length;
          return (
            <Pressable
              key={g.id}
              accessibilityRole="button"
              onPress={() => router.push(`/guides/${g.id}`)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: theme.backgroundElement, borderColor: theme.line, opacity: pressed ? 0.8 : 1 },
              ]}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Dots value={g.level} />
                <Tag label={g.premium ? 'Premium' : 'Gratuit'} premium={g.premium} />
              </Row>
              <ThemedText type="smallBold" style={{ fontSize: 17 }}>
                {g.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {g.minutes} min · {g.steps.length} étapes{done ? ` · ${done}/${g.steps.length} faites` : ''}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  card: { flexGrow: 1, flexBasis: 220, borderWidth: 1, borderRadius: 12, padding: Spacing.three, gap: Spacing.two },
});
