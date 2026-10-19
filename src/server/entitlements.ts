/**
 * Vérifie côté serveur les droits d'un utilisateur via l'API REST v1 de
 * RevenueCat (GET /v1/subscribers/{id}) : l'abonnement Premium et le nombre de
 * diagnostics à l'unité achetés (produits consommables, `non_subscriptions`).
 *
 * L'identifiant passé ici est toujours celui d'une session signée par le
 * serveur (voir session.ts), jamais une valeur fournie librement par l'app.
 *
 * Sans REVENUECAT_SECRET_API_KEY :
 * - en développement, le serveur fait confiance au mode démo de l'app (Premium) ;
 * - en production, personne n'est Premium et les crédits achetés ne peuvent pas
 *   être vérifiés (ils ne fonctionnent alors que dans le mode démo de l'app).
 */
export const ENTITLEMENT = process.env.REVENUECAT_ENTITLEMENT ?? 'premium';

/**
 * Identifiants des produits (côté store) du diagnostic à l'unité. Attention :
 * RevenueCat range les achats par identifiant de produit, pas par identifiant
 * de paquet (`diag_unit` dans l'offre).
 */
export function creditProductIds(): string[] {
  return (process.env.REVENUECAT_CREDIT_PRODUCT_IDS ?? 'diag_unit')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export type Entitlements = { premium: boolean; creditsPurchased: number };

type SubscriberBody = {
  subscriber?: {
    entitlements?: Record<string, { expires_date: string | null }>;
    non_subscriptions?: Record<string, unknown[]>;
  };
};

export function parseSubscriber(body: SubscriberBody, now = new Date()): Entitlements {
  const ent = body.subscriber?.entitlements?.[ENTITLEMENT];
  const premium = !!ent && (ent.expires_date === null || new Date(ent.expires_date) > now);
  const purchases = body.subscriber?.non_subscriptions ?? {};
  const creditsPurchased = creditProductIds().reduce(
    (n, id) => n + (Array.isArray(purchases[id]) ? purchases[id].length : 0),
    0,
  );
  return { premium, creditsPurchased };
}

export async function getEntitlements(appUserId: string): Promise<Entitlements> {
  const secret = process.env.REVENUECAT_SECRET_API_KEY;
  if (!secret) return { premium: process.env.NODE_ENV !== 'production', creditsPurchased: 0 };
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!res.ok) {
    console.error(`[entitlements] RevenueCat : HTTP ${res.status}`);
    return { premium: false, creditsPurchased: 0 };
  }
  return parseSubscriber((await res.json()) as SubscriberBody);
}

export async function isPremium(appUserId: string | null): Promise<boolean> {
  if (!appUserId) return false;
  return (await getEntitlements(appUserId)).premium;
}
