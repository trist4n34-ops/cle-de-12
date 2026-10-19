/** Données en direct du dongle OBD2 : une tuile par mesure, colorée selon la plage normale. */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Eyebrow, Row, Tag } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { PIDS } from '@/features/obd/elm327';
import type { LiveReading } from '@/features/obd/obd-session';
import type { ObdReader } from '@/features/obd/use-obd-reader';
import { useTheme } from '@/hooks/use-theme';

/** Format français : virgule décimale, espace fine insécable pour les milliers, signe + si demandé. */
export function formatLiveValue(reading: LiveReading): string {
  if (reading.value === null) return '—';
  const def = PIDS[reading.pid];
  const decimals = def?.decimals ?? 0;
  const fixed = Math.abs(reading.value).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const isZero = Number(fixed) === 0;
  const sign = reading.value < 0 && !isZero ? '−' : def?.signed && !isZero ? '+' : '';
  return `${sign}${grouped}${dec ? `,${dec}` : ''}`;
}

function Tile({ reading }: { reading: LiveReading }) {
  const theme = useTheme();
  const warn = reading.status === 'warn';
  const ok = reading.status === 'ok';
  const valueColor = warn ? theme.warn : ok ? theme.ok : theme.text;
  const value = formatLiveValue(reading);
  return (
    <View
      accessible
      accessibilityLabel={`${reading.label} : ${reading.value === null ? 'non disponible' : `${value} ${reading.unit}`}${
        warn ? `, hors plage normale. ${reading.hint ?? ''}` : ''
      }`}
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
  const running = obd.liveState === 'connecting' || obd.liveState === 'on';
  const busy = obd.status === 'searching' || obd.status === 'reading';
  const readings = obd.live ?? [];
  const warnings = readings.filter((r) => r.status === 'warn').length;
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Eyebrow>Données en direct</Eyebrow>
        {obd.liveState === 'on' ? <Tag label="En direct" /> : null}
      </Row>
      <ThemedText type="small" themeColor="textSecondary">
        Contact mis ou moteur tournant, suivez le régime, la température, la charge de la batterie et les corrections de richesse, actualisés chaque seconde.
      </ThemedText>
      <Row>
        {running ? (
          <Button kind="ghost" label="Arrêter" onPress={obd.stopLive} loading={obd.liveState === 'connecting'} />
        ) : (
          <Button label="Afficher les données en direct" onPress={obd.startLive} disabled={busy} />
        )}
        {obd.liveState === 'on' && readings.length ? (
          <ThemedText type="small" themeColor={warnings ? 'warn' : 'textSecondary'}>
            {warnings ? `${warnings} valeur${warnings > 1 ? 's' : ''} hors plage normale` : 'Toutes les valeurs sont dans la plage normale'}
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
