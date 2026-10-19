/**
 * Diagnostic de secours sans IA : codes et symptômes de la base intégrée.
 * Utilisé hors connexion ou quand le serveur IA ne répond pas.
 */
import { OBD_CODES } from '@/data/obd-codes';
import { SYMPTOMS } from '@/data/symptoms';
import { Cause, Diagnosis, DiagnosisRequest, isHighVoltage } from '@/lib/diagnosis';

const STOP_WORDS = /frein|surchauffe|fumée blanche|clignote|odeur d'essence|direction|haute tension/;

export function localDiagnosis(req: DiagnosisRequest): Diagnosis {
  const causes: Cause[] = [];
  const codes = req.codes.map((code) => ({
    code,
    meaning: OBD_CODES[code]?.meaning ?? 'Code absent de la base intégrée',
  }));

  for (const code of req.codes) {
    const info = OBD_CODES[code];
    info?.causes.forEach((title, i) =>
      causes.push({
        title,
        probability: Math.round(60 / (i + 1)),
        explanation: `Cause courante associée au code ${code}.`,
        difficulty: Math.min(5, 2 + i),
        partsCost: 'Voir les prix des pièces',
        garageCost: 'À faire chiffrer',
        partQuery: title,
        guideId: i === 0 ? (info.guideId ?? null) : null,
      }),
    );
  }

  const text = req.symptoms.toLowerCase();
  const matched = SYMPTOMS.filter(
    (s) => req.symptomTags.includes(s.id) || s.keywords.some((k) => text.includes(k)),
  );
  for (const s of matched) {
    for (const sc of s.causes) {
      causes.push({
        title: sc.title,
        probability: sc.weight,
        explanation: `Cause fréquente pour le symptôme « ${s.label.toLowerCase()} ».`,
        difficulty: sc.difficulty,
        partsCost: sc.partsCost,
        garageCost: sc.garageCost,
        partQuery: sc.partsCost.startsWith('0 €') ? '' : sc.title,
        guideId: sc.guideId ?? null,
      });
    }
  }

  const seen = new Set<string>();
  const top = causes
    .filter((cause) => !seen.has(cause.title) && seen.add(cause.title))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 4);
  const total = top.reduce((sum, cause) => sum + cause.probability, 0) || 1;
  top.forEach((cause) => (cause.probability = Math.round((cause.probability * 100) / total)));

  const highVoltage = isHighVoltage(req.vehicle.fuel);
  const stop =
    STOP_WORDS.test(text) ||
    matched.some((s) => s.stop) ||
    req.codes.some((code) => OBD_CODES[code]?.stop);

  return {
    summary: top.length
      ? 'Diagnostic établi à partir de la base de codes et de symptômes intégrée, sans IA.'
      : 'Aucune correspondance dans la base intégrée. Précisez les symptômes ou lisez les codes défaut.',
    urgency: stop ? 'stop' : 'prudence',
    urgencyReason: stop
      ? "Le symptôme touche un organe de sécurité ou risque d'abîmer le moteur. Évitez de rouler avant contrôle."
      : 'Roulez avec prudence et faites contrôler rapidement.',
    codes,
    causes: top,
    checks: [
      'Lire ou relire les codes défaut avec un dongle OBD2.',
      'Contrôler les niveaux : huile, liquide de refroidissement, liquide de frein.',
      'Noter dans quelles conditions le problème apparaît (froid, chaud, en charge).',
    ],
    safety: [
      'Ne travaillez jamais sous un véhicule tenu par le seul cric.',
      'Moteur froid avant d’ouvrir le circuit de refroidissement.',
      ...(highVoltage
        ? ['Véhicule à haute tension : ne touchez à aucun câble orange ni à la batterie de traction. Confiez ces organes à un professionnel habilité.']
        : []),
    ],
    questions: [],
  };
}
