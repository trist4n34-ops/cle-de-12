/**
 * Vérifie côté serveur qu'un utilisateur a bien l'abonnement Premium, via l'API
 * REST de RevenueCat. Sans REVENUECAT_SECRET_API_KEY (développement), le serveur
 * fait confiance au mode démo de l'app : à ne jamais déployer ainsi en production.
 */
export const ENTITLEMENT = process.env.REVENUECAT_ENTITLEMENT ?? 'premium';

export async function isPremium(appUserId: string | null): Promise<boolean> {
  const secret = process.env.REVENUECAT_SECRET_API_KEY;
  if (!secret) return process.env.NODE_ENV !== 'production';
  if (!appUserId) return false;
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!res.ok) return false;
  const body = (await res.json()) as {
    subscriber?: { entitlements?: Record<string, { expires_date: string | null }> };
  };
  const ent = body.subscriber?.entitlements?.[ENTITLEMENT];
  return !!ent && (ent.expires_date === null || new Date(ent.expires_date) > new Date());
}
