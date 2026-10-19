/**
 * Transport Bluetooth Low Energy pour les dongles ELM327 (Vgate iCar Pro BLE,
 * Veepeak BLE, Konnwei… : 15 à 30 €). Les dongles « Bluetooth classique »
 * seuls ne sont pas visibles sur iPhone ; l'app les signale comme incompatibles.
 *
 * Nécessite un build de développement (module natif), pas Expo Go.
 */
import { BleManager, Characteristic, Device, State, Subscription } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

import type { ObdTransport } from './obd-session';

/** Services UART courants des dongles BLE OBD2. */
const KNOWN_SERVICES = ['fff0', 'ffe0', '18f0', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'];
const NAME_HINT = /obd|elm|vgate|veepeak|icar|konnwei|v-link|vlink|ios-vlink|carly|scan/i;

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
      const services = device?.serviceUUIDs?.map((u) => u.toLowerCase()) ?? [];
      const known = services.some((u) => KNOWN_SERVICES.some((k) => u.includes(k)));
      if (device && (known || NAME_HINT.test(device.name ?? device.localName ?? ''))) {
        clearTimeout(timer);
        m.stopDeviceScan();
        resolve(device);
      }
    });
  });
}

/** Ouvre une liaison texte avec le dongle : écriture des commandes, lecture des notifications. */
export async function connectBle(device: Device): Promise<ObdTransport> {
  const connected = await (await device.connect()).discoverAllServicesAndCharacteristics();
  let writer: Characteristic | undefined;
  let reader: Characteristic | undefined;
  for (const service of await connected.services()) {
    for (const ch of await service.characteristics()) {
      if (!writer && (ch.isWritableWithResponse || ch.isWritableWithoutResponse)) writer = ch;
      if (!reader && (ch.isNotifiable || ch.isIndicatable)) reader = ch;
    }
    if (writer && reader) break;
  }
  if (!writer || !reader) {
    await connected.cancelConnection();
    throw new BleUnavailableError("Ce dongle n'expose pas de liaison série Bluetooth LE.");
  }

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
