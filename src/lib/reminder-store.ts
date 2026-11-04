/**
 * Réglages des rappels et données de véhicule qui leur sont propres (date du
 * dernier contrôle technique, relevé du kilométrage). Gardés sous leur propre
 * clé AsyncStorage, hors du store principal, et partagés entre écrans sans
 * provider (le garage et la fiche du véhicule les lisent tous les deux).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { DEFAULT_SETTINGS, type ReminderSettings, type VehicleExtras } from '@/lib/reminders';

const KEY = 'cle12:reminders:v1';

export type ReminderData = { settings: ReminderSettings; extras: Record<string, VehicleExtras> };

let data: ReminderData = { settings: DEFAULT_SETTINGS, extras: {} };
let ready = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function load(): Promise<void> {
  loading ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<ReminderData>;
      data = { settings: { ...DEFAULT_SETTINGS, ...saved.settings }, extras: saved.extras ?? {} };
    })
    .catch(() => undefined)
    .finally(() => {
      ready = true;
      emit();
    });
  return loading;
}

/** Modifie les données ; une écriture faite avant la relecture attend celle-ci pour ne pas être écrasée. */
function mutate(fn: (d: ReminderData) => ReminderData) {
  const apply = () => {
    data = fn(data);
    emit();
    AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => undefined);
  };
  if (ready) apply();
  else load().then(apply);
}

export const setReminderSettings = (patch: Partial<ReminderSettings>) =>
  mutate((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

/** Complète les données d'un véhicule ; une valeur `undefined` efface le champ. */
export const setVehicleExtras = (vehicleId: string, patch: Partial<VehicleExtras>) =>
  mutate((d) => {
    const merged: VehicleExtras = { ...d.extras[vehicleId], ...patch };
    for (const k of Object.keys(merged) as (keyof VehicleExtras)[]) if (merged[k] === undefined) delete merged[k];
    return { ...d, extras: { ...d.extras, [vehicleId]: merged } };
  });

export const removeVehicleExtras = (vehicleId: string) =>
  mutate((d) => {
    const { [vehicleId]: _removed, ...extras } = d.extras;
    return { ...d, extras };
  });

/** Note que le kilométrage vient d'être relevé (repousse le rappel mensuel). */
export const markMileageUpdated = (vehicleId: string, at: Date = new Date()) =>
  setVehicleExtras(vehicleId, { mileageUpdatedAt: at.toISOString() });

/** Remet les réglages par défaut en mémoire (la clé AsyncStorage est effacée à part). */
export function resetReminderData() {
  data = { settings: DEFAULT_SETTINGS, extras: {} };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

type Snapshot = ReminderData & { ready: boolean };
let snapshot: Snapshot = { ...data, ready };
function getSnapshot(): Snapshot {
  if (snapshot.settings !== data.settings || snapshot.extras !== data.extras || snapshot.ready !== ready) {
    snapshot = { ...data, ready };
  }
  return snapshot;
}

export function useReminderData(): Snapshot {
  useEffect(() => {
    load();
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
