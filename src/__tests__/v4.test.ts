import { describe, expect, it } from '@jest/globals';
import type { PurchasesPackage } from 'react-native-purchases';

import { POST } from '@/app/api/guide-feedback+api';
import { guideStats } from '@/lib/guide-feedback';
import { annualSavings, plansFrom } from '@/lib/plans';
import { readStats, recordFeedback } from '@/server/guide-feedback';
import { GuideFeedbackInput } from '@/server/requests';
import { MemoryUsageStore } from '@/server/usage-store';

describe('avis sur les guides', () => {
  it('agrège les notes et la part de « réparé »', async () => {
    const store = new MemoryUsageStore();
    await recordFeedback(store, 'a', { guideId: 'vidange', rating: 5, outcome: 'fixed' });
    const stats = await recordFeedback(store, 'b', { guideId: 'vidange', rating: 3, outcome: 'garage' });
    expect(stats).toEqual({ count: 2, average: 4, fixedShare: 0.5 });
  });

  it('remplace l’avis précédent du même utilisateur au lieu de l’ajouter', async () => {
    const store = new MemoryUsageStore();
    await recordFeedback(store, 'a', { guideId: 'vidange', rating: 2, outcome: 'partial' });
    await recordFeedback(store, 'a', { guideId: 'vidange', rating: 5, outcome: 'fixed' });
    expect(await readStats(store, 'vidange')).toEqual({ count: 1, average: 5, fixedShare: 1 });
    await recordFeedback(store, 'a', { guideId: 'vidange', rating: 4, outcome: 'garage' });
    expect(await readStats(store, 'vidange')).toEqual({ count: 1, average: 4, fixedShare: 0 });
  });

  it('ne donne pas de moyenne sans avis', () => {
    expect(guideStats(0, 0, 0)).toEqual({ count: 0, average: null, fixedShare: null });
  });

  it('valide l’avis reçu', () => {
    const ok = { guideId: 'vidange', rating: 4, outcome: 'fixed', difficulty: 'harder' };
    expect(GuideFeedbackInput.safeParse(ok).success).toBe(true);
    expect(GuideFeedbackInput.safeParse({ ...ok, rating: 6 }).success).toBe(false);
    expect(GuideFeedbackInput.safeParse({ ...ok, guideId: '../x' }).success).toBe(false);
    expect(GuideFeedbackInput.safeParse({ ...ok, comment: 'x'.repeat(501) }).success).toBe(false);
  });

  it('exige une session', async () => {
    const res = await POST(new Request('https://app.test/api/guide-feedback', { method: 'POST', body: '{}' }));
    expect(res.status).toBe(401);
  });
});

describe('formules Premium', () => {
  const pkg = (packageType: string, price: number, priceString: string, pricePerMonthString: string | null = null) =>
    ({ identifier: packageType, packageType, product: { price, priceString, pricePerMonthString } }) as unknown as PurchasesPackage;

  it('calcule l’économie de l’annuel', () => {
    expect(annualSavings(6.99, 49)).toBe(42);
    expect(annualSavings(5, 70)).toBeNull();
    expect(annualSavings(0, 49)).toBeNull();
  });

  it('propose le mensuel puis l’annuel depuis l’offre RevenueCat', () => {
    const { plans, savings } = plansFrom([
      pkg('ANNUAL', 49, '49,00 €', '4,08 €'),
      pkg('CUSTOM', 2.99, '2,99 €'),
      pkg('MONTHLY', 6.99, '6,99 €'),
    ]);
    expect(plans.map((p) => [p.id, p.price, p.perMonth])).toEqual([
      ['monthly', '6,99 €', undefined],
      ['annual', '49,00 €', '4,08 €'],
    ]);
    expect(savings).toBe(42);
  });
});
