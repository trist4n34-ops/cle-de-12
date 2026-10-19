/**
 * Identifier un bruit sans enregistrement : on demande quand il apparaît et à
 * quoi il ressemble, puis on propose les causes les plus fréquentes.
 */
export type NoiseWhen = 'demarrage' | 'ralenti' | 'acceleration' | 'freinage' | 'virage' | 'bosses' | 'vitesse' | 'embrayage';
export type NoiseKind = 'claquement' | 'sifflement' | 'grincement' | 'grondement' | 'cliquetis' | 'frottement' | 'cognement';

export const NOISE_WHEN: { id: NoiseWhen; label: string }[] = [
  { id: 'demarrage', label: 'Au démarrage' },
  { id: 'ralenti', label: 'Au ralenti' },
  { id: 'acceleration', label: 'En accélérant' },
  { id: 'freinage', label: 'En freinant' },
  { id: 'virage', label: 'En tournant' },
  { id: 'bosses', label: 'Sur les bosses' },
  { id: 'vitesse', label: 'Qui augmente avec la vitesse' },
  { id: 'embrayage', label: 'En débrayant' },
];

export const NOISE_KIND: { id: NoiseKind; label: string }[] = [
  { id: 'claquement', label: 'Claquement' },
  { id: 'sifflement', label: 'Sifflement' },
  { id: 'grincement', label: 'Grincement, couinement' },
  { id: 'grondement', label: 'Grondement, ronronnement' },
  { id: 'cliquetis', label: 'Cliquetis' },
  { id: 'frottement', label: 'Frottement métallique' },
  { id: 'cognement', label: 'Cognement sourd' },
];

export type NoiseCause = { title: string; detail: string; stop?: boolean; guideId?: string };

type Rule = { when: NoiseWhen[]; kind: NoiseKind[]; cause: NoiseCause };

const RULES: Rule[] = [
  { when: ['freinage'], kind: ['frottement'], cause: { title: 'Plaquettes de frein usées jusqu’au métal', detail: 'Le support métallique frotte le disque. Les disques s’abîment vite.', stop: true, guideId: 'plaquettes' } },
  { when: ['freinage'], kind: ['grincement', 'sifflement'], cause: { title: 'Témoin d’usure des plaquettes ou plaquettes vitrifiées', detail: 'Un petit ergot métallique siffle quand les plaquettes arrivent en fin de vie.', guideId: 'plaquettes' } },
  { when: ['freinage'], kind: ['claquement', 'cognement'], cause: { title: 'Étrier ou plaquettes mal fixés, silentblocs de triangle', detail: 'Un jeu dans le train avant se fait entendre quand le poids bascule.', stop: true } },
  { when: ['virage'], kind: ['claquement', 'cliquetis'], cause: { title: 'Cardan (joint homocinétique) usé', detail: 'Claquement régulier en braquant fort et en accélérant. Vérifiez si le soufflet est déchiré.' } },
  { when: ['virage'], kind: ['grincement', 'grondement'], cause: { title: 'Roulement de roue, coupelle d’amortisseur ou direction assistée', detail: 'Un roulement gronde plus fort d’un côté selon le sens du virage.' } },
  { when: ['vitesse'], kind: ['grondement'], cause: { title: 'Roulement de roue', detail: 'Ronronnement qui monte avec la vitesse, pas avec le régime moteur. Il change en virage.' } },
  { when: ['vitesse'], kind: ['frottement', 'sifflement'], cause: { title: 'Tôle pare-chaleur, étrier qui frotte ou pneu', detail: 'Regardez si une roue est plus chaude que les autres après un trajet (étrier grippé).' } },
  { when: ['bosses'], kind: ['claquement', 'cognement'], cause: { title: 'Biellette de barre stabilisatrice ou rotule', detail: 'La pièce la plus souvent en cause pour un « cloc » sur les dos-d’âne, peu chère à changer.' } },
  { when: ['bosses'], kind: ['grincement'], cause: { title: 'Silentblocs ou amortisseurs fatigués', detail: 'Un couinement sur les bosses vient souvent d’un caoutchouc sec ou fendu.' } },
  { when: ['demarrage'], kind: ['cliquetis', 'claquement'], cause: { title: 'Chaîne de distribution ou poussoirs hydrauliques', detail: 'Un bruit de crécelle de quelques secondes à froid annonce une chaîne détendue.', stop: true } },
  { when: ['demarrage', 'ralenti'], kind: ['sifflement', 'grincement'], cause: { title: 'Courroie d’accessoires qui patine', detail: 'Couinement aigu, souvent par temps humide ou en braquant. Vérifiez la tension et l’état de la courroie.' } },
  { when: ['demarrage'], kind: ['grincement', 'frottement'], cause: { title: 'Démarreur ou volant moteur', detail: 'Un bruit métallique pendant le lancement vient du pignon du démarreur.' } },
  { when: ['ralenti'], kind: ['cognement', 'claquement'], cause: { title: 'Volant moteur bimasse ou support moteur', detail: 'Le bruit disparaît souvent quand on débraie si c’est le volant moteur.' } },
  { when: ['ralenti', 'acceleration'], kind: ['cliquetis'], cause: { title: 'Injecteur, fuite d’échappement au collecteur ou cliquetis d’allumage', detail: 'Un tic-tac rapide qui suit le régime. Moteur froid, cherchez une trace noire au collecteur.' } },
  { when: ['acceleration'], kind: ['sifflement'], cause: { title: 'Turbo ou durite de suralimentation fendue', detail: 'Un sifflement fort avec perte de puissance indique souvent une fuite d’air. Évitez les fortes charges.', stop: true } },
  { when: ['acceleration'], kind: ['cognement'], cause: { title: 'Coussinets de bielle', detail: 'Cognement grave qui augmente en charge, voyant d’huile possible. Arrêtez le moteur.', stop: true } },
  { when: ['acceleration'], kind: ['grondement'], cause: { title: 'Échappement percé ou silentbloc d’échappement', detail: 'Le bruit est plus grave et plus fort que d’habitude, surtout à froid.' } },
  { when: ['embrayage'], kind: ['grincement', 'grondement', 'sifflement'], cause: { title: 'Butée d’embrayage', detail: 'Le bruit apparaît ou disparaît quand on appuie sur la pédale.' } },
];

/** Causes possibles, celles qui demandent l'arrêt en premier. */
export function noiseCauses(when: NoiseWhen[], kind: NoiseKind[]): NoiseCause[] {
  const seen = new Set<string>();
  return RULES.filter((r) => r.when.some((w) => when.includes(w)) && r.kind.some((k) => kind.includes(k)))
    .map((r) => r.cause)
    .filter((c) => !seen.has(c.title) && seen.add(c.title))
    .sort((a, b) => Number(!!b.stop) - Number(!!a.stop));
}

/** Phrase ajoutée à la description des symptômes. */
export function noiseSentence(when: NoiseWhen[], kind: NoiseKind[]): string {
  const w = NOISE_WHEN.filter((x) => when.includes(x.id)).map((x) => x.label.toLowerCase());
  const k = NOISE_KIND.filter((x) => kind.includes(x.id)).map((x) => x.label.toLowerCase());
  return `Bruit : ${k.join(' ou ')}, ${w.join(' et ')}.`;
}
