import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { KnownIssues } from '@/components/known-issues';
import { Button, Card, Chip, Field, Heading, LockBox, Row, Screen, Tag, Title, Verdict } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { Due, maintenanceDue } from '@/data/maintenance';
import { useTheme } from '@/hooks/use-theme';
import { LANGUAGES, useT } from '@/i18n';
import { vehicleLabel } from '@/lib/diagnosis';
import { exportLog } from '@/lib/export-log';
import { usePremium } from '@/lib/purchases';
import { newId, useCurrentVehicle, useStore } from '@/lib/store';

export default function GarageScreen() {
  const theme = useTheme();
  const { t, num, date: fmtDate } = useT();
  const { state, update } = useStore();
  const { isPremium } = usePremium();
  const current = useCurrentVehicle();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState('');
  const [operation, setOperation] = useState('');

  const log = state.log.filter((l) => l.vehicleId === current?.id).sort((a, b) => b.date.localeCompare(a.date));

  const [exportMsg, setExportMsg] = useState('');
  const due = current ? maintenanceDue(current, state.log) : [];

  const record = (op: string, km: string, day: string) => {
    if (!current) return;
    update((s) => ({
      ...s,
      log: [...s.log, { id: newId(), vehicleId: current.id, date: day, mileage: km.replace(/\D/g, ''), operation: op }],
    }));
  };

  const addEntry = () => {
    if (!current || !operation.trim()) return;
    record(operation.trim(), mileage, date);
    setOperation('');
    setMileage('');
  };

  return (
    <Screen>
      <Title lede={t('garage.lede')}>{t('garage.title')}</Title>

      <Card>
        <Heading>{t('garage.vehicles')}</Heading>
        {state.vehicles.length ? (
          state.vehicles.map((v) => (
            <Row key={v.id} style={{ justifyContent: 'space-between' }}>
              <ThemedText type={v.id === current?.id ? 'smallBold' : 'small'} style={{ flex: 1 }}>
                {vehicleLabel(v)}
                {v.plate ? ` · ${v.plate}` : ''}
              </ThemedText>
              {v.id !== current?.id ? (
                <Button kind="ghost" label={t('garage.select')} onPress={() => update((s) => ({ ...s, vehicleId: v.id }))} />
              ) : null}
              <Button
                kind="ghost"
                label={t('garage.remove')}
                onPress={() =>
                  update((s) => ({
                    ...s,
                    vehicles: s.vehicles.filter((x) => x.id !== v.id),
                    vehicleId: s.vehicleId === v.id ? (s.vehicles.find((x) => x.id !== v.id)?.id ?? null) : s.vehicleId,
                    log: s.log.filter((l) => l.vehicleId !== v.id),
                  }))
                }
              />
            </Row>
          ))
        ) : (
          <ThemedText themeColor="textSecondary">{t('garage.noVehicle')}</ThemedText>
        )}
        {current && (current.fuel === 'Hybride' || current.fuel === 'Électrique') ? (
          <Verdict urgency="stop" title={t('garage.hv.title')} reason={t('garage.hv.reason')} />
        ) : null}
      </Card>

      {current ? <KnownIssues vehicle={current} /> : null}

      {current ? (
        <Card>
          <Heading>{t('garage.maintenance.title')}</Heading>
          <ThemedText type="small" themeColor="textSecondary">
            {t('garage.maintenance.note')}
          </ThemedText>
          {due.map((d) => (
            <DueRow
              key={d.item.id}
              due={d}
              onDone={isPremium ? () => record(d.item.title, current.mileage, new Date().toISOString().slice(0, 10)) : undefined}
            />
          ))}
        </Card>
      ) : null}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Heading>{t('garage.log.title')}</Heading>
          {isPremium && current ? (
            <Button
              kind="ghost"
              label={t('garage.log.export')}
              onPress={() => exportLog(current, state.log).catch(() => setExportMsg(t('garage.log.exportFailed')))}
            />
          ) : null}
        </Row>
        {exportMsg ? <ThemedText type="small">{exportMsg}</ThemedText> : null}
        {!isPremium ? (
          <LockBox text={t('garage.log.locked')} onUnlock={() => router.push('/premium')} />
        ) : !current ? null : (
          <>
            {log.map((l) => (
              <Row key={l.id} style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.line, paddingTop: Spacing.two }}>
                <ThemedText type="code">{l.date}</ThemedText>
                <ThemedText type="code">{l.mileage ? `${num(Number(l.mileage))} km` : ''}</ThemedText>
                <ThemedText style={{ flexBasis: '100%' }}>{l.operation}</ThemedText>
              </Row>
            ))}
            <Row style={{ alignItems: 'flex-end' }}>
              <Field label={t('garage.log.date')} value={date} onChangeText={setDate} placeholder="2026-10-19" />
              <Field
                label={t('garage.log.mileage')}
                keyboardType="number-pad"
                value={mileage}
                onChangeText={setMileage}
                placeholder="98000"
              />
              <Field
                label={t('garage.log.operation')}
                value={operation}
                onChangeText={setOperation}
                placeholder={t('garage.log.operationPlaceholder')}
              />
              <Button label={t('garage.log.add')} disabled={!operation.trim()} onPress={addEntry} />
            </Row>
          </>
        )}
      </Card>

      <Card>
        <Heading>{t('garage.history.title')}</Heading>
        {state.history.length ? (
          state.history.map((h) => (
            <Pressable key={h.id} accessibilityRole="button" onPress={() => router.push(`/result/${h.id}`)}>
              <View style={{ gap: 2, paddingVertical: Spacing.two, borderTopWidth: 1, borderTopColor: theme.line }}>
                <ThemedText type="small" themeColor="textSecondary">
                  {fmtDate(h.date)} · {h.vehicleLabel}
                </ThemedText>
                <ThemedText type="smallBold">{h.symptoms || h.codes.join(', ')}</ThemedText>
              </View>
            </Pressable>
          ))
        ) : (
          <ThemedText themeColor="textSecondary">{t('garage.history.empty')}</ThemedText>
        )}
      </Card>

      <LanguageCard />
    </Screen>
  );
}

