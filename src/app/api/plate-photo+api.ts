import { ClaudeError, readPlate } from '@/server/claude';
import { authenticate, jsonError, preflight, rateLimit, secure } from '@/server/http';
import { lookupPlate, normalizePlate, PlateLookupUnavailable } from '@/server/plate-lookup';
import { PlatePhotoInput, readJson } from '@/server/requests';

/**
 * Plaque lue sur une photo (voiture ou carte grise), puis identification du
 * véhicule si un fournisseur SIV est branché. Gratuit, mais session exigée et
 * débit limité comme la recherche par plaque.
 */
export function POST(request: Request) {
  return secure(request, async () => {
    const auth = await authenticate(request);
    if (auth instanceof Response) return auth;
    const limited = await rateLimit(request, 'plate', auth.userId);
    if (limited) return limited;
    const input = await readJson(request, PlatePhotoInput);
    if (input instanceof Response) return input;
    if (!process.env.ANTHROPIC_API_KEY) return jsonError('L’IA n’est pas configurée sur ce serveur.', 503);

    let read;
    try {
      read = await readPlate(input.photo);
    } catch (e) {
      if (e instanceof ClaudeError) return jsonError('La plaque n’a pas pu être lue. Tapez-la à la main.', 422);
      console.error('[api] lecture de plaque', e);
      return jsonError('La lecture de la plaque est momentanément indisponible.', 502);
    }
    const plate = normalizePlate(read.plate);
    if (!plate) return jsonError('Plaque illisible sur cette image. Cadrez-la de face et bien éclairée, ou tapez-la.', 422);

    let vehicle = null;
    try {
      vehicle = await lookupPlate(plate);
    } catch (e) {
      if (!(e instanceof PlateLookupUnavailable)) console.error('[api] plaque', e);
    }
    return Response.json({ plate, confidence: read.confidence, vehicle });
  });
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
