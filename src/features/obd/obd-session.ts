/**
 * Dialogue avec un dongle ELM327, indépendant du transport (Bluetooth, simulateur, tests).
 */
import {
  assessPid,
  CMD,
  engineState,
  INIT_COMMANDS,
  LIVE_ORDER,
  LiveStatus,
  parseBatteryVoltage,
  parseDtcResponse,
  parseMonitorStatus,
  parsePidResponse,
  parseSupportedPids,
  parseVin,
  pidCommand,
  PIDS,
} from './elm327';

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

/** Une mesure en direct, prête à afficher. */
export type LiveReading = {
  pid: number;
  label: string;
  unit: string;
  /** null quand le véhicule n’a pas répondu (NO DATA). */
  value: number | null;
  /** « adapter » : tension lue par le dongle (ATRV) faute de PID 0x42 côté calculateur. */
  source: 'ecu' | 'adapter';
  status: LiveStatus;
  /** Explication quand la valeur sort de la plage normale. */
  hint?: string;
};

/**
 * PID pris en charge par le véhicule : 0100, puis 0120 et 0140 si annoncés.
 * À appeler après `initialize` ; la première requête peut déclencher la recherche du protocole.
 */
export async function readSupportedPids(t: ObdTransport): Promise<number[]> {
  const supported = parseSupportedPids(await t.send('0100', 10000));
  for (const next of [0x20, 0x40]) {
    if (!supported.includes(next)) break;
    supported.push(...parseSupportedPids(await t.send(`01${next.toString(16).toUpperCase()}`, 2000)));
  }
  return [...new Set(supported)].sort((a, b) => a - b);
}

/**
 * Relevé unique des mesures en direct. `pids` : ceux à lire (déjà filtrés sur ceux que
 * le véhicule prend en charge) ; sans liste, la prise en charge est lue d’abord.
 * Le transport doit être initialisé. Pour un affichage continu, rappeler en boucle.
 */
export async function readLive(
  t: ObdTransport,
  pids?: number[],
  options: { adapterVoltage?: boolean } = {},
): Promise<LiveReading[]> {
  let wanted = pids;
  let adapterVoltage = options.adapterVoltage;
  if (!wanted) {
    const supported = await readSupportedPids(t);
    wanted = LIVE_ORDER.filter((p) => supported.includes(p));
    adapterVoltage ??= !supported.includes(0x42);
  }

  const values = new Map<number, { value: number | null; source: LiveReading['source'] }>();
  for (const pid of wanted) {
    if (!PIDS[pid]) continue;
    values.set(pid, { value: parsePidResponse(await t.send(pidCommand(pid), 2000), pid), source: 'ecu' });
  }
  if (adapterVoltage && !values.has(0x42)) {
    const volts = await t
      .send('ATRV', 2000)
      .then(parseBatteryVoltage)
      .catch(() => null);
    if (volts !== null) values.set(0x42, { value: volts, source: 'adapter' });
  }

  const engine = engineState(values.get(0x0c)?.value);
  const order = [...LIVE_ORDER, ...wanted.filter((p) => !LIVE_ORDER.includes(p))];
  return order
    .filter((pid) => values.has(pid))
    .map((pid) => {
      const { value, source } = values.get(pid)!;
      const def = PIDS[pid];
      return {
        pid,
        label: source === 'adapter' ? 'Tension batterie (prise OBD)' : def.label,
        unit: def.unit,
        value,
        source,
        ...assessPid(pid, value, engine),
      };
    });
}
