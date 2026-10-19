import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useT } from '@/i18n';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AppTabs() {
  const { t } = useT();
  return (
    <Tabs>
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="(diag)" href="/" asChild>
            <TabButton>{t('tabs.diagnostic')}</TabButton>
          </TabTrigger>
          <TabTrigger name="guides" href="/guides" asChild>
            <TabButton>{t('tabs.guides')}</TabButton>
          </TabTrigger>
          <TabTrigger name="garage" href="/garage" asChild>
            <TabButton>{t('tabs.garage')}</TabButton>
          </TabTrigger>
          <TabTrigger name="premium" href="/premium" asChild>
            <TabButton>Premium</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
      <TabSlot style={{ flex: 1 }} />
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ref: _ref, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="smallBold" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const { width } = useWindowDimensions();
  const narrow = width < 600;
  return (
    <ThemedView {...props} style={[styles.tabListContainer, narrow && { padding: Spacing.two }]}>
      <ThemedView
        type="backgroundElement"
        style={[styles.innerContainer, narrow && { paddingHorizontal: Spacing.two, justifyContent: 'space-between', gap: 0 }]}>
        {narrow ? null : (
          <ThemedText type="smallBold" style={styles.brandText}>
            Clé de 12
          </ThemedText>
        )}
        {props.children}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    flexWrap: 'wrap',
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
  },
});
