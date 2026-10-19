import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, Heading, LockBox, Row, Screen, Title, Verdict } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { vehicleLabel } from '@/lib/diagnosis';
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

  const addEntry = () => {
    if (!current || !operation.trim()) return;
    update((s) => ({
      ...s,
      log: [...s.log, { id: newId(), vehicleId: current.id, date, mileage: mileage.replace(/\D/g, ''), operation: operation.trim() }],
    }));
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

      <Card>
        <Heading>Carnet d’entretien</Heading>
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
