import { describe, expect, it } from '@jest/globals';

import { type CharLike, looksLikeDongle, pickUartPair, type ServiceLike, shortUuid } from '@/features/obd/ble-uart';

const ch = (uuid: string, p: Partial<CharLike> = {}): CharLike => ({
  uuid,
  isWritableWithResponse: false,
  isWritableWithoutResponse: false,
  isNotifiable: false,
  isIndicatable: false,
  ...p,
});
const long = (short: string) => `0000${short}-0000-1000-8000-00805f9b34fb`;

describe('liaison série BLE du dongle', () => {
  it('normalise les UUID 16 bits', () => {
    expect(shortUuid(long('FFF0'))).toBe('fff0');
    expect(shortUuid('0000ffe0')).toBe('ffe0');
    expect(shortUuid('18F0')).toBe('18f0');
    expect(shortUuid('6E400001-B5A3-F393-E0A9-E50E24DCCA9E')).toBe('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
  });

  it('ignore Generic Attribute (0x1801) même quand il arrive en premier', () => {
    const services: ServiceLike[] = [
      { uuid: long('1800'), characteristics: [ch(long('2a00'), { isWritableWithResponse: true })] },
      { uuid: long('1801'), characteristics: [ch(long('2a05'), { isIndicatable: true })] },
      {
        uuid: long('fff0'),
        characteristics: [ch(long('fff1'), { isNotifiable: true }), ch(long('fff2'), { isWritableWithoutResponse: true })],
      },
    ];
    const pair = pickUartPair(services);
    expect(pair?.service).toBe(long('fff0'));
    expect(pair?.reader.uuid).toBe(long('fff1'));
    expect(pair?.writer.uuid).toBe(long('fff2'));
  });

  it('prend écriture et lecture dans le même service', () => {
    const services: ServiceLike[] = [
      { uuid: 'aaaa0000-0000-0000-0000-000000000001', characteristics: [ch('w', { isWritableWithResponse: true })] },
      { uuid: long('ffe0'), characteristics: [ch(long('ffe1'), { isNotifiable: true, isWritableWithoutResponse: true })] },
    ];
    const pair = pickUartPair(services);
    expect(pair?.service).toBe(long('ffe0'));
    expect(pair?.writer).toBe(pair?.reader);
  });

  it('préfère les services UART connus, dans leur ordre, à un service inconnu listé avant', () => {
    const uart = (uuid: string) => ({
      uuid,
      characteristics: [ch(`${uuid}-r`, { isNotifiable: true }), ch(`${uuid}-w`, { isWritableWithResponse: true })],
    });
    const nordic = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
    expect(pickUartPair([uart('cafe0000-0000-0000-0000-000000000001'), uart(nordic), uart(long('18f0'))])?.service).toBe(
      long('18f0'),
    );
    expect(pickUartPair([uart('cafe0000-0000-0000-0000-000000000001'), uart(nordic)])?.service).toBe(nordic);
  });

  it('se rabat sur un service non standard, mais jamais sur un service générique', () => {
    const custom = {
      uuid: 'cafe0000-0000-0000-0000-000000000001',
      characteristics: [ch('r', { isIndicatable: true }), ch('w', { isWritableWithResponse: true })],
    };
    expect(pickUartPair([custom])?.service).toBe(custom.uuid);
    expect(pickUartPair([{ ...custom, uuid: long('1801') }])).toBeNull();
  });

  it('préfère une caractéristique « notify » à une « indicate »', () => {
    const pair = pickUartPair([
      {
        uuid: long('fff0'),
        characteristics: [
          ch('ind', { isIndicatable: true }),
          ch('not', { isNotifiable: true }),
          ch('w', { isWritableWithResponse: true }),
        ],
      },
    ]);
    expect(pair?.reader.uuid).toBe('not');
  });

  it('refuse un service UART incomplet', () => {
    expect(pickUartPair([{ uuid: long('fff0'), characteristics: [ch('r', { isNotifiable: true })] }])).toBeNull();
  });

  it('reconnaît un dongle au scan par ses services ou son nom', () => {
    expect(looksLikeDongle([long('FFF0')], null)).toBe(true);
    expect(looksLikeDongle(null, 'vLinker MC-IOS')).toBe(true);
    expect(looksLikeDongle(['180d'], 'Polar H10')).toBe(false);
  });
});
