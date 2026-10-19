import { jsonError } from '@/server/http';
import { lookupPlate, PlateLookupUnavailable } from '@/server/plate-lookup';

export async function GET(request: Request) {
  const plate = new URL(request.url).searchParams.get('plate') ?? '';
  try {
    const vehicle = await lookupPlate(plate);
    if (!vehicle) return jsonError('Plaque introuvable. Vérifiez le format (AB-123-CD).', 404);
    return Response.json(vehicle);
  } catch (e) {
    if (e instanceof PlateLookupUnavailable) return jsonError("La recherche par plaque n'est pas encore disponible. Saisissez le véhicule à la main.", 501);
    console.error(e);
    return jsonError('La recherche par plaque est momentanément indisponible.', 502);
  }
}
