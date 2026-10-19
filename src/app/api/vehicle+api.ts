import { authenticate, jsonError, preflight, rateLimit, secure } from '@/server/http';
import { lookupPlate, PlateLookupUnavailable } from '@/server/plate-lookup';

/** Identification par la plaque : fournisseur payant, donc session exigée et débit limité. */
export function GET(request: Request) {
  return secure(request, async () => {
    const auth = await authenticate(request);
    if (auth instanceof Response) return auth;
    const limited = await rateLimit(request, 'plate', auth.userId);
    if (limited) return limited;
    const plate = (new URL(request.url).searchParams.get('plate') ?? '').slice(0, 20);
    try {
      const vehicle = await lookupPlate(plate);
      if (!vehicle) return jsonError('Plaque introuvable. Vérifiez le format (AB-123-CD).', 404);
      return Response.json(vehicle);
    } catch (e) {
      if (e instanceof PlateLookupUnavailable) return jsonError('La recherche par plaque n’est pas encore disponible. Saisissez le véhicule à la main.', 501);
      console.error('[api] plaque', e);
      return jsonError('La recherche par plaque est momentanément indisponible.', 502);
    }
  });
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
