import { GUIDE_IDS } from '@/data/guides';
import { authenticate, preflight, rateLimit, secure } from '@/server/http';
import { usageStore } from '@/server/usage-store';
import { deleteUserData } from '@/server/user-data';

/**
 * Supprime les données serveur liées à la session : les avis sur les guides
 * (retirés des moyennes). Les données de l'appareil sont effacées par l'app.
 * Voir src/server/user-data.ts pour ce qui est gardé et pourquoi.
 */
export function POST(request: Request) {
  return secure(request, async () => {
    const auth = await authenticate(request);
    if (auth instanceof Response) return auth;
    const limited = await rateLimit(request, 'feedback', auth.userId);
    if (limited) return limited;
    return Response.json(await deleteUserData(usageStore(), auth.userId, GUIDE_IDS));
  });
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
