import { useCallback, useEffect, useRef, useState } from 'react';

import { BleUnavailableError, connectBle, findDongle } from './ble-transport';
import { ElmError, LIVE_ORDER } from './elm327';
import { clearCodes, initialize, LiveReading, ObdScan, ObdTransport, readAll, readLive, readSupportedPids } from './obd-session';

type Status = 'idle' | 'searching' | 'reading' | 'done' | 'error';
export type LiveState = 'off' | 'connecting' | 'on' | 'error';

/** Intervalle visé entre deux relevés en direct (un relevé complet peut prendre plus longtemps). */
const LIVE_INTERVAL_MS = 1000;

type LiveSession = { stopped: boolean; wake: () => void; done: Promise<void> };

/** Lecture des codes défaut par un dongle OBD2 Bluetooth, avec un message lisible à chaque étape. */
export function useObdReader() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [scan, setScan] = useState<ObdScan | null>(null);

  const [live, setLive] = useState<LiveReading[] | null>(null);
  const [liveState, setLiveState] = useState<LiveState>('off');
  const [liveMessage, setLiveMessage] = useState('');
  const liveRef = useRef<LiveSession | null>(null);
  const busyRef = useRef(false);

  /** Arrête le relevé en direct et attend que la liaison soit fermée. */
  const haltLive = useCallback(async () => {
    const session = liveRef.current;
    if (!session) return;
    session.stopped = true;
    session.wake();
    await session.done;
  }, []);

  const stopLive = useCallback(() => {
    if (!liveRef.current) return;
    setLiveState('off');
    setLiveMessage('');
    void haltLive();
  }, [haltLive]);

  const startLive = useCallback(() => {
    // Une session arrêtée peut encore chercher le dongle : la nouvelle attendra qu'elle se ferme.
    const previous = liveRef.current;
    if ((previous && !previous.stopped) || busyRef.current) return;
    let finish!: () => void;
    const session: LiveSession = {
      stopped: false,
      wake: () => undefined,
      done: new Promise<void>((r) => (finish = r)),
    };
    liveRef.current = session;
    setLiveState('connecting');
    setLiveMessage('Recherche du dongle…');

    const pause = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, ms);
        session.wake = () => {
          clearTimeout(timer);
          resolve();
        };
      });

    void (async () => {
      let transport: ObdTransport | null = null;
      try {
        if (previous) await previous.done;
        if (session.stopped) return;
        transport = await connectBle(await findDongle());
        if (session.stopped) return;
        setLiveMessage('Connexion au véhicule…');
        await initialize(transport);
        const supported = await readSupportedPids(transport);
        const pids = LIVE_ORDER.filter((p) => supported.includes(p));
        const adapterVoltage = !supported.includes(0x42);
        if (!pids.length) {
          setLiveState('error');
          setLiveMessage('Ce véhicule ne transmet pas de données en direct. Mettez le contact et réessayez.');
          return;
        }
        if (session.stopped) return;
        setLiveState('on');
        setLiveMessage('');
        while (!session.stopped) {
          const started = Date.now();
          const readings = await readLive(transport, pids, { adapterVoltage });
          if (session.stopped) break;
          setLive(readings);
          await pause(Math.max(0, LIVE_INTERVAL_MS - (Date.now() - started)));
        }
      } catch (e) {
        if (session.stopped) return;
        setLiveState('error');
        if (e instanceof BleUnavailableError) setLiveMessage(e.message);
        else if (e instanceof ElmError) setLiveMessage('Le véhicule ne répond pas. Mettez le contact et réessayez.');
        else setLiveMessage('Liaison avec le dongle perdue. Rapprochez le téléphone et relancez.');
      } finally {
        await transport?.close().catch(() => undefined);
        if (liveRef.current === session) liveRef.current = null;
        finish();
      }
    })();
  }, []);

  // Coupe la liaison quand l'écran disparaît.
  useEffect(() => () => void haltLive(), [haltLive]);

  const run = useCallback(
    async (action: 'read' | 'clear') => {
      if (busyRef.current) return false;
      busyRef.current = true;
      // Le dongle n'accepte qu'une liaison : on coupe le direct avant de lire ou d'effacer.
      if (liveRef.current) {
        setLiveState('off');
        setLiveMessage('');
        await haltLive();
      }
      setStatus('searching');
      setMessage('Recherche du dongle…');
      try {
        const transport = await connectBle(await findDongle());
        try {
          setStatus('reading');
          if (action === 'clear') {
            await clearCodes(transport);
            setScan(null);
            setMessage('Codes effacés, voyant éteint.');
          } else {
            setMessage('Lecture des codes…');
            const result = await readAll(transport);
            setScan(result);
            const n = result.stored.length + result.pending.length;
            setMessage(n ? `${n} code${n > 1 ? 's' : ''} lu${n > 1 ? 's' : ''}.` : 'Aucun code défaut enregistré.');
          }
          setStatus('done');
          return action === 'read';
        } finally {
          await transport.close();
        }
      } catch (e) {
        setStatus('error');
        if (e instanceof BleUnavailableError) setMessage(e.message);
        else if (e instanceof ElmError) setMessage('Le véhicule ne répond pas. Mettez le contact et réessayez.');
        else setMessage('La lecture a échoué. Débranchez puis rebranchez le dongle et réessayez.');
        return false;
      } finally {
        busyRef.current = false;
      }
    },
    [haltLive],
  );

  return {
    status,
    message,
    scan,
    read: () => run('read'),
    clear: () => run('clear'),
    live,
    liveState,
    liveMessage,
    startLive,
    stopLive,
  };
}

export type ObdReader = ReturnType<typeof useObdReader>;
