import { GUIDE_IDS } from '@/data/guides';
import { readStats, recordFeedback } from '@/server/guide-feedback';
import { authenticate, jsonError, preflight, rateLimit, secure } from '@/server/http';
import { GuideFeedbackInput, readJson } from '@/server/requests';
import { usageStore } from '@/server/usage-store';

const unknownGuide = () => jsonError('Guide inconnu.', 404);

/** Avis de la communauté sur un guide : note moyenne et part de « réparé ». */
export function GET(request: Request) {
  return secure(request, async () => {
    const auth = await authenticate(request);
    if (auth instanceof Response) return auth;
    const limited = await rateLimit(request, 'feedback', auth.userId);
    if (limited) return limited;
    const guideId = new URL(request.url).searchParams.get('guide') ?? '';
    if (!GUIDE_IDS.includes(guideId)) return unknownGuide();
    return Response.json(await readStats(usageStore(), guideId));
  });
}

/**
 * Avis après un guide. Les notes sont agrégées ; le commentaire est journalisé
 * pour l'équipe qui améliore les guides (jamais renvoyé aux autres utilisateurs).
 */
export function POST(request: Request) {
  return secure(request, async () => {
    const auth = await authenticate(request);
    if (auth instanceof Response) return auth;
    const limited = await rateLimit(request, 'feedback', auth.userId);
    if (limited) return limited;
    const input = await readJson(request, GuideFeedbackInput);
    if (input instanceof Response) return input;
    if (!GUIDE_IDS.includes(input.guideId)) return unknownGuide();
    const stats = await recordFeedback(usageStore(), auth.userId, input);
    const comment = input.comment?.trim();
    if (comment) {
      console.info(
        '[avis guide]',
        JSON.stringify({ guide: input.guideId, rating: input.rating, outcome: input.outcome, difficulty: input.difficulty, language: input.language, comment }),
      );
    }
    return Response.json(stats);
  });
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
