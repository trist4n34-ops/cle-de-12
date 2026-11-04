/**
 * Transport Bluetooth Low Energy pour les dongles ELM327 (Vgate iCar Pro BLE,
 * Veepeak BLE, Konnwei… : 15 à 30 €). Les dongles « Bluetooth classique »
 * seuls ne sont pas visibles sur iPhone ; l'app les signale comme incompatibles.
 *
 * Nécessite un build de développement (module natif), pas Expo Go.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BleManager, Characteristic, Device, State, Subscription } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

import { looksLikeDongle, pickUartPair } from './ble-uart';
import type { ObdTransport } from './obd-session';

/** Dernier dongle connecté : on le rappelle directement avant de relancer un scan. */
const LAST_DONGLE_KEY = 'cle12:obd:last-dongle';
const RECONNECT_TIMEOUT_MS = 5000;

let manager: BleManager | null = null;
function getManager() {
  manager ??= new BleManager();
  return manager;
}

const toBase64 = (text: string) => btoa(text);
const fromBase64 = (b64: string) => atob(b64);

export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version >= 31) {
    const res = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return Object.values(res).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
  }
  const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return res === PermissionsAndroid.RESULTS.GRANTED;
}

export class BleUnavailableError extends Error {}

async function waitPoweredOn(m: BleManager): Promise<void> {
  const state = await m.state();
  if (state === State.PoweredOn) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      sub.remove();
      reject(new BleUnavailableError('Activez le Bluetooth pour lire les codes.'));
    }, 5000);
    const sub = m.onStateChange((s) => {
      if (s === State.PoweredOn) {
        clearTimeout(timer);
        sub.remove();
        resolve();
      }
    }, true);
  });
}

/** Cherche le premier dongle OBD2 à portée. */
export async function findDongle(timeoutMs = 12000): Promise<Device> {
  const m = getManager();
  if (!(await requestBlePermissions())) throw new BleUnavailableError('Autorisez le Bluetooth pour lire les codes.');
  await waitPoweredOn(m);
  return new Promise<Device>((resolve, reject) => {
    const timer = setTimeout(() => {
      m.stopDeviceScan();
      reject(new BleUnavailableError("Aucun dongle OBD2 trouvé. Vérifiez qu'il est branché, contact mis."));
    }, timeoutMs);
    m.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        clearTimeout(timer);
        m.stopDeviceScan();
        reject(new BleUnavailableError(error.message));
        return;
      }
      if (device && looksLikeDongle(device.serviceUUIDs, device.name ?? device.localName)) {
        clearTimeout(timer);
        m.stopDeviceScan();
        resolve(device);
      }
    });
  });
}

/**
 * Liaison avec le dongle : d'abord le dernier dongle utilisé (sans scan), puis
 * un scan si celui-ci ne répond pas. Le dongle qui fonctionne est mémorisé.
 */
export async function openDongle(): Promise<ObdTransport> {
  const m = getManager();
  if (!(await requestBlePermissions())) throw new BleUnavailableError('Autorisez le Bluetooth pour lire les codes.');
  await waitPoweredOn(m);
  const lastId = await AsyncStorage.getItem(LAST_DONGLE_KEY).catch(() => null);
  if (lastId) {
    try {
      const device = await m.connectToDevice(lastId, { timeout: RECONNECT_TIMEOUT_MS });
      return await connectBle(device);
    } catch {
      await m.cancelDeviceConnection(lastId).catch(() => undefined);
    }
  }
  return connectBle(await findDongle());
}

/** Ouvre une liaison texte avec le dongle : écriture des commandes, lecture des notifications. */
export async function connectBle(device: Device): Promise<ObdTransport> {
  // Un dongle rappelé par `openDongle` est déjà connecté : le reconnecter échouerait.
  const linked = (await device.isConnected()) ? device : await device.connect();
  const connected = await linked.discoverAllServicesAndCharacteristics();
  const services = await Promise.all(
    (await connected.services()).map(async (s) => ({ uuid: s.uuid, characteristics: await s.characteristics() })),
  );
  const pair = pickUartPair<Characteristic>(services);
  if (!pair) {
    await connected.cancelConnection();
    throw new BleUnavailableError("Ce dongle n'expose pas de liaison série Bluetooth LE.");
  }
  const { writer, reader } = pair;
  AsyncStorage.setItem(LAST_DONGLE_KEY, connected.id).catch(() => undefined);

  let buffer = '';
  let waiting: ((text: string) => void) | null = null;
  const sub: Subscription = reader.monitor((error, ch) => {
    if (error || !ch?.value) return;
    buffer += fromBase64(ch.value);
    // L'ELM327 termine chaque réponse par le prompt « > ».
    if (buffer.includes('>') && waiting) {
      const done = waiting;
      waiting = null;
      const text = buffer;
      buffer = '';
      done(text);
    }
  });

  const w = writer;
  return {
    async send(command, timeoutMs = 2000) {
      buffer = '';
      const response = new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          waiting = null;
          reject(new Error(`Pas de réponse du dongle à ${command}`));
        }, timeoutMs);
        waiting = (text) => {
          clearTimeout(timer);
          resolve(text);
        };
      });
      const payload = toBase64(`${command}\r`);
      if (w.isWritableWithResponse) await w.writeWithResponse(payload);
      else await w.writeWithoutResponse(payload);
      return response;
    },
    async close() {
      sub.remove();
      await connected.cancelConnection().catch(() => undefined);
    },
  };
}
