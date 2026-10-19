import { useState } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, Eyebrow, Field, Row } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { FUELS, Vehicle, vehicleLabel } from '@/lib/diagnosis';
import { newId, useCurrentVehicle, useStore } from '@/lib/store';
import { usePremium } from '@/lib/purchases';

const EMPTY: Omit<Vehicle, 'id'> = { make: '', model: '', year: '', mileage: '', engine: '', fuel: 'Essence' };

/** Carte du véhicule courant : affichage, changement, ajout et identification par la plaque. */
export function VehicleCard() {
  const { state, update } = useStore();
  const { isPremium } = usePremium();
  const current = useCurrentVehicle();
  const [editing, setEditing] = useState<Vehicle | null>(current ? null : { id: newId(), ...EMPTY });
  const [plateMsg, setPlateMsg] = useState('');
  const [looking, setLooking] = useState(false);

  const canAdd = isPremium || state.vehicles.length === 0;

  const save = (v: Vehicle) => {
    update((s) => {
      const exists = s.vehicles.some((x) => x.id === v.id);
      return {
        ...s,
        vehicles: exists ? s.vehicles.map((x) => (x.id === v.id ? v : x)) : [...s.vehicles, v],
        vehicleId: v.id,
      };
    });
    setEditing(null);
  };

  const lookup = async () => {
    if (!editing?.plate) return;
    setLooking(true);
    setPlateMsg('');
    try {
      const found = await api.plate(editing.plate);
      setEditing({ ...editing, ...found, mileage: editing.mileage });
      setPlateMsg('Véhicule trouvé. Vérifiez et ajoutez le kilométrage.');
    } catch (e) {
      setPlateMsg(e instanceof ApiError ? e.message : 'Recherche impossible.');
    } finally {
      setLooking(false);
    }
  };

  if (!editing && current) {
    return (
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Eyebrow>Véhicule</Eyebrow>
          {current.plate ? <ThemedText type="code">{current.plate}</ThemedText> : null}
        </Row>
        <ThemedText type="smallBold">{vehicleLabel(current)}</ThemedText>
        <Row>
          <Button kind="ghost" label="Modifier" onPress={() => setEditing(current)} />
          {state.vehicles.length > 1
            ? state.vehicles
                .filter((v) => v.id !== current.id)
                .map((v) => (
                  <Button
                    key={v.id}
                    kind="ghost"
                    label={`${v.make} ${v.model}`}
                    onPress={() => update((s) => ({ ...s, vehicleId: v.id }))}
                  />
                ))
            : null}
          <Button
            kind="ghost"
            label={canAdd ? '+ Véhicule' : '+ Véhicule (Premium)'}
            disabled={!canAdd}
            onPress={() => setEditing({ id: newId(), ...EMPTY })}
          />
        </Row>
      </Card>
    );
  }

  if (!editing) return null;
  const set = (patch: Partial<Vehicle>) => setEditing({ ...editing, ...patch });
  const valid = editing.make.trim() && editing.model.trim();

  return (
    <Card>
      <Eyebrow>Votre véhicule</Eyebrow>
      <Row style={{ alignItems: 'flex-end' }}>
        <Field
          label="Plaque d'immatriculation"
          placeholder="AB-123-CD"
          autoCapitalize="characters"
          value={editing.plate ?? ''}
          onChangeText={(plate) => set({ plate })}
        />
        <Button kind="ghost" label="Rechercher" loading={looking} onPress={lookup} disabled={!editing.plate} />
      </Row>
      {plateMsg ? (
        <ThemedText type="small" themeColor="textSecondary">
          {plateMsg}
        </ThemedText>
      ) : null}
      <Row>
        <Field label="Marque" placeholder="Peugeot" value={editing.make} onChangeText={(make) => set({ make })} />
        <Field label="Modèle" placeholder="208" value={editing.model} onChangeText={(model) => set({ model })} />
        <Field label="Année" placeholder="2017" keyboardType="number-pad" value={editing.year} onChangeText={(year) => set({ year })} />
        <Field
          label="Kilométrage"
          placeholder="98000"
          keyboardType="number-pad"
          value={editing.mileage}
          onChangeText={(mileage) => set({ mileage })}
        />
        <Field label="Motorisation" placeholder="1.2 PureTech 82 ch" value={editing.engine} onChangeText={(engine) => set({ engine })} />
      </Row>
      <View style={{ gap: 6 }}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Énergie
        </ThemedText>
        <Row>
          {FUELS.map((f) => (
            <Chip key={f} label={f} selected={editing.fuel === f} onPress={() => set({ fuel: f })} />
          ))}
        </Row>
      </View>
      <Row>
        <Button label="Enregistrer" disabled={!valid} onPress={() => save({ ...editing, make: editing.make.trim(), model: editing.model.trim() })} />
        {current ? <Button kind="ghost" label="Annuler" onPress={() => setEditing(null)} /> : null}
      </Row>
    </Card>
  );
}
