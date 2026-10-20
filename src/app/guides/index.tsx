import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Chip, Dots, Field, Heading, Row, Screen, Tag, Title } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatMinutes, Guide, GUIDE_CATEGORIES, GuideCategoryId, guidesByCategory, searchGuides } from '@/data/guides';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { usePremium } from '@/lib/purchases';
import { useStore } from '@/lib/store';

export default function GuidesScreen() {
  const { t, tn, num } = useT();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<GuideCategoryId | null>(null);

  const matches = useMemo(() => searchGuides(query), [query]);
  const counts = useMemo(() => {
    const n: Partial<Record<GuideCategoryId, number>> = {};
    for (const g of matches) n[g.category] = (n[g.category] ?? 0) + 1;
    return n;
  }, [matches]);
  const sections = useMemo(
    () => guidesByCategory(category ? matches.filter((g) => g.category === category) : matches),
    [matches, category],
  );

  const reset = () => {
    setQuery('');
    setCategory(null);
  };

  return (
    <Screen>
      <Title lede={t('guides.lede')}>{t('guides.title')}</Title>
      <Row>
        <Field
          label={t('guides.search.label')}
          placeholder={t('guides.search.placeholder')}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.chips}>
        <Chip label={`${t('guides.all')} · ${num(matches.length)}`} selected={category === null} onPress={() => setCategory(null)} />
        {GUIDE_CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            label={`${c.label} · ${num(counts[c.id] ?? 0)}`}
            selected={category === c.id}
            onPress={() => setCategory(category === c.id ? null : c.id)}
          />
        ))}
      </ScrollView>

      {sections.length ? (
        sections.map(({ category: c, guides }) => (
          <View key={c.id} style={{ gap: Spacing.two }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Heading>{c.label}</Heading>
              <ThemedText type="small" themeColor="textSecondary">
                {tn('guides.count', guides.length)}
              </ThemedText>
            </Row>
            <ThemedText type="small" themeColor="textSecondary">
              {c.description}
            </ThemedText>
            <View style={styles.grid}>
              {guides.map((g) => (
                <GuideCard key={g.id} guide={g} />
              ))}
            </View>
          </View>
        ))
      ) : (
        <View style={{ gap: Spacing.two, alignItems: 'flex-start' }}>
          <ThemedText themeColor="textSecondary">
            {!query.trim()
              ? t('guides.emptyCategory')
              : category
                ? t('guides.emptyInCategory', { query: query.trim() })
                : t('guides.empty', { query: query.trim() })}
          </ThemedText>
          <Button kind="ghost" label={t('guides.showAll')} onPress={reset} />
        </View>
      )}
    </Screen>
  );
}

function GuideCard({ guide: g }: { guide: Guide }) {
  const theme = useTheme();
  const { t, tn } = useT();
  const { state } = useStore();
  const { isPremium } = usePremium();
  const locked = g.premium && !isPremium;
  const done = (state.progress[g.id] ?? []).filter(Boolean).length;
  const myRating = state.guideFeedback?.[g.id]?.rating;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={locked ? t('guides.lockedA11y', { title: g.title }) : g.title}
      onPress={() => router.push(`/guides/${g.id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.line, opacity: pressed ? 0.8 : 1 },
      ]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Dots value={g.level} />
        <Row style={{ gap: Spacing.one }}>
          {g.garage ? <Tag label={t('guides.tag.garage')} /> : null}
          {g.premium ? <Tag label="Premium" premium={locked} /> : <Tag label={t('premium.free')} />}
        </Row>
      </Row>
      <ThemedText type="smallBold" style={{ fontSize: 17 }}>
        {g.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {formatMinutes(g.minutes)} · {tn('guides.steps', g.steps.length)}
        {done ? ` · ${t('guides.progress', { done, total: g.steps.length })}` : ''}
        {myRating ? ` · ${t('feedback.mine', { n: myRating })}` : ''}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: { gap: Spacing.two, paddingVertical: Spacing.one },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  card: { flexGrow: 1, flexBasis: 220, borderWidth: 1, borderRadius: 12, padding: Spacing.three, gap: Spacing.two },
});
