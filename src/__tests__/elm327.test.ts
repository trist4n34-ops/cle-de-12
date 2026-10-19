import { describe, expect, it } from '@jest/globals';

import { decodeDtc, ElmError, parseDtcResponse, parseMonitorStatus, parseVin } from '@/features/obd/elm327';
import { readAll, ObdTransport } from '@/features/obd/obd-session';

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
