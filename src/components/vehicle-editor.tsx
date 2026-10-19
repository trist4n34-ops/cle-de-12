import { ReactNode, useState } from 'react';
import { Platform, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, Eyebrow, Field, Row } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { CAR_MAKES, findMake, findModel, MODEL_COUNT, searchMakes, searchModels } from '@/data/vehicles';
import { type TKey, useT } from '@/i18n';
import { Fuel, FUELS, Vehicle, vehicleLabel } from '@/lib/diagnosis';
import { pickPhoto } from '@/lib/photo';
import { newId, useCurrentVehicle, useStore } from '@/lib/store';
import { usePremium } from '@/lib/purchases';

const EMPTY: Omit<Vehicle, 'id'> = { make: '', model: '', year: '', mileage: '', engine: '', fuel: 'Essence' };

/** Libellé affiché de chaque énergie ; la valeur enregistrée reste celle de `FUELS`. */
const FUEL_LABELS: Record<Fuel, TKey> = {
  Essence: 'vehicle.fuel.essence',
  Diesel: 'vehicle.fuel.diesel',
  Hybride: 'vehicle.fuel.hybride',
  Électrique: 'vehicle.fuel.electrique',
  GPL: 'vehicle.fuel.gpl',
};

/** Carte du véhicule courant : affichage, changement, ajout et identification par la plaque. */
export function VehicleCard() {
  const { t, num } = useT();
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
      setPlateMsg(t('vehicle.plate.found'));
    } catch (e) {
      setPlateMsg(e instanceof ApiError ? e.message : t('vehicle.plate.lookupFailed'));
    } finally {
      setLooking(false);
    }
  };

  const readPhoto = async (source: 'camera' | 'library') => {
    if (!editing) return;
    const photo = await pickPhoto(source);
    if (!photo) return;
    setLooking(true);
    setPlateMsg(t('vehicle.plate.reading'));
    try {
      const { plate, confidence, vehicle } = await api.platePhoto(photo);
      const check = confidence === 'haute' ? '' : t('vehicle.plate.checkChars');
      if (vehicle) {
        setEditing({ ...editing, ...vehicle, plate, mileage: editing.mileage });
        setPlateMsg(t('vehicle.plate.readFound', { plate, check }));
      } else {
        setEditing({ ...editing, plate });
        setPlateMsg(t('vehicle.plate.readNoVehicle', { plate, check }));
      }
    } catch (e) {
      setPlateMsg(e instanceof ApiError ? e.message : t('vehicle.plate.readFailed'));
    } finally {
      setLooking(false);
    }
  };

  if (!editing && current) {
    return (
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Eyebrow>{t('vehicle.eyebrow')}</Eyebrow>
          {current.plate ? <ThemedText type="code">{current.plate}</ThemedText> : null}
        </Row>
        <ThemedText type="smallBold">{vehicleLabel(current)}</ThemedText>
        <Row>
          <Button kind="ghost" label={t('vehicle.edit')} onPress={() => setEditing(current)} />
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
            label={canAdd ? t('vehicle.add') : t('vehicle.addPremium')}
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
      <Eyebrow>{t('vehicle.yours')}</Eyebrow>
      <Row style={{ alignItems: 'flex-end' }}>
        <Field
          label={t('vehicle.plate.label')}
          placeholder="AB-123-CD"
          autoCapitalize="characters"
          value={editing.plate ?? ''}
          onChangeText={(plate) => set({ plate })}
        />
        <Button kind="ghost" label={t('vehicle.plate.search')} loading={looking} onPress={lookup} disabled={!editing.plate} />
      </Row>
      <Row>
        {Platform.OS !== 'web' ? (
          <Button kind="ghost" label={t('vehicle.plate.takePhoto')} disabled={looking} onPress={() => readPhoto('camera')} />
        ) : null}
        <Button kind="ghost" label={t('vehicle.plate.import')} disabled={looking} onPress={() => readPhoto('library')} />
      </Row>
      {plateMsg ? (
        <ThemedText type="small" themeColor="textSecondary">
          {plateMsg}
        </ThemedText>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary">
        {t('vehicle.catalog', { makes: num(CAR_MAKES.length), models: num(MODEL_COUNT) })}
      </ThemedText>
      <Row>
        <Field label={t('vehicle.make')} placeholder="Peugeot" value={editing.make} onChangeText={(make) => set({ make })} />
        <Field label={t('vehicle.model')} placeholder="208" value={editing.model} onChangeText={(model) => set({ model })} />
        <Field label={t('vehicle.year')} placeholder="2017" keyboardType="number-pad" value={editing.year} onChangeText={(year) => set({ year })} />
      </Row>
      <CatalogSuggestions vehicle={editing} onPick={set} />
      <Row>
        <Field
          label={t('vehicle.mileage')}
          placeholder="98000"
          keyboardType="number-pad"
          value={editing.mileage}
          onChangeText={(mileage) => set({ mileage })}
        />
        <Field
          label={t('vehicle.engine')}
          placeholder={t('vehicle.enginePlaceholder')}
          value={editing.engine}
          onChangeText={(engine) => set({ engine })}
        />
      </Row>
      <View style={{ gap: 6 }}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {t('vehicle.fuel')}
        </ThemedText>
        <Row>
          {FUELS.map((f) => (
            <Chip key={f} label={t(FUEL_LABELS[f])} selected={editing.fuel === f} onPress={() => set({ fuel: f })} />
          ))}
        </Row>
      </View>
      <Row>
        <Button label={t('vehicle.save')} disabled={!valid} onPress={() => save({ ...editing, make: editing.make.trim(), model: editing.model.trim() })} />
        {current ? <Button kind="ghost" label={t('vehicle.cancel')} onPress={() => setEditing(null)} /> : null}
      </Row>
    </Card>
  );
}

const MAX_SUGGESTIONS = 12;
const MAX_MODELS = 40;

/** Suggestions du catalogue : marque, puis modèle (filtré par année), puis motorisation. */
function CatalogSuggestions({ vehicle, onPick }: { vehicle: Vehicle; onPick: (patch: Partial<Vehicle>) => void }) {
  const { t, num } = useT();
  const make = findMake(vehicle.make);
  const y = Number(vehicle.year);
  const year = y >= 1950 && y <= 2100 ? y : undefined;

  if (!make) {
    const makes = searchMakes(vehicle.make).slice(0, MAX_SUGGESTIONS);
    if (!makes.length) return null;
    return (
      <Suggestions label={t('vehicle.suggest.makes')}>
        {makes.map((mk) => (
          <Chip key={mk.name} label={mk.name} selected={false} onPress={() => onPick({ make: mk.name, model: '', engine: '' })} />
        ))}
      </Suggestions>
    );
  }

  const model = findModel(make.name, vehicle.model);
  if (!model) {
    const all = searchModels(make.name, vehicle.model, year);
    if (!all.length) return null;
    const models = all.slice(0, MAX_MODELS);
    return (
      <Suggestions
        label={
          (year
            ? t('vehicle.suggest.modelsYear', { make: make.name, year })
            : t('vehicle.suggest.models', { make: make.name })) +
          (all.length > MAX_MODELS
            ? t('vehicle.suggest.truncated', { shown: num(MAX_MODELS), total: num(all.length) })
            : '')
        }>
        {models.map((md) => (
          <Chip key={md.name} label={md.name} selected={false} onPress={() => onPick({ make: make.name, model: md.name, engine: '' })} />
        ))}
      </Suggestions>
    );
  }

  if (!model.engines?.length) return null;
  return (
    <Suggestions label={t('vehicle.suggest.engines')}>
      {model.engines.map((en) => (
        <Chip
          key={en.label}
          label={en.label}
          selected={vehicle.engine === en.label}
          onPress={() => onPick({ engine: en.label, fuel: en.fuel })}
        />
      ))}
    </Suggestions>
  );
}

function Suggestions({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <Row>{children}</Row>
    </View>
  );
}
