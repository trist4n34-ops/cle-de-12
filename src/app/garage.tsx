import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { KnownIssues } from '@/components/known-issues';
import { Button, Card, Field, Heading, LockBox, Row, Screen, Tag, Title, Verdict } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { Due, maintenanceDue } from '@/data/maintenance';
import { useTheme } from '@/hooks/use-theme';
import { vehicleLabel } from '@/lib/diagnosis';
import { exportLog } from '@/lib/export-log';
import { usePremium } from '@/lib/purchases';
import { newId, useCurrentVehicle, useStore } from '@/lib/store';

export default function GarageScreen() {
  const theme = useTheme();
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
      <Title lede="Vos véhicules, le carnet d'entretien et l'historique des diagnostics.">Mon garage</Title>

      <Card>
        <Heading>Véhicules</Heading>
        {state.vehicles.length ? (
          state.vehicles.map((v) => (
            <Row key={v.id} style={{ justifyContent: 'space-between' }}>
              <ThemedText type={v.id === current?.id ? 'smallBold' : 'small'} style={{ flex: 1 }}>
                {vehicleLabel(v)}
                {v.plate ? ` · ${v.plate}` : ''}
              </ThemedText>
              {v.id !== current?.id ? (
                <Button kind="ghost" label="Choisir" onPress={() => update((s) => ({ ...s, vehicleId: v.id }))} />
              ) : null}
              <Button
                kind="ghost"
                label="Retirer"
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
          <ThemedText themeColor="textSecondary">Ajoutez votre véhicule depuis l’onglet Diagnostic.</ThemedText>
        )}
        {current && (current.fuel === 'Hybride' || current.fuel === 'Électrique') ? (
          <Verdict
            urgency="stop"
            title="Haute tension"
            reason="Ne touchez à aucun câble orange ni à la batterie de traction. Batterie 12 V, freins, pneus et liquides restent accessibles."
          />
        ) : null}
      </Card>

      {current ? <KnownIssues vehicle={current} /> : null}

      {current ? (
        <Card>
          <Heading>Entretien à prévoir</Heading>
          <ThemedText type="small" themeColor="textSecondary">
            Calculé à partir du kilométrage et de votre carnet. Les intervalles sont des valeurs courantes : le carnet constructeur prime.
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
          <Heading>Carnet d’entretien</Heading>
          {isPremium && current ? (
            <Button
              kind="ghost"
              label="Exporter en PDF"
              onPress={() => exportLog(current, state.log).catch(() => setExportMsg('Export impossible sur cet appareil.'))}
            />
          ) : null}
        </Row>
        {exportMsg ? <ThemedText type="small">{exportMsg}</ThemedText> : null}
        {!isPremium ? (
          <LockBox
            text="Suivez vos entretiens, gardez une trace pour la revente et recevez un rappel avant la prochaine vidange."
            onUnlock={() => router.push('/premium')}
          />
        ) : !current ? null : (
          <>
            {log.map((l) => (
              <Row key={l.id} style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.line, paddingTop: Spacing.two }}>
                <ThemedText type="code">{l.date}</ThemedText>
                <ThemedText type="code">{l.mileage ? `${Number(l.mileage).toLocaleString('fr-FR')} km` : ''}</ThemedText>
                <ThemedText style={{ flexBasis: '100%' }}>{l.operation}</ThemedText>
              </Row>
            ))}
            <Row style={{ alignItems: 'flex-end' }}>
              <Field label="Date" value={date} onChangeText={setDate} placeholder="2026-10-19" />
              <Field label="Kilométrage" keyboardType="number-pad" value={mileage} onChangeText={setMileage} placeholder="98000" />
              <Field label="Opération" value={operation} onChangeText={setOperation} placeholder="Pneus avant" />
              <Button label="Ajouter" disabled={!operation.trim()} onPress={addEntry} />
            </Row>
          </>
        )}
      </Card>

      <Card>
        <Heading>Historique des diagnostics</Heading>
        {state.history.length ? (
          state.history.map((h) => (
            <Pressable key={h.id} accessibilityRole="button" onPress={() => router.push(`/result/${h.id}`)}>
              <View style={{ gap: 2, paddingVertical: Spacing.two, borderTopWidth: 1, borderTopColor: theme.line }}>
                <ThemedText type="small" themeColor="textSecondary">
                  {new Date(h.date).toLocaleDateString('fr-FR')} · {h.vehicleLabel}
                </ThemedText>
                <ThemedText type="smallBold">{h.symptoms || h.codes.join(', ')}</ThemedText>
              </View>
            </Pressable>
          ))
        ) : (
          <ThemedText themeColor="textSecondary">Vos diagnostics apparaîtront ici.</ThemedText>
        )}
      </Card>
    </Screen>
  );
}

const STATUS: Record<Due['status'], { label: string; color: 'stop' | 'warn' | 'ok' | 'textSecondary' }> = {
  retard: { label: 'À faire', color: 'stop' },
  bientot: { label: 'Bientôt', color: 'warn' },
  ok: { label: 'À jour', color: 'ok' },
  inconnu: { label: 'Non noté', color: 'textSecondary' },
};

function DueRow({ due, onDone }: { due: Due; onDone?: () => void }) {
  const theme = useTheme();
  const st = STATUS[due.status];
  const interval = [
    due.item.everyKm ? `tous les ${due.item.everyKm.toLocaleString('fr-FR')} km` : '',
    due.item.everyMonths ? `${due.item.everyMonths % 12 === 0 ? `${due.item.everyMonths / 12} an${due.item.everyMonths > 12 ? 's' : ''}` : `${due.item.everyMonths} mois`}` : '',
  ]
    .filter(Boolean)
    .join(' ou ');
  const next = [
    due.nextKm ? `vers ${due.nextKm.toLocaleString('fr-FR')} km` : '',
    due.nextDate ? `avant le ${new Date(due.nextDate).toLocaleDateString('fr-FR')}` : '',
  ]
    .filter(Boolean)
    .join(' ou ');
  return (
    <View style={{ gap: 2, borderTopWidth: 1, borderTopColor: theme.line, paddingTop: Spacing.two }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <ThemedText type="smallBold" style={{ flexShrink: 1 }}>
          {due.item.title}
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: theme[st.color] }}>
          {st.label}
        </ThemedText>
      </Row>
      <ThemedText type="small" themeColor="textSecondary">
        {[interval, next ? `Prochaine fois ${next}` : '', due.last ? `Dernière fois le ${new Date(due.last.date).toLocaleDateString('fr-FR')}` : '']
          .filter(Boolean)
          .join(' · ')}
      </ThemedText>
      {due.item.note ? (
        <ThemedText type="small" themeColor="textSecondary">
          {due.item.note}
        </ThemedText>
      ) : null}
      <Row>
        {due.item.guideId ? <Button kind="ghost" label="Voir le guide" onPress={() => router.push(`/guides/${due.item.guideId}`)} /> : null}
        {onDone && due.status !== 'ok' ? <Button kind="ghost" label="Fait aujourd’hui" onPress={onDone} /> : null}
        {!onDone && due.status === 'retard' ? <Tag label="Rappel dans le carnet : Premium" /> : null}
      </Row>
    </View>
  );
}
