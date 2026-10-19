import { preflight, rateLimit, secure } from '@/server/http';
import { mintSession } from '@/server/session';

/**
 * Crée une session : un identifiant utilisateur tiré au sort par le serveur et
 * son jeton signé, à renvoyer ensuite dans `Authorization: Bearer <jeton>`.
 * Chaque session neuve a droit au quota gratuit : la création est limitée par IP.
 */
export function POST(request: Request) {
  return secure(request, async () => {
    const limited = await rateLimit(request, 'session');
    if (limited) return limited;
    return Response.json(await mintSession(), { status: 201 });
  });
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
