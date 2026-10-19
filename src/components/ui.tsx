/** Composants de base de l'interface Clé de 12. */
import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useT } from '@/i18n';
import type { Urgency } from '@/lib/diagnosis';
import { useTheme } from '@/hooks/use-theme';

export function Screen({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.column}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Title({ children, lede }: { children: string; lede?: string }) {
  return (
    <View style={{ gap: Spacing.one }}>
      <ThemedText style={styles.title}>{children}</ThemedText>
      {lede ? <ThemedText themeColor="textSecondary">{lede}</ThemedText> : null}
    </View>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return <ThemedText style={styles.heading}>{children}</ThemedText>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.eyebrow}>
      {children}
    </ThemedText>
  );
}

export function Card({ style, ...props }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.line }, style]}
      {...props}
    />
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'signal';
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
};

export function Button({ label, onPress, kind = 'primary', disabled, loading, accessibilityHint }: ButtonProps) {
  const theme = useTheme();
  const bg = kind === 'primary' ? theme.accent : kind === 'signal' ? theme.signal : 'transparent';
  const fg = kind === 'primary' ? theme.accentText : kind === 'signal' ? theme.signalText : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: kind === 'ghost' ? theme.line : bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : null}
      <ThemedText type="smallBold" style={{ color: fg, flexShrink: 1, textAlign: 'center' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? theme.accent : theme.line, backgroundColor: selected ? theme.accent : theme.backgroundElement },
      ]}>
      <ThemedText type="small" style={{ color: selected ? theme.accentText : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function Tag({ label, premium }: { label: string; premium?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: premium ? theme.signal : theme.backgroundSelected }]}>
      <ThemedText style={[styles.tagText, { color: premium ? theme.signalText : theme.textSecondary }]}>{label}</ThemedText>
    </View>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          { color: theme.text, borderColor: theme.line, backgroundColor: theme.backgroundElement },
          props.multiline && { minHeight: 96, textAlignVertical: 'top' },
        ]}
        {...props}
      />
    </View>
  );
}

const VERDICT = {
  ok: { label: 'verdict.ok', fg: 'ok', bg: 'okBg' },
  prudence: { label: 'verdict.prudence', fg: 'warn', bg: 'warnBg' },
  stop: { label: 'verdict.stop', fg: 'stop', bg: 'stopBg' },
} as const satisfies Record<Urgency, { label: string; fg: 'ok' | 'warn' | 'stop'; bg: 'okBg' | 'warnBg' | 'stopBg' }>;

export function Verdict({ urgency, reason, title }: { urgency: Urgency; reason?: string; title?: string }) {
  const theme = useTheme();
  const { t } = useT();
  const v = VERDICT[urgency];
  return (
    <View style={[styles.verdict, { backgroundColor: theme[v.bg], borderLeftColor: theme[v.fg] }]}>
      <ThemedText style={[styles.verdictTitle, { color: theme[v.fg] }]}>{title ?? t(v.label)}</ThemedText>
      {reason ? <ThemedText>{reason}</ThemedText> : null}
    </View>
  );
}

export function Dots({ value }: { value: number }) {
  const theme = useTheme();
  const { t } = useT();
  const n = Math.max(1, Math.min(5, Math.round(value)));
  return (
    <ThemedText accessibilityLabel={t('ui.difficulty', { n })} style={{ color: theme.accent, letterSpacing: 2 }}>
      {'●'.repeat(n)}
      {'○'.repeat(5 - n)}
    </ThemedText>
  );
}

export function LockBox({ text, onUnlock }: { text: string; onUnlock: () => void }) {
  const theme = useTheme();
  const { t } = useT();
  return (
    <View style={[styles.lock, { borderColor: theme.line, backgroundColor: theme.backgroundSelected }]}>
      <View style={{ flex: 1, gap: Spacing.one, minWidth: 180 }}>
        <Tag label="Premium" premium />
        <ThemedText type="small" themeColor="textSecondary">
          {text}
        </ThemedText>
      </View>
      <Button label={t('ui.unlock')} kind="signal" onPress={onUnlock} />
    </View>
  );
}

export function Row({ style, ...props }: ViewProps) {
  return <View style={[styles.row, style]} {...props} />;
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: BottomTabInset + Spacing.five, alignItems: 'center' },
  column: { width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: Spacing.three, paddingTop: Spacing.three, gap: Spacing.three },
  title: { fontSize: 30, lineHeight: 34, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: 800, textTransform: 'uppercase' },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 },
  card: { borderWidth: 1, borderRadius: 12, padding: Spacing.three, gap: Spacing.three },
  button: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  tag: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 },
  field: { gap: Spacing.one, flexGrow: 1, flexBasis: 150 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  verdict: { borderLeftWidth: 6, borderRadius: 10, padding: Spacing.three, gap: Spacing.one },
  verdictTitle: { fontSize: 20, fontWeight: 800, textTransform: 'uppercase' },
  lock: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: Spacing.three,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.three,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'center' },
});