/** Choix de la langue de l'interface ; sans choix, l'app suit l'appareil. */
function LanguageCard() {
  const { t, lang, override, setLanguage } = useT();
  return (
    <Card>
      <Heading>{t('garage.language.title')}</Heading>
      <Row>
        {LANGUAGES.map((l) => (
          <Chip key={l.code} label={l.name} selected={l.code === lang} onPress={() => setLanguage(l.code)} />
        ))}
      </Row>
      <ThemedText type="small" themeColor="textSecondary">
        {t('garage.language.hint')}
      </ThemedText>
      {override ? (
        <Row>
          <Button kind="ghost" label={t('garage.language.useDevice')} onPress={() => setLanguage(null)} />
        </Row>
      ) : null}
    </Card>
  );
}

const STATUS = {
  retard: { label: 'garage.status.retard', color: 'stop' },
  bientot: { label: 'garage.status.bientot', color: 'warn' },
  ok: { label: 'garage.status.ok', color: 'ok' },
  inconnu: { label: 'garage.status.inconnu', color: 'textSecondary' },
} as const satisfies Record<Due['status'], { label: string; color: 'stop' | 'warn' | 'ok' | 'textSecondary' }>;

function DueRow({ due, onDone }: { due: Due; onDone?: () => void }) {
  const theme = useTheme();
  const { t, tn, num, date } = useT();
  const st = STATUS[due.status];
  const months = due.item.everyMonths;
  const or = t('garage.due.or');
  const interval = [
    due.item.everyKm ? t('garage.due.everyKm', { km: num(due.item.everyKm) }) : '',
    months ? (months % 12 === 0 ? tn('garage.due.years', months / 12) : tn('garage.due.months', months)) : '',
  ]
    .filter(Boolean)
    .join(or);
  const next = [
    due.nextKm ? t('garage.due.nextKm', { km: num(due.nextKm) }) : '',
    due.nextDate ? t('garage.due.nextDate', { date: date(due.nextDate) }) : '',
  ]
    .filter(Boolean)
    .join(or);
  return (
    <View style={{ gap: 2, borderTopWidth: 1, borderTopColor: theme.line, paddingTop: Spacing.two }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <ThemedText type="smallBold" style={{ flexShrink: 1 }}>
          {due.item.title}
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: theme[st.color] }}>
          {t(st.label)}
        </ThemedText>
      </Row>
      <ThemedText type="small" themeColor="textSecondary">
        {[
          interval,
          next ? t('garage.due.next', { next }) : '',
          due.last ? t('garage.due.last', { date: date(due.last.date) }) : '',
        ]
          .filter(Boolean)
          .join(' · ')}
      </ThemedText>
      {due.item.note ? (
        <ThemedText type="small" themeColor="textSecondary">
          {due.item.note}
        </ThemedText>
      ) : null}
      <Row>
        {due.item.guideId ? (
          <Button kind="ghost" label={t('garage.due.guide')} onPress={() => router.push(`/guides/${due.item.guideId}`)} />
        ) : null}
        {onDone && due.status !== 'ok' ? <Button kind="ghost" label={t('garage.due.doneToday')} onPress={onDone} /> : null}
        {!onDone && due.status === 'retard' ? <Tag label={t('garage.due.premiumReminder')} /> : null}
      </Row>
    </View>
  );
}
