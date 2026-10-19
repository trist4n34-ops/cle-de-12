/**
 * Dialogue avec un dongle ELM327, indépendant du transport (Bluetooth, simulateur, tests).
 */
import { CMD, INIT_COMMANDS, parseDtcResponse, parseMonitorStatus, parseVin } from './elm327';

export interface ObdTransport {
  /** Envoie une commande et résout avec la réponse brute, prompt `>` inclus. */
  send(command: string, timeoutMs?: number): Promise<string>;
  close(): Promise<void>;
}

export type ObdScan = {
  milOn: boolean;
  stored: string[];
  pending: string[];
  vin: string | null;
};

export async function initialize(t: ObdTransport): Promise<void> {
  for (const cmd of INIT_COMMANDS) {
    // ATZ redémarre la puce : on lui laisse plus de temps.
    await t.send(cmd, cmd === 'ATZ' ? 3000 : 1500);
  }
}

/** Lecture complète : voyant, codes confirmés, codes en attente et VIN si disponible. */
export async function readAll(t: ObdTransport): Promise<ObdScan> {
  await initialize(t);
  // La première requête OBD déclenche la recherche du protocole (SEARCHING…), d'où le délai.
  const status = await t
    .send(CMD.monitorStatus, 10000)
    .then(parseMonitorStatus)
    .catch(() => ({ milOn: false, codeCount: 0 }));
  const stored = parseDtcResponse(await t.send(CMD.storedCodes, 5000), '03');
  const pending = await t
    .send(CMD.pendingCodes, 5000)
    .then((r) => parseDtcResponse(r, '07'))
    .catch(() => []);
  const vin = await t
    .send(CMD.vin, 5000)
    .then(parseVin)
    .catch(() => null);
  return { milOn: status.milOn, stored, pending: pending.filter((c) => !stored.includes(c)), vin };
}

export async function clearCodes(t: ObdTransport): Promise<void> {
  await initialize(t);
  await t.send(CMD.clearCodes, 5000);
}
