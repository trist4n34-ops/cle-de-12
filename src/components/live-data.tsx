/** Données en direct du dongle OBD2 : une tuile par mesure, colorée selon la plage normale. */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Eyebrow, Row, Tag } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { PIDS } from '@/features/obd/elm327';
import type { LiveReading } from '@/features/obd/obd-session';
import type { ObdReader } from '@/features/obd/use-obd-reader';
import { useTheme } from '@/hooks/use-theme';
import { currentLocale, useT } from '@/i18n';

/** Format de la locale active (séparateurs décimal et des milliers), signe − typographique, + si demandé. */
export function formatLiveValue(reading: LiveReading, locale: string = currentLocale()): string {
  if (reading.value === null) return '—';
  const def = PIDS[reading.pid];
  const decimals = def?.decimals ?? 0;
  const rounded = Number(Math.abs(reading.value).toFixed(decimals));
  const body = rounded.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const isZero = rounded === 0;
  const sign = reading.value < 0 && !isZero ? '−' : def?.signed && !isZero ? '+' : '';
  return `${sign}${body}`;
}

function Tile({ reading }: { reading: LiveReading }) {
  const theme = useTheme();
  const { t, locale } = useT();
  const warn = reading.status === 'warn';
  const ok = reading.status === 'ok';
  const valueColor = warn ? theme.warn : ok ? theme.ok : theme.text;
  const value = formatLiveValue(reading, locale);
  return (
    <View
      accessible
      accessibilityLabel={`${t('live.a11y.value', {
        label: reading.label,
        value: reading.value === null ? t('live.a11y.unavailable') : `${value} ${reading.unit}`,
      })}${warn ? t('live.a11y.outOfRange', { hint: reading.hint ?? '' }) : ''}`}
      style={[
        styles.tile,
        {
          backgroundColor: warn ? theme.warnBg : theme.backgroundElement,
          borderColor: warn ? theme.warn : theme.line,
          borderLeftColor: warn ? theme.warn : ok ? theme.ok : theme.line,
        },
      ]}>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
        {reading.label}
      </ThemedText>
      <View style={styles.valueRow}>
        <ThemedText style={[styles.value, { color: valueColor }]}>{value}</ThemedText>
        {reading.value !== null ? (
          <ThemedText type="smallBold" themeColor="textSecondary">
            {reading.unit}
          </ThemedText>
        ) : null}
      </View>
      {warn && reading.hint ? <ThemedText type="small">{reading.hint}</ThemedText> : null}
    </View>
  );
}

type Props = {
  obd: Pick<ObdReader, 'live' | 'liveState' | 'liveMessage' | 'startLive' | 'stopLive' | 'status'>;
};

export function LiveData({ obd }: Props) {
  const { t, tn } = useT();
  const running = obd.liveState === 'connecting' || obd.liveState === 'on';
  const busy = obd.status === 'searching' || obd.status === 'reading';
  const readings = obd.live ?? [];
  const warnings = readings.filter((r) => r.status === 'warn').length;
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Eyebrow>{t('live.title')}</Eyebrow>
        {obd.liveState === 'on' ? <Tag label={t('live.on')} /> : null}
      </Row>
      <ThemedText type="small" themeColor="textSecondary">
        {t('live.intro')}
      </ThemedText>
      <Row>
        {running ? (
          <Button kind="ghost" label={t('live.stop')} onPress={obd.stopLive} loading={obd.liveState === 'connecting'} />
        ) : (
          <Button label={t('live.start')} onPress={obd.startLive} disabled={busy} />
        )}
        {obd.liveState === 'on' && readings.length ? (
          <ThemedText type="small" themeColor={warnings ? 'warn' : 'textSecondary'}>
            {warnings ? tn('live.warnings', warnings) : t('live.allOk')}
          </ThemedText>
        ) : null}
      </Row>
      {obd.liveMessage ? <ThemedText type="small">{obd.liveMessage}</ThemedText> : null}
      {readings.length ? (
        <View style={styles.grid}>
          {readings.map((r) => (
            <Tile key={`${r.pid}-${r.source}`} reading={r} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: {
    flexGrow: 1,
    flexBasis: 150,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: Spacing.two + Spacing.one,
    gap: Spacing.one,
  },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.one, flexWrap: 'wrap' },
  value: { fontSize: 28, lineHeight: 32, fontWeight: 800, fontVariant: ['tabular-nums'] },
});
