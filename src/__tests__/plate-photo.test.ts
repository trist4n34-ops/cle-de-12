import { describe, expect, it } from '@jest/globals';

import { POST } from '@/app/api/plate-photo+api';
import { normalizePlate } from '@/server/plate-lookup';
import { PlatePhotoInput } from '@/server/requests';

const JPEG = '/9j/4AAQSkZJRgABAQ==';

describe('plaque lue sur une photo', () => {
  it('exige une session', async () => {
    const res = await POST(new Request('https://app.test/api/plate-photo', { method: 'POST', body: JSON.stringify({ photo: JPEG }) }));
    expect(res.status).toBe(401);
  });

  it('n’accepte que des images JPEG ou PNG', () => {
    expect(PlatePhotoInput.safeParse({ photo: JPEG }).success).toBe(true);
    expect(PlatePhotoInput.safeParse({ photo: btoa('<svg onload=alert(1)>') }).success).toBe(false);
  });

  it('ramène la lecture de l’IA au format de plaque', () => {
    expect(normalizePlate('ab 123 cd')).toBe('AB-123-CD');
    expect(normalizePlate('')).toBeNull();
  });
});
