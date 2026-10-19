/** Sur le web, le Bluetooth n'est pas fiable (et absent sur iPhone) : la lecture OBD2 passe par l'app mobile. */
import type { ObdTransport } from './obd-session';

export class BleUnavailableError extends Error {}

const unavailable = () =>
  Promise.reject(new BleUnavailableError("La lecture Bluetooth des codes se fait depuis l'app mobile."));

export const requestBlePermissions = async () => false;
export const findDongle = unavailable;
export const connectBle = (): Promise<ObdTransport> => unavailable();
