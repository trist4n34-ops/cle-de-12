import { useCallback, useState } from 'react';

import { BleUnavailableError, connectBle, findDongle } from './ble-transport';
import { ElmError } from './elm327';
import { clearCodes, ObdScan, readAll } from './obd-session';

type Status = 'idle' | 'searching' | 'reading' | 'done' | 'error';

/** Lecture des codes défaut par un dongle OBD2 Bluetooth, avec un message lisible à chaque étape. */
export function useObdReader() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [scan, setScan] = useState<ObdScan | null>(null);

  const run = useCallback(async (action: 'read' | 'clear') => {
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
    }
  }, []);

  return { status, message, scan, read: () => run('read'), clear: () => run('clear') };
}
