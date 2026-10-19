/**
 * Guides intégrés. Les couples sont des valeurs types : tant qu'aucune source
 * constructeur sous licence n'est branchée (voir `src/lib/tech-data.ts`),
 * l'interface les affiche comme tels.
 */

export type GuideStep = {
  title: string;
  detail?: string;
  torques?: string[];
  /** Étape où une erreur met en danger (levage, freins, haute tension…). */
  danger?: boolean;
};

export type Guide = {
  id: string;
  title: string;
  level: 1 | 2 | 3 | 4 | 5;
  minutes: number;
  premium: boolean;
  tools: string[];
  parts: string[];
  steps: GuideStep[];
};

export const GUIDES: Guide[] = [
  {
    id: 'obd', title: 'Lire les codes défaut avec un dongle OBD2', level: 1, minutes: 10, premium: false,
    tools: ['Dongle OBD2 ELM327 Bluetooth Low Energy (15 à 30 €)', "Smartphone avec l'app Clé de 12"], parts: [],
    steps: [
      { title: 'Repérer la prise OBD2', detail: 'Prise trapézoïdale 16 broches, presque toujours sous le volant ou derrière un cache près du levier de vitesses.' },
      { title: 'Brancher le dongle contact coupé', detail: 'Enfoncez-le à fond, son voyant doit s\'allumer.' },
      { title: 'Mettre le contact sans démarrer', detail: 'Ouvrez l\'onglet Diagnostic et touchez « Lire les codes ».' },
      { title: 'Laisser l\'app lire les codes', detail: 'Codes confirmés et en attente sont ajoutés automatiquement au diagnostic.' },
      { title: 'Ne pas effacer tout de suite', detail: 'Effacez un code seulement après réparation : sinon vous perdez l\'information utile au diagnostic.' },
    ],
  },
  {
    id: 'plaquettes', title: 'Remplacer les plaquettes de frein avant', level: 2, minutes: 90, premium: false,
    tools: ['Cric et 2 chandelles', 'Clé à roue et clé dynamométrique', 'Douilles 13 à 17 mm ou Torx selon modèle', 'Repousse-piston', 'Brosse métallique, nettoyant frein'],
    parts: ['Jeu de plaquettes avant', 'Graisse cuivre ou céramique (dos des plaquettes)'],
    steps: [
      { title: 'Débloquer les écrous de roue au sol', detail: 'Un quart de tour seulement, voiture sur ses roues, frein à main serré.' },
      { title: 'Lever et poser sur chandelles', detail: 'Ne travaillez jamais sous une voiture tenue par le seul cric.', danger: true },
      { title: "Déposer la roue et l'étrier", detail: "Retirez les vis de guide de l'étrier, suspendez-le avec un fil : il ne doit pas pendre par le flexible." },
      { title: 'Mesurer le disque', detail: "Comparez l'épaisseur à la cote minimale gravée sur le disque. En dessous, changez les disques." },
      { title: 'Repousser le piston', detail: 'Ouvrez le bocal de liquide de frein pour surveiller le niveau, repoussez le piston doucement.' },
      { title: 'Monter les plaquettes neuves', detail: 'Graisse fine au dos, jamais sur la garniture. Remontez les ressorts et clips.' },
      { title: "Remonter l'étrier", detail: 'Serrez les vis de guide au couple constructeur.', torques: ["Vis de guide d'étrier : 25 à 35 N·m"], danger: true },
      { title: 'Remonter la roue', detail: 'Serrage en étoile au sol.', torques: ['Écrous de roue : 100 à 120 N·m'], danger: true },
      { title: 'Pomper la pédale avant de rouler', detail: "Plusieurs coups de pédale jusqu'à ce qu'elle soit ferme, puis 200 km de rodage sans freinage brutal.", danger: true },
    ],
  },
  {
    id: 'vidange', title: 'Faire la vidange et changer le filtre à huile', level: 2, minutes: 60, premium: false,
    tools: ['Bac de vidange 6 L', 'Clé de bouchon de carter', 'Clé à filtre', 'Entonnoir', 'Rampes ou cric et chandelles'],
    parts: ['Huile à la norme constructeur (voir carnet)', 'Filtre à huile', 'Joint de bouchon de carter'],
    steps: [
      { title: 'Faire tourner le moteur 5 minutes', detail: "Huile tiède : elle s'écoule mieux. Attention, l'échappement chauffe vite." },
      { title: 'Mettre la voiture à plat, sécurisée', detail: 'Rampes ou chandelles, frein à main serré.', danger: true },
      { title: 'Vidanger', detail: 'Retirez le bouchon de carter, laissez couler 10 à 15 minutes.' },
      { title: 'Changer le filtre', detail: 'Huilez le joint du filtre neuf, serrez à la main puis 3/4 de tour.' },
      { title: 'Remonter le bouchon avec un joint neuf', torques: ['Bouchon de carter : 25 à 35 N·m'] },
      { title: 'Remplir et contrôler', detail: 'Versez 90 % de la capacité, démarrez 1 minute, attendez 5 minutes puis complétez jusqu\'au repère max.' },
      { title: "Rapporter l'huile usagée", detail: "En déchetterie ou chez un vendeur de pièces, jamais à l'égout." },
    ],
  },
  {
    id: 'batterie', title: 'Remplacer la batterie', level: 1, minutes: 30, premium: false,
    tools: ['Clés 10 et 13 mm', 'Brosse pour cosses', 'Gants et lunettes'],
    parts: ['Batterie de même capacité (Ah), même intensité de démarrage (A) et même polarité'],
    steps: [
      { title: 'Couper le contact, retirer la clé', detail: "Notez les codes d'autoradio si votre véhicule en demande." },
      { title: 'Débrancher le négatif (−) en premier', detail: 'Évite un court-circuit si la clé touche la carrosserie.', danger: true },
      { title: 'Débrancher le positif (+)', detail: 'Puis retirez la bride de maintien.' },
      { title: 'Poser la batterie neuve', detail: 'Nettoyez les cosses, fixez la bride.' },
      { title: 'Rebrancher le positif (+) puis le négatif (−)', detail: 'Ordre inverse du démontage.' },
      { title: 'Réinitialiser si besoin', detail: 'Lève-vitres, Stop & Start : certains véhicules demandent d\'enregistrer la batterie avec un outil de diagnostic.' },
    ],
  },
  {
    id: 'filtre-air', title: 'Changer le filtre à air', level: 1, minutes: 15, premium: false,
    tools: ['Tournevis ou douille selon boîtier'], parts: ['Filtre à air'],
    steps: [
      { title: 'Ouvrir le boîtier de filtre', detail: 'Clips ou vis, sur le dessus du moteur ou sur le côté.' },
      { title: "Retirer l'ancien filtre", detail: 'Notez son sens de montage.' },
      { title: 'Nettoyer le boîtier', detail: "Un chiffon sec, sans laisser tomber de débris dans l'admission." },
      { title: 'Poser le filtre neuf et refermer', detail: 'Vérifiez que le couvercle est bien étanche partout.' },
    ],
  },
  {
    id: 'refroidissement', title: 'Contrôler et compléter le liquide de refroidissement', level: 1, minutes: 15, premium: false,
    tools: ['Chiffon', 'Lampe'], parts: ["Liquide de refroidissement compatible (même type que l'existant)"],
    steps: [
      { title: 'Attendre que le moteur soit froid', detail: "N'ouvrez jamais le vase d'expansion moteur chaud : le liquide sous pression peut brûler gravement.", danger: true },
      { title: 'Lire le niveau sur le vase', detail: 'Entre les repères MIN et MAX.' },
      { title: "Ouvrir lentement d'un quart de tour", detail: "Laissez la pression résiduelle s'échapper, puis ouvrez." },
      { title: "Compléter jusqu'au MAX", detail: 'Ne mélangez pas des liquides de technologies différentes.' },
      { title: 'Surveiller les jours suivants', detail: 'Un niveau qui baisse sans fuite visible doit faire penser au joint de culasse.' },
    ],
  },
  {
    id: 'bougies', title: "Remplacer les bougies d'allumage", level: 2, minutes: 45, premium: true,
    tools: ['Clé à bougie 14 ou 16 mm', 'Rallonge et cardan', 'Clé dynamométrique', 'Soufflette'], parts: ['Jeu de bougies (référence constructeur)'],
    steps: [
      { title: 'Travailler moteur froid', detail: "Un filetage aluminium chaud s'abîme facilement." },
      { title: 'Déposer les bobines une par une', detail: 'Soufflez autour des puits avant de retirer chaque bougie.' },
      { title: 'Visser la bougie neuve à la main', detail: 'Démarrez le filetage à la main pour ne pas le croiser.' },
      { title: 'Serrer au couple', torques: ['Bougie à joint plat M14 : 20 à 28 N·m', 'Bougie à siège conique : 10 à 20 N·m'] },
      { title: 'Remonter les bobines et tester', detail: 'Démarrage, ralenti stable, aucun voyant.' },
    ],
  },
  {
    id: 'bobine', title: "Remplacer une bobine d'allumage crayon", level: 2, minutes: 30, premium: true,
    tools: ['Douilles 8 à 10 mm', 'Tournevis plat fin', 'Dongle OBD2'], parts: ['Bobine crayon (référence constructeur)'],
    steps: [
      { title: 'Confirmer le cylindre en défaut', detail: 'Code P0301 à P0304 : le dernier chiffre indique le cylindre. Le cylindre 1 est généralement côté distribution.' },
      { title: 'Permuter pour vérifier', detail: "Inversez la bobine suspecte avec sa voisine, effacez le code, roulez : si le défaut suit la bobine, elle est en cause." },
      { title: 'Débrancher et déposer la bobine', detail: 'Appuyez sur le verrou du connecteur, retirez la vis, tirez droit.' },
      { title: 'Contrôler la bougie au passage', detail: 'Électrode usée ou noircie : changez-la en même temps.' },
      { title: 'Monter la bobine neuve', torques: ['Vis de bobine : 8 à 10 N·m'] },
      { title: 'Effacer le code et rouler', detail: "Vérifiez qu'aucun code ne revient après 20 km." },
    ],
  },
];

export const GUIDE_IDS = GUIDES.map((g) => g.id);

export function findGuide(id: string | null | undefined): Guide | undefined {
  return id ? GUIDES.find((g) => g.id === id) : undefined;
}
