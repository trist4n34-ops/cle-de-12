import { describe, expect, it } from '@jest/globals';

import {
  assessPid,
  decodeDtc,
  ElmError,
  parseBatteryVoltage,
  parseDtcResponse,
  parseMonitorStatus,
  parsePidResponse,
  parseSupportedPids,
  parseVin,
} from '@/features/obd/elm327';
import { readAll, readLive, ObdTransport } from '@/features/obd/obd-session';

describe('decodeDtc', () => {
  it('décode les quatre familles de codes', () => {
    expect(decodeDtc(0x01, 0x33)).toBe('P0133');
    expect(decodeDtc(0x03, 0x01)).toBe('P0301');
    expect(decodeDtc(0x41, 0x23)).toBe('C0123');
    expect(decodeDtc(0x80, 0x01)).toBe('B0001');
    expect(decodeDtc(0xc1, 0x00)).toBe('U0100');
  });
});

describe('parseDtcResponse', () => {
  it('lit une réponse ISO 9141 complétée de zéros', () => {
    expect(parseDtcResponse('43 03 01 01 71 00 00\r\r>')).toEqual(['P0301', 'P0171']);
  });

  it('lit une réponse CAN avec octet de comptage, sans espaces', () => {
    expect(parseDtcResponse('SEARCHING...\r4302030101 71\r\r>')).toEqual(['P0301', 'P0171']);
  });

  it('lit une réponse CAN sur plusieurs trames ISO-TP', () => {
    const raw = '00A\r0:43040301017104\r1:20C1000000\r\r>';
    expect(parseDtcResponse(raw)).toEqual(['P0301', 'P0171', 'P0420', 'U0100']);
  });

  it('renvoie une liste vide quand aucun code', () => {
    expect(parseDtcResponse('4300\r>')).toEqual([]);
    expect(parseDtcResponse('43 00 00 00 00 00 00\r>')).toEqual([]);
  });

  it('lit les codes en attente (mode 07)', () => {
    expect(parseDtcResponse('47 01 03 02\r>', '07')).toEqual(['P0302']);
  });

  it('signale un véhicule muet', () => {
    expect(() => parseDtcResponse('NO DATA\r>')).toThrow(ElmError);
    expect(() => parseDtcResponse('UNABLE TO CONNECT\r>')).toThrow(ElmError);
  });
});

describe('parseMonitorStatus', () => {
  it('lit le voyant et le nombre de codes', () => {
    expect(parseMonitorStatus('41 01 82 07 E5 00\r>')).toEqual({ milOn: true, codeCount: 2 });
    expect(parseMonitorStatus('41010007E500\r>')).toEqual({ milOn: false, codeCount: 0 });
  });
});

describe('parseVin', () => {
  it('lit un VIN en CAN multi-trames', () => {
    const raw = '014\r0:490201565231\r1:4A433130303030\r2:30303030303031\r>';
    expect(parseVin(raw)).toBe('VR1JC100000000001');
  });
});

describe('readAll', () => {
  it('enchaîne initialisation et lectures sur le transport', async () => {
    const replies: Record<string, string> = {
      '0101': '41 01 81 07 E5 00\r>',
      '03': '43 01 03 01\r>',
      '07': '47 01 01 71\r>',
      '0902': 'NO DATA\r>',
    };
    const sent: string[] = [];
    const transport: ObdTransport = {
      send: async (cmd) => {
        sent.push(cmd);
        return replies[cmd] ?? 'OK\r>';
      },
      close: async () => undefined,
    };
    await expect(readAll(transport)).resolves.toEqual({ milOn: true, stored: ['P0301'], pending: ['P0171'], vin: null });
    expect(sent.slice(0, 2)).toEqual(['ATZ', 'ATE0']);
  });
});

