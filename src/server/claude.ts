/**
 * Appels à Claude, côté serveur uniquement : la clé ANTHROPIC_API_KEY ne quitte
 * jamais le serveur. Importé seulement depuis les fichiers `+api.ts`.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

import { GUIDE_IDS } from '@/data/guides';
import { DiagnosisRequest, DiagnosisSchema, isHighVoltage, vehicleLabel } from '@/lib/diagnosis';
import { RepairPlanSchema } from '@/lib/repair-plan';
import { QuoteReviewSchema } from '@/lib/quote';

export const MODEL = process.env.CLAUDE_MODEL ?? 'claude-opus-5-5';

/** En cas de refus d'un filtre de sécurité, l'API relance la demande sur un modèle de repli. */
const FALLBACK: { betas: Anthropic.AnthropicBeta[]; fallbacks: 'default' } = {
  betas: ['server-side-fallback-2026-07-01'],
  fallbacks: 'default',
};

let client: Anthropic | null = null;
function anthropic() {
  client ??= new Anthropic();
  return client;
}

const PERSONA = `Tu es Clé de 12, un mécanicien automobile expérimenté qui aide des particuliers en France à comprendre et réparer leur voiture. Tu réponds en français, simplement, sans jargon inutile.
Règles de sécurité, toujours :
- Freins, direction, liaisons au sol, fuite d'essence, surchauffe, voyant moteur clignotant : urgence "stop" tant que ce n'est pas contrôlé.
- Hybride ou électrique : ne jamais proposer d'intervenir sur la haute tension (câbles orange, batterie de traction, onduleur) ; renvoyer vers un professionnel habilité.
- Les couples de serrage que tu donnes sont des valeurs types : dis-le et renvoie à la valeur constructeur.
- Difficulté 4 ou 5 : conseille le garage plutôt que de pousser l'amateur à le faire.
Les prix sont en euros, marché français, pièces seules et main-d'œuvre en garage indépendant.`;

function vehicleBlock(v: DiagnosisRequest['vehicle']) {
  return `Véhicule : ${vehicleLabel(v) || 'non précisé'} ; carburant : ${v.fuel}${v.plate ? ` ; immatriculation ${v.plate}` : ''}${v.vin ? ` ; VIN ${v.vin}` : ''}.${isHighVoltage(v.fuel) ? ' Véhicule à haute tension.' : ''}`;
}

function imageBlock(base64: string): Anthropic.Beta.BetaImageBlockParam {
  return { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } };
}

/** Message d'erreur affichable si Claude refuse, ou si la réponse ne respecte pas le format. */
export class ClaudeError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

async function parse<T extends z.ZodType>(
  schema: T,
  content: Anthropic.Beta.BetaMessageParam['content'],
  effort: 'low' | 'medium' | 'high',
): Promise<z.infer<T>> {
  const response = await anthropic().beta.messages.parse({
    ...FALLBACK,
    model: MODEL,
    max_tokens: 16000,
    system: PERSONA,
    output_config: { effort, format: betaZodOutputFormat(schema) },
    messages: [{ role: 'user', content }],
  });
  if (response.stop_reason === 'refusal') throw new ClaudeError("L'IA n'a pas pu traiter cette demande. Reformulez les symptômes.", 422);
  if (!response.parsed_output) throw new ClaudeError("La réponse de l'IA était incomplète. Relancez le diagnostic.");
  return response.parsed_output;
}

export function diagnose(req: DiagnosisRequest) {
  const text = `${vehicleBlock(req.vehicle)}
Symptômes décrits : ${req.symptoms || 'aucun'}
Symptômes cochés : ${req.symptomTags.join(', ') || 'aucun'}
Codes OBD2 : ${req.codes.join(', ') || 'aucun'}
${req.photo ? "Une photo prise par l'utilisateur est jointe : dis dans le résumé ce que tu y vois d'utile." : ''}
Fais un diagnostic différentiel réaliste pour ce modèle, ce moteur et ce kilométrage, en tenant compte des pannes connues de ce moteur.
- 3 à 4 causes, probabilités entières qui totalisent 100, difficulty de 1 (débutant) à 5 (garage conseillé).
- partsCost et garageCost en fourchettes ("35–70 €").
- partQuery : la pièce à chercher chez un vendeur en ligne ("bobine d'allumage"), ou "" si aucune pièce.
- guideId : l'un de ${GUIDE_IDS.join(', ')}, ou null.
- checks : contrôles dans l'ordre, du plus simple au plus complexe.
- questions : 1 à 3 questions qui affineraient le diagnostic.`;
  return parse(DiagnosisSchema, req.photo ? [imageBlock(req.photo), { type: 'text', text }] : text, 'medium');
}

export function repairPlan(input: { vehicle: DiagnosisRequest['vehicle']; repair: string; context: string }) {
  return parse(
    RepairPlanSchema,
    `${vehicleBlock(input.vehicle)}
Réparation : ${input.repair}
Contexte du diagnostic : ${input.context}
Rédige un plan de réparation pour ce véhicule précis : outillage, pièces, étapes dans l'ordre, couples de serrage en N·m (en précisant qu'il s'agit de valeurs types), étapes dangereuses signalées (danger: true). Si la réparation dépasse un amateur, dis-le dans warnings.`,
    'medium',
  );
}

export function reviewQuote(input: { vehicle: DiagnosisRequest['vehicle']; photo: string; context?: string }) {
  return parse(
    QuoteReviewSchema,
    [
      imageBlock(input.photo),
      {
        type: 'text',
        text: `${vehicleBlock(input.vehicle)}
La photo est un devis de garage.${input.context ? ` Diagnostic connu : ${input.context}` : ''}
Lis chaque ligne (pièce ou main-d'œuvre), compare le prix aux prix habituels du marché français pour ce véhicule et dis si la ligne est justifiée. Verdict global : "normal", "eleve" ou "a_verifier". Ne donne jamais de chiffre que tu ne lis pas sur le devis dans "quoted".`,
      },
    ],
    'medium',
  );
}

export async function chat(input: {
  vehicle: DiagnosisRequest['vehicle'];
  context: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}): Promise<string> {
  const response = await anthropic().beta.messages.create({
    ...FALLBACK,
    model: MODEL,
    max_tokens: 4000,
    system: `${PERSONA}
Tu accompagnes l'utilisateur pendant une réparation. Réponds en 6 phrases maximum, concret, sécurité d'abord.
${vehicleBlock(input.vehicle)}
Diagnostic en cours : ${input.context}`,
    output_config: { effort: 'low' },
    messages: input.messages.slice(-12),
  });
  if (response.stop_reason === 'refusal') throw new ClaudeError("L'IA n'a pas pu répondre à cette question.", 422);
  return response.content
    .flatMap((b) => (b.type === 'text' ? [b.text] : []))
    .join('\n')
    .trim();
}