describe('parsePidResponse', () => {
  it('lit le régime moteur (010C)', () => {
    expect(parsePidResponse('41 0C 1A F8\r\r>', 0x0c)).toBe(1726);
    expect(parsePidResponse('410C1AF8\r>', 0x0c)).toBe(1726);
  });

  it('lit la température du liquide de refroidissement (0105)', () => {
    expect(parsePidResponse('41 05 7B\r>', 0x05)).toBe(83);
    expect(parsePidResponse('SEARCHING...\r410528\r>', 0x05)).toBe(0);
  });

  it('lit les corrections de richesse négatives et positives', () => {
    expect(parsePidResponse('41 06 80\r>', 0x06)).toBe(0);
    expect(parsePidResponse('41 06 70\r>', 0x06)).toBe(-12.5);
    expect(parsePidResponse('41 07 94\r>', 0x07)).toBeCloseTo(15.625);
    expect(parsePidResponse('41 06 00\r>', 0x06)).toBe(-100);
  });

  it('lit le débit d’air (0110)', () => {
    expect(parsePidResponse('41 10 01 F4\r>', 0x10)).toBe(5);
    expect(parsePidResponse('41100A8C\r>', 0x10)).toBe(27);
  });

  it('lit la tension du calculateur (0142)', () => {
    expect(parsePidResponse('41 42 37 14\r>', 0x42)).toBeCloseTo(14.1);
  });

  it('retient la première réponse quand plusieurs calculateurs répondent', () => {
    expect(parsePidResponse('41 0C 1A F8\r41 0C 0F A0\r\r>', 0x0c)).toBe(1726);
    expect(parsePidResponse('410D32\r410D00\r>', 0x0d)).toBe(50);
  });

  it('écarte un en-tête CAN laissé actif', () => {
    expect(parsePidResponse('7E8 03 41 0D 32\r>', 0x0d)).toBe(50);
  });

  it('renvoie null sur NO DATA ou une réponse incomplète', () => {
    expect(parsePidResponse('NO DATA\r\r>', 0x5c)).toBeNull();
    expect(parsePidResponse('41 0C 1A\r>', 0x0c)).toBeNull();
  });

  it('signale un véhicule muet', () => {
    expect(() => parsePidResponse('UNABLE TO CONNECT\r>', 0x0c)).toThrow(ElmError);
  });
});

describe('parseSupportedPids', () => {
  it('décode le masque 0100', () => {
    expect(parseSupportedPids('41 00 BE 3F A8 13\r>')).toEqual([
      0x01, 0x03, 0x04, 0x05, 0x06, 0x07, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x13, 0x15, 0x1c, 0x1f, 0x20,
    ]);
  });

  it('décode les masques 0120 et 0140', () => {
    expect(parseSupportedPids('41 20 80 00 00 01\r>')).toEqual([0x21, 0x40]);
    expect(parseSupportedPids('41 40 40 00 00 10\r>')).toEqual([0x42, 0x5c]);
  });

  it('réunit les réponses de plusieurs calculateurs', () => {
    expect(parseSupportedPids('410080000000\r410000000001\r>')).toEqual([0x01, 0x20]);
  });

  it('renvoie une liste vide sur NO DATA', () => {
    expect(parseSupportedPids('NO DATA\r>')).toEqual([]);
  });
});

describe('parseBatteryVoltage', () => {
  it('lit la réponse ATRV', () => {
    expect(parseBatteryVoltage('12.6V\r\r>')).toBe(12.6);
    expect(parseBatteryVoltage('ATRV\r14.2V\r>')).toBe(14.2);
    expect(parseBatteryVoltage('12,4V\r>')).toBe(12.4);
    expect(parseBatteryVoltage('?\r>')).toBeNull();
  });
});

describe('assessPid', () => {
  it('signale une valeur hors plage avec son explication', () => {
    expect(assessPid(0x05, 90)).toEqual({ status: 'ok' });
    expect(assessPid(0x05, 112).status).toBe('warn');
    expect(assessPid(0x06, -12.5, 'running')).toMatchObject({ status: 'warn', hint: expect.stringContaining('±10 %') });
    expect(assessPid(0x0c, 800)).toEqual({ status: 'none' });
  });

  it('choisit la plage de tension selon l’état du moteur', () => {
    expect(assessPid(0x42, 12.6, 'stopped').status).toBe('ok');
    expect(assessPid(0x42, 12.6, 'running').status).toBe('warn');
    expect(assessPid(0x42, 14.1, 'running').status).toBe('ok');
    expect(assessPid(0x42, 12.6).status).toBe('none');
  });
});

describe('readLive', () => {
  it('lit les PID pris en charge et la tension du dongle', async () => {
    const replies: Record<string, string> = {
      '0100': '41 00 18 18 00 01\r>',
      '0120': '41 20 00 00 00 00\r>',
      '0105': '41 05 7B\r>',
      '010C': '41 0C 0C 80\r>',
      '010D': '41 0D 00\r>',
      '0104': 'NO DATA\r>',
      ATRV: '14.0V\r>',
    };
    const transport: ObdTransport = {
      send: async (cmd) => replies[cmd] ?? 'NO DATA\r>',
      close: async () => undefined,
    };
    const readings = await readLive(transport);
    expect(readings.map((r) => [r.pid, r.value, r.status])).toEqual([
      [0x0c, 800, 'none'],
      [0x0d, 0, 'none'],
      [0x05, 83, 'ok'],
      [0x42, 14, 'ok'],
      [0x04, null, 'none'],
    ]);
    expect(readings.find((r) => r.pid === 0x42)).toMatchObject({ source: 'adapter', unit: 'V' });
  });
});
