/**
 * Guides intégrés. Les couples sont des valeurs types : tant qu'aucune source
 * constructeur sous licence n'est branchée (voir `src/lib/tech-data.ts`),
 * l'interface les affiche comme tels. Quand une valeur dépend trop du véhicule,
 * le guide le dit plutôt que d'inventer un chiffre : le plan sur mesure
 * (`api.repairPlan`) adapte ensuite le guide au modèle exact.
 *
 * Tous les textes sont originaux : aucun contenu de manuel tiers n'est repris.
 */

export type GuideStep = {
  title: string;
  detail?: string;
  torques?: string[];
  /** Étape où une erreur met en danger (levage, freins, haute tension…). */
  danger?: boolean;
};

export type GuideCategoryId =
  | 'entretien'
  | 'freinage'
  | 'moteur'
  | 'allumage-injection'
  | 'refroidissement'
  | 'electricite'
  | 'suspension-direction'
  | 'transmission'
  | 'echappement'
  | 'climatisation-habitacle'
  | 'carrosserie'
  | 'pneus';

export type GuideCategory = { id: GuideCategoryId; label: string; description: string };

/** Catégories de la bibliothèque, dans l'ordre d'affichage. */
export const GUIDE_CATEGORIES: GuideCategory[] = [
  { id: 'entretien', label: 'Entretien courant', description: 'Vidange, filtres et niveaux : l’entretien de base.' },
  { id: 'freinage', label: 'Freinage', description: 'Plaquettes, disques, tambours et liquide de frein.' },
  { id: 'moteur', label: 'Moteur et distribution', description: 'Courroies, distribution et étanchéité du moteur.' },
  { id: 'allumage-injection', label: 'Allumage et injection', description: 'Bougies, bobines, injecteurs et capteurs moteur.' },
  { id: 'refroidissement', label: 'Refroidissement', description: 'Liquide, thermostat, pompe à eau et radiateur.' },
  { id: 'electricite', label: 'Électricité et éclairage', description: 'Batterie, charge, démarrage, fusibles et ampoules.' },
  { id: 'suspension-direction', label: 'Suspension et direction', description: 'Amortisseurs, biellettes, rotules et roulements.' },
  { id: 'transmission', label: 'Transmission et embrayage', description: 'Cardans, embrayage et huile de boîte.' },
  { id: 'echappement', label: 'Échappement et dépollution', description: 'Silencieux, vanne EGR, FAP et AdBlue.' },
  { id: 'climatisation-habitacle', label: 'Climatisation et habitacle', description: 'Filtre d’habitacle, ventilation et climatisation.' },
  { id: 'carrosserie', label: 'Carrosserie et vitrage', description: 'Essuie-glaces, rétroviseurs, vitres et pare-brise.' },
  { id: 'pneus', label: 'Pneus et roues', description: 'Pression, usure, permutation, roue de secours et TPMS.' },
];

export type Guide = {
  id: string;
  category: GuideCategoryId;
  title: string;
  /** Difficulté de 1 (débutant) à 5 (garage conseillé). */
  level: 1 | 2 | 3 | 4 | 5;
  /** Intervention qu'il vaut mieux confier à un garage (outillage, calage, sécurité). */
  garage?: boolean;
  minutes: number;
  premium: boolean;
  tools: string[];
  parts: string[];
  steps: GuideStep[];
};

/* Étapes communes aux guides qui demandent de déposer une roue. */
const LOOSEN_NUTS: GuideStep = {
  title: 'Débloquer les écrous de roue au sol',
  detail: 'Un quart de tour seulement, voiture sur ses roues, frein à main serré.',
};
const ON_STANDS: GuideStep = {
  title: 'Lever et poser sur chandelles',
  detail: 'Sol dur et plat, cric sur le point de levage prévu, chandelles sous la caisse, roues opposées calées. Ne travaillez jamais sous une voiture tenue par le seul cric.',
  danger: true,
};
const REFIT_WHEEL: GuideStep = {
  title: 'Remonter la roue',
  detail: 'Approchez les écrous à la main, reposez la voiture, puis serrez en étoile à la clé dynamométrique.',
  torques: ['Écrous de roue : 100 à 120 N·m (selon véhicule)'],
  danger: true,
};
const WHEEL_TORQUE = 'Écrous de roue : 100 à 120 N·m (selon véhicule)';

export const GUIDES: Guide[] = [
  {
    id: 'obd', category: 'electricite', title: 'Lire les codes défaut avec un dongle OBD2', level: 1, minutes: 10, premium: false,
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
    id: 'plaquettes', category: 'freinage', title: 'Remplacer les plaquettes de frein avant', level: 2, minutes: 90, premium: false,
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
    id: 'vidange', category: 'entretien', title: 'Faire la vidange et changer le filtre à huile', level: 2, minutes: 60, premium: false,
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
    id: 'batterie', category: 'electricite', title: 'Remplacer la batterie', level: 1, minutes: 30, premium: false,
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
    id: 'filtre-air', category: 'entretien', title: 'Changer le filtre à air', level: 1, minutes: 15, premium: false,
    tools: ['Tournevis ou douille selon boîtier'], parts: ['Filtre à air'],
    steps: [
      { title: 'Ouvrir le boîtier de filtre', detail: 'Clips ou vis, sur le dessus du moteur ou sur le côté.' },
      { title: "Retirer l'ancien filtre", detail: 'Notez son sens de montage.' },
      { title: 'Nettoyer le boîtier', detail: "Un chiffon sec, sans laisser tomber de débris dans l'admission." },
      { title: 'Poser le filtre neuf et refermer', detail: 'Vérifiez que le couvercle est bien étanche partout.' },
    ],
  },
  {
    id: 'refroidissement', category: 'refroidissement', title: 'Contrôler et compléter le liquide de refroidissement', level: 1, minutes: 15, premium: false,
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
    id: 'bougies', category: 'allumage-injection', title: "Remplacer les bougies d'allumage", level: 2, minutes: 45, premium: true,
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
    id: 'bobine', category: 'allumage-injection', title: "Remplacer une bobine d'allumage crayon", level: 2, minutes: 30, premium: true,
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

  // ——— Entretien courant ———
  {
    id: 'niveaux', category: 'entretien', title: 'Contrôler les niveaux sous le capot', level: 1, minutes: 15, premium: false,
    tools: ['Chiffon propre', 'Lampe', 'Gants'], parts: ['Lave-glace', 'Appoints au besoin (huile, liquide de refroidissement, liquide de frein) aux normes du carnet'],
    steps: [
      { title: 'Garer à plat, moteur arrêté', detail: 'Attendez 5 à 10 minutes que l’huile redescende dans le carter. Pour le liquide de refroidissement, le moteur doit être froid.' },
      { title: 'Lire la jauge d’huile', detail: 'Tirez la jauge, essuyez-la, replongez-la à fond, relisez : le niveau doit être entre MIN et MAX. Certains moteurs n’ont plus de jauge : le niveau se lit dans le menu du tableau de bord.' },
      { title: 'Contrôler le liquide de refroidissement', detail: 'Niveau entre MIN et MAX sur le vase d’expansion. Ne l’ouvrez jamais moteur chaud : le liquide sous pression peut brûler gravement.', danger: true },
      { title: 'Contrôler le liquide de frein', detail: 'Le niveau baisse lentement avec l’usure des plaquettes. Une baisse rapide signale une fuite : ne roulez pas avant contrôle. Le liquide de frein attaque la peinture : essuyez toute goutte aussitôt.', danger: true },
      { title: 'Compléter le lave-glace', detail: 'Produit hiver en saison froide : l’eau seule gèle et peut fendre le bocal ou la pompe.' },
      { title: 'Noter ce que vous ajoutez', detail: 'Plus d’un litre d’huile entre deux vidanges, ou un appoint de liquide de refroidissement à chaque contrôle, mérite un diagnostic.' },
    ],
  },
  {
    id: 'filtre-gazole', category: 'entretien', title: 'Remplacer le filtre à gazole', level: 2, minutes: 45, premium: true,
    tools: ['Douilles et clés selon support', 'Bac et chiffons absorbants', 'Gants nitrile et lunettes', 'Lampe'],
    parts: ['Filtre à gazole (référence constructeur)', 'Joints fournis avec le filtre'],
    steps: [
      { title: 'Travailler moteur froid et propre', detail: 'Nettoyez le support du filtre avant d’ouvrir : une poussière dans le circuit peut abîmer la pompe haute pression et les injecteurs.' },
      { title: 'Protéger les pièces en dessous', detail: 'Le gazole ronge les durites et les courroies : couvrez l’alternateur et la courroie d’accessoires avec des chiffons.' },
      { title: 'Repérer le montage', detail: 'Photographiez les raccords, l’éventuel capteur de présence d’eau et le réchauffeur avant de démonter.' },
      { title: 'Vidanger et déposer l’ancien filtre', detail: 'Ouvrez la purge d’eau si le support en a une, puis déposez la cartouche ou le filtre complet.' },
      { title: 'Poser le filtre neuf', detail: 'Joints neufs légèrement huilés au gazole. Remontez le capteur d’eau sur le filtre neuf si besoin.' },
      { title: 'Réamorcer le circuit', detail: 'Selon le moteur : pompez la poire d’amorçage jusqu’à ce qu’elle durcisse, ou mettez le contact plusieurs fois sans démarrer pour laisser la pompe électrique remplir le filtre.' },
      { title: 'Démarrer par courtes séquences', detail: 'Démarreur 10 secondes au plus, pause de 30 secondes. Vérifiez l’absence de fuite moteur tournant.' },
      { title: 'Ne jamais ouvrir le circuit haute pression', detail: 'Rampe commune et tuyaux d’injecteurs travaillent à plus de 1 000 bar : un jet de gazole peut pénétrer la peau. Ce guide ne touche qu’au circuit basse pression.', danger: true },
    ],
  },

  // ——— Freinage ———
  {
    id: 'disques-avant', category: 'freinage', title: 'Remplacer les disques et plaquettes avant', level: 3, minutes: 120, premium: true,
    tools: ['Cric et 2 chandelles', 'Clé dynamométrique', 'Douilles 13 à 21 mm ou Torx selon modèle', 'Repousse-piston', 'Maillet', 'Brosse métallique, nettoyant frein', 'Frein-filet moyen si prescrit'],
    parts: ['Paire de disques avant', 'Jeu de plaquettes avant', 'Vis de chape neuves si le constructeur l’exige'],
    steps: [
      LOOSEN_NUTS,
      ON_STANDS,
      { title: 'Déposer l’étrier sans le débrancher', detail: 'Retirez les vis de guide, suspendez l’étrier avec un fil : il ne doit jamais pendre par son flexible.' },
      { title: 'Déposer la chape d’étrier', detail: 'Les vis de chape sont très serrées et souvent freinées. Notez si elles portent du frein-filet.' },
      { title: 'Déposer le disque', detail: 'Retirez la vis de maintien si présente. Un disque grippé se décolle au maillet, en frappant entre les goujons.' },
      { title: 'Nettoyer le moyeu', detail: 'Brossez la rouille de la face d’appui : un dépôt sous le disque crée un voile et des vibrations au freinage.' },
      { title: 'Dégraisser et poser le disque neuf', detail: 'Les disques neufs sont protégés par un film gras : nettoyant frein des deux côtés.' },
      { title: 'Remonter la chape au couple', detail: 'Valeurs très variables selon le véhicule, parfois avec serrage angulaire : vérifiez la valeur de votre modèle.', torques: ['Vis de chape d’étrier : 80 à 120 N·m (valeur type, très variable)'], danger: true },
      { title: 'Poser les plaquettes et l’étrier', detail: 'Repoussez le piston, graisse fine au dos des plaquettes seulement.', torques: ['Vis de guide d’étrier : 25 à 35 N·m'], danger: true },
      { title: 'Faire l’autre côté', detail: 'Disques et plaquettes se changent toujours par essieu complet, jamais d’un seul côté.' },
      REFIT_WHEEL,
      { title: 'Pomper la pédale et roder', detail: 'Pédale ferme avant de bouger la voiture. Ensuite, 200 à 300 km de freinages progressifs, sans freinage d’urgence volontaire.', danger: true },
    ],
  },
  {
    id: 'disques-arriere', category: 'freinage', title: 'Remplacer les disques et plaquettes arrière', level: 3, minutes: 150, premium: true,
    tools: ['Cric et 2 chandelles', 'Clé dynamométrique', 'Repousse-piston à visser (étriers à frein à main intégré)', 'Outil de diagnostic pour frein de stationnement électrique', 'Brosse métallique, nettoyant frein'],
    parts: ['Paire de disques arrière', 'Jeu de plaquettes arrière', 'Écrou de moyeu neuf si le roulement est intégré au disque'],
    steps: [
      { title: 'Identifier le type de frein à main', detail: 'Levier à câble : le piston arrière se revisse, il ne se repousse pas. Frein de stationnement électrique : il faut d’abord passer en mode maintenance avec un outil de diagnostic ou le menu du véhicule.' },
      { title: 'Passer en mode maintenance si électrique', detail: 'Ne forcez jamais un piston de frein électrique : vous casseriez le moteur d’étrier.', danger: true },
      LOOSEN_NUTS,
      { title: 'Caler l’avant et lever l’arrière', detail: 'Frein à main desserré pour libérer le disque : les roues avant doivent donc être solidement calées. Chandelles sous la caisse.', danger: true },
      { title: 'Déposer étrier et chape', detail: 'Suspendez l’étrier par un fil. Débranchez le câble de frein à main seulement si nécessaire.' },
      { title: 'Déposer le disque', detail: 'Sur certains véhicules, le roulement de roue est intégré au disque : l’écrou de moyeu est très serré, souvent à usage unique, et la cible ABS fait partie du roulement. Manipulez-la avec soin.' },
      { title: 'Rentrer le piston', detail: 'Étrier à câble : vissez le piston dans le sens indiqué avec l’outil adapté, en alignant ses encoches sur l’ergot de la plaquette.' },
      { title: 'Monter disque, chape et plaquettes', detail: 'Moyeu nettoyé, disque dégraissé.', torques: ['Vis de chape arrière : 50 à 90 N·m (valeur type, très variable)', 'Vis de guide d’étrier : 25 à 35 N·m'], danger: true },
      { title: 'Faire l’autre côté', detail: 'Toujours par essieu complet.' },
      REFIT_WHEEL,
      { title: 'Ressortir le mode maintenance et régler', detail: 'Frein électrique : quittez le mode maintenance, serrez et desserrez plusieurs fois. Frein à câble : pompez la pédale, puis vérifiez la course du levier.', danger: true },
    ],
  },
  {
    id: 'tambours', category: 'freinage', title: 'Remplacer les tambours et mâchoires arrière', level: 3, minutes: 150, premium: true,
    tools: ['Cric et 2 chandelles', 'Clé dynamométrique', 'Pince à ressorts de frein', 'Tournevis', 'Nettoyant frein', 'Masque anti-poussière'],
    parts: ['Paire de tambours (ou contrôle de la cote maxi)', 'Jeu de mâchoires', 'Kit de ressorts', 'Cylindre de roue si suintant', 'Écrou de moyeu neuf si prévu'],
    steps: [
      { title: 'Caler l’avant, frein à main desserré', detail: 'Le tambour ne sort pas frein à main serré.', danger: true },
      LOOSEN_NUTS,
      ON_STANDS,
      { title: 'Déposer le tambour', detail: 'S’il accroche sur la lèvre d’usure, détendez le rattrapage automatique par le trou prévu. Si le roulement est intégré, l’écrou de moyeu est très serré et souvent à usage unique.' },
      { title: 'Ne pas souffler la poussière', detail: 'La poussière de frein est nocive : nettoyant frein et chiffon, jamais de soufflette.' },
      { title: 'Photographier l’ensemble', detail: 'Ressorts, biellette de rattrapage et levier de frein à main : la photo vous évitera d’inverser une pièce.' },
      { title: 'Contrôler le cylindre de roue', detail: 'Soulevez ses capuchons : du liquide derrière signifie qu’il faut le remplacer, puis purger le circuit.' },
      { title: 'Monter les mâchoires neuves', detail: 'Transférez le levier de frein à main, remontez ressorts et rattrapage comme sur la photo. Aucune graisse sur les garnitures.' },
      { title: 'Remonter le tambour', detail: 'Si le moyeu a été déposé, écrou neuf au couple constructeur.', torques: ['Écrou de moyeu (roulement intégré) : très variable, souvent 175 à 280 N·m — valeur constructeur obligatoire'], danger: true },
      { title: 'Faire l’autre côté', detail: 'Toujours par essieu complet.' },
      REFIT_WHEEL,
      { title: 'Régler et essayer', detail: 'Pompez la pédale, actionnez plusieurs fois le frein à main, vérifiez qu’il serre en quelques crans. Essai à basse vitesse avant de reprendre la route.', danger: true },
    ],
  },
  {
    id: 'purge-frein', category: 'freinage', title: 'Remplacer le liquide de frein (purge)', level: 3, minutes: 90, premium: true,
    tools: ['Clé à œil pour vis de purge (souvent 7 à 11 mm)', 'Tuyau transparent et flacon', 'Seringue', 'Cric et chandelles', 'Un aide pour la pédale, ou un purgeur sous pression'],
    parts: ['Liquide de frein neuf à la norme du bocal (DOT 4 le plus souvent), flacon scellé', 'Chiffons'],
    steps: [
      { title: 'Vérifier la norme', detail: 'Elle est inscrite sur le bouchon du bocal. Les liquides DOT 3, 4 et 5.1 sont à base de glycol ; le DOT 5 au silicone ne se mélange jamais avec eux.' },
      { title: 'Protéger la peinture', detail: 'Le liquide de frein attaque la peinture : chiffons autour du bocal, rinçage à l’eau immédiat en cas de coulure.', danger: true },
      ON_STANDS,
      { title: 'Vider en partie le bocal et le remplir de neuf', detail: 'Retirez le vieux liquide à la seringue, complétez avec du neuf.' },
      { title: 'Purger roue par roue', detail: 'En général de la roue la plus éloignée du maître-cylindre à la plus proche, sauf ordre constructeur différent. Tuyau sur la vis, pédale enfoncée, ouvrir, fermer, relâcher, recommencer jusqu’à un liquide clair sans bulles.' },
      { title: 'Ne jamais laisser le bocal se vider', detail: 'De l’air dans le bloc ABS se purge ensuite avec un outil de diagnostic. Surveillez le niveau après chaque roue.', danger: true },
      { title: 'Serrer les vis de purge sans forcer', detail: 'Elles cassent facilement.', torques: ['Vis de purge : 5 à 10 N·m (valeur type)'] },
      { title: 'Ajuster le niveau au MAX', detail: 'Ne réutilisez jamais le liquide purgé : il a absorbé de l’humidité. Rapportez-le en déchetterie.' },
      { title: 'Vérifier la pédale avant de rouler', detail: 'Pédale ferme et haute, moteur tournant. Pédale molle ou qui s’enfonce : ne roulez pas.', danger: true },
    ],
  },

  // ——— Moteur et distribution ———
  {
    id: 'courroie-accessoires', category: 'moteur', title: 'Remplacer la courroie d’accessoires', level: 3, minutes: 60, premium: true,
    tools: ['Clé ou outil de détente de galet (carré 1/2 po ou clé plate selon tendeur)', 'Douilles', 'Lampe', 'Smartphone pour photo'],
    parts: ['Courroie d’accessoires (nombre de stries et longueur exacts)', 'Galet tendeur et galet enrouleur si bruyants ou usés'],
    steps: [
      { title: 'Moteur froid, clé retirée', detail: 'Le motoventilateur peut démarrer seul moteur arrêté sur certains véhicules : débranchez la batterie avant de passer les mains près des poulies.', danger: true },
      { title: 'Photographier le cheminement', detail: 'Souvent un schéma est collé sous le capot. Sinon, la photo est indispensable.' },
      { title: 'Détendre le galet tendeur', detail: 'Faites pivoter le tendeur automatique dans le sens qui relâche la courroie, bloquez-le avec une pige si prévu, retirez la courroie.' },
      { title: 'Contrôler les galets et poulies', detail: 'Tournez-les à la main : jeu, point dur ou bruit de roulement, changez-les. Une poulie de vilebrequin dont le caoutchouc se fendille doit être remplacée.' },
      { title: 'Poser la courroie neuve', detail: 'Stries bien engagées dans chaque gorge, en suivant la photo. Relâchez doucement le tendeur.' },
      { title: 'Vérifier et démarrer', detail: 'Faites faire deux tours au moteur à la main si possible, contrôlez l’alignement, puis démarrez. Un sifflement signale une courroie mal posée ou un tendeur fatigué.', torques: ['Vis de galet (si déposé) : 20 à 50 N·m selon diamètre (valeur type)'] },
    ],
  },
  {
    id: 'kit-distribution', category: 'moteur', title: 'Kit de distribution : comprendre et préparer le remplacement', level: 5, minutes: 300, premium: true, garage: true,
    tools: ['Outils de calage spécifiques au moteur (piges, blocage d’arbres à cames)', 'Clé dynamométrique et rapporteur d’angle', 'Pont ou chandelles et support moteur'],
    parts: ['Kit de distribution complet (courroie, galets)', 'Pompe à eau si entraînée par la courroie', 'Liquide de refroidissement', 'Vis de poulie de vilebrequin neuve si prescrite'],
    steps: [
      { title: 'Pourquoi le garage est conseillé', detail: 'La plupart des moteurs actuels sont « à interférence » : une dent sautée ou un calage décalé fait toucher pistons et soupapes, et le moteur est souvent détruit. Le calage exige des outils propres à chaque moteur, et la vis de poulie de vilebrequin se serre souvent au couple plus un angle, avec une vis neuve.', danger: true },
      { title: 'Vérifier l’échéance', detail: 'Elle varie énormément selon le moteur : de 60 000 km sur certains moteurs anciens à 240 000 km sur d’autres, avec un âge limite (souvent 5 à 10 ans) même à faible kilométrage. Seul votre carnet fait foi. L’onglet Garage vous rappelle l’échéance.' },
      { title: 'Courroie ou chaîne ?', detail: 'Une chaîne n’a pas de remplacement périodique mais se contrôle si elle est bruyante au démarrage à froid. Certains moteurs ont une courroie qui baigne dans l’huile, avec des contrôles spécifiques : renseignez-vous pour le vôtre.' },
      { title: 'Comparer des devis complets', detail: 'Un devis sérieux comprend la courroie, tous les galets, la pompe à eau si elle est entraînée par la courroie, le liquide de refroidissement et souvent la courroie d’accessoires.' },
      { title: 'Exiger les pièces et la facture', detail: 'Demandez à récupérer les anciennes pièces et gardez la facture : elle prouve l’entretien à la revente.' },
      { title: 'Si vous le faites vous-même', detail: 'Uniquement avec la procédure constructeur de votre moteur exact et ses outils de calage. Après le remontage, tournez le moteur à la main sur deux tours complets et revérifiez le calage avant tout démarrage.', danger: true },
    ],
  },
  {
    id: 'joint-cache-culbuteurs', category: 'moteur', title: 'Remplacer le joint de cache-culbuteurs', level: 3, minutes: 90, premium: true,
    tools: ['Douilles 8 à 10 mm ou Torx', 'Clé dynamométrique (petite plage)', 'Grattoir plastique', 'Nettoyant dégraissant'],
    parts: ['Joint de cache-culbuteurs', 'Joints de puits de bougie si séparés', 'Pâte d’étanchéité seulement si le constructeur la prévoit'],
    steps: [
      { title: 'Confirmer la fuite', detail: 'Huile autour du couvercle, odeur de brûlé, huile dans les puits de bougie. Nettoyez puis observez après quelques jours pour être sûr de l’origine.' },
      { title: 'Moteur froid, déposer les accessoires', detail: 'Cache moteur, bobines, durites de reniflard, faisceaux : étiquetez chaque connecteur.' },
      { title: 'Desserrer le couvercle', detail: 'Desserrez les vis de l’extérieur vers le centre, progressivement. Un couvercle plastique se voile s’il est forcé.' },
      { title: 'Nettoyer les plans de joint', detail: 'Grattoir plastique uniquement, sans laisser tomber de débris dans le moteur.' },
      { title: 'Poser le joint neuf', detail: 'À sec, sauf points de pâte aux jonctions prévues par le constructeur (demi-lunes, chapeaux d’arbre à cames).' },
      { title: 'Serrer en spirale', detail: 'Du centre vers l’extérieur, en deux passes. Trop serré, le joint fuit de nouveau.', torques: ['Vis de cache-culbuteurs : 8 à 12 N·m (valeur type, plastique : bas de la fourchette)'] },
      { title: 'Remonter et contrôler', detail: 'Démarrez, laissez chauffer, cherchez la moindre trace d’huile.' },
    ],
  },

  // ——— Allumage et injection ———
  {
    id: 'injecteur-diesel', category: 'allumage-injection', title: 'Injecteur diesel : diagnostiquer avant de remplacer', level: 4, minutes: 180, premium: true, garage: true,
    tools: ['Dongle OBD2 et outil de diagnostic capable de coder les injecteurs', 'Kit de test de retour d’injecteurs', 'Bouchons de protection', 'Extracteur d’injecteur (garage)'],
    parts: ['Injecteur neuf ou reconditionné (référence exacte)', 'Rondelle cuivre et vis de bride neuves', 'Tuyau haute pression neuf si prescrit'],
    steps: [
      { title: 'Pourquoi le garage est conseillé', detail: 'Le circuit fonctionne à 1 500 à plus de 2 000 bar ; une poussière suffit à détruire un injecteur neuf ; l’injecteur doit être codé dans le calculateur ; un injecteur grippé dans la culasse peut casser à l’extraction.', danger: true },
      { title: 'Lire les codes et les corrections', detail: 'Les corrections de débit par cylindre (valeurs d’équilibrage) montrent souvent l’injecteur en cause. Un code seul ne suffit pas.' },
      { title: 'Faire le test de retour', detail: 'Un injecteur qui renvoie beaucoup plus de gazole que les autres au ralenti est suspect. Procédure et limites dépendent du système.' },
      { title: 'Écarter les autres causes', detail: 'Filtre à gazole, prise d’air côté basse pression, capteur de pression de rampe, compression : un garage les vérifie avant de changer un injecteur cher.' },
      { title: 'Repérer une fuite de compression', detail: 'Bulles ou claquement au pied d’un injecteur, odeur de gaz dans l’habitacle : la rondelle cuivre fuit. À réparer vite, la calamine soude l’injecteur à la culasse.' },
      { title: 'Ne jamais desserrer un raccord moteur tournant', detail: 'Un jet haute pression peut pénétrer la peau et provoquer une blessure grave. Même moteur arrêté, attendez la chute de pression prévue par le constructeur.', danger: true },
      { title: 'Faire coder l’injecteur neuf', detail: 'Le code imprimé sur l’injecteur (correction de débit) doit être saisi dans le calculateur avec un outil de diagnostic, sinon ralenti instable et fumée.' },
    ],
  },
  {
    id: 'sonde-lambda', category: 'allumage-injection', title: 'Remplacer une sonde lambda', level: 2, minutes: 45, premium: true,
    tools: ['Douille fendue pour sonde lambda (22 mm)', 'Dégrippant', 'Clé dynamométrique', 'Dongle OBD2', 'Cric et chandelles si la sonde est dessous'],
    parts: ['Sonde lambda (position amont ou aval, référence exacte)', 'Graisse anti-grippage haute température si le filetage n’en porte pas'],
    steps: [
      { title: 'Identifier la sonde en cause', detail: 'Les codes P0130 à P0161 indiquent le banc et la position : sonde 1 avant le catalyseur (amont), sonde 2 après (aval). Une sonde amont et une aval ne sont pas interchangeables.' },
      { title: 'Vérifier le reste d’abord', detail: 'Une fuite à l’échappement avant la sonde, une prise d’air ou un raté d’allumage faussent sa mesure.' },
      { title: 'Échappement tiède, pas chaud', detail: 'Une sonde se dévisse mieux échappement tiède, mais un collecteur chaud brûle en une seconde. Gants obligatoires.', danger: true },
      { title: 'Débrancher le connecteur', detail: 'Repérez le cheminement du fil et ses attaches, loin de l’échappement.' },
      { title: 'Dévisser la sonde', detail: 'Dégrippant la veille si elle est rouillée. Douille fendue pour laisser passer le fil.' },
      { title: 'Monter la sonde neuve', detail: 'Graisse anti-grippage sur le filetage uniquement, jamais sur l’embout (les sondes neuves en sont souvent déjà enduites).', torques: ['Sonde lambda M18 : 40 à 50 N·m (valeur type)'] },
      { title: 'Rebrancher, effacer et rouler', detail: 'Fil attaché comme d’origine. Effacez le code et roulez 20 km pour que le calculateur réapprenne.' },
    ],
  },
  {
    id: 'capteur-pmh', category: 'allumage-injection', title: 'Remplacer le capteur PMH (vilebrequin)', level: 2, minutes: 60, premium: true,
    tools: ['Douilles 8 à 10 mm ou Torx', 'Multimètre', 'Dongle OBD2', 'Cric et chandelles selon emplacement'],
    parts: ['Capteur de position vilebrequin (référence exacte)', 'Joint torique si fourni'],
    steps: [
      { title: 'Reconnaître la panne', detail: 'Le moteur tourne au démarreur mais ne démarre pas, ou cale à chaud puis repart froid. Code fréquent : P0335 à P0339.' },
      { title: 'Contrôler le connecteur et le faisceau', detail: 'Le capteur est près du volant moteur ou de la poulie de vilebrequin. Huile, oxydation ou fil frotté sont des causes fréquentes, gratuites à corriger.' },
      { title: 'Mesurer si c’est possible', detail: 'Capteur inductif à 2 fils : une résistance de quelques centaines à environ 1 000 ohms est courante, la valeur exacte dépend du modèle. Un capteur à effet Hall (3 fils) ne se teste pas à l’ohmmètre.' },
      ON_STANDS,
      { title: 'Déposer l’ancien capteur', detail: 'Notez l’orientation. Retirez la limaille aimantée éventuelle sur son extrémité, elle révèle parfois un problème de volant moteur.' },
      { title: 'Monter le capteur neuf', detail: 'Joint huilé, sans forcer : l’entrefer n’est généralement pas réglable.', torques: ['Vis de capteur : 8 à 10 N·m (valeur type)'] },
      { title: 'Effacer les codes et essayer', detail: 'Plusieurs démarrages à froid et à chaud pour confirmer.' },
    ],
  },
  {
    id: 'debitmetre', category: 'allumage-injection', title: 'Nettoyer ou remplacer le débitmètre d’air', level: 2, minutes: 30, premium: true,
    tools: ['Tournevis Torx (souvent T20) ou douilles', 'Nettoyant spécial débitmètre (MAF)', 'Dongle OBD2'],
    parts: ['Débitmètre ou sonde seule (référence exacte) si le nettoyage ne suffit pas', 'Filtre à air si encrassé'],
    steps: [
      { title: 'Confirmer la piste', detail: 'Codes P0100 à P0104 ou P0171 (mélange pauvre), perte de puissance, fumée noire en diesel. Une prise d’air après le débitmètre donne les mêmes symptômes : vérifiez les durites.' },
      { title: 'Débrancher et déposer', detail: 'Contact coupé, connecteur retiré, colliers desserrés. Certains débitmètres sont une sonde seule fixée par deux vis.' },
      { title: 'Nettoyer sans toucher', detail: 'Uniquement un nettoyant spécial débitmètre, en pulvérisation. Ne touchez jamais le fil ou la plaquette sensible, ni avec un doigt ni avec un coton-tige. Le nettoyant pour carburateur l’abîme.' },
      { title: 'Laisser sécher complètement', detail: 'Au moins 15 minutes à l’air libre.' },
      { title: 'Remonter et essayer', detail: 'Effacez les codes et roulez. Si le défaut revient, le débitmètre est à remplacer : le nettoyage ne répare pas une sonde usée.' },
    ],
  },

  // ——— Refroidissement ———
  {
    id: 'thermostat', category: 'refroidissement', title: 'Remplacer le thermostat', level: 3, minutes: 90, premium: true,
    tools: ['Douilles 8 à 13 mm', 'Pince à colliers', 'Bac de récupération', 'Grattoir plastique', 'Clé dynamométrique'],
    parts: ['Thermostat ou boîtier complet (température d’ouverture d’origine)', 'Joint neuf', 'Liquide de refroidissement compatible'],
    steps: [
      { title: 'Reconnaître la panne', detail: 'Bloqué ouvert : le moteur chauffe lentement, chauffage tiède, code P0128. Bloqué fermé : surchauffe rapide. Dans ce cas, arrêtez-vous.' },
      { title: 'Attendre le moteur froid', detail: 'Liquide chaud sous pression : risque de brûlure grave.', danger: true },
      { title: 'Vidanger en partie', detail: 'Récupérez le liquide dans un bac. Il est toxique et son goût sucré attire les animaux : ne le laissez jamais traîner.', danger: true },
      { title: 'Déposer le boîtier', detail: 'Notez le sens de montage du thermostat : le petit trou de purge ou le clapet se place en haut.' },
      { title: 'Nettoyer le plan de joint', detail: 'Sans rayer l’aluminium.' },
      { title: 'Monter le thermostat neuf', detail: 'Joint neuf, vis serrées en croix.', torques: ['Vis de boîtier de thermostat : 8 à 12 N·m (valeur type)'] },
      { title: 'Remplir et purger', detail: 'Ouvrez les vis de purge, remplissez lentement, chauffage sur maximum. Laissez tourner jusqu’au déclenchement du ventilateur, puis complétez à froid.' },
    ],
  },
  {
    id: 'pompe-eau', category: 'refroidissement', title: 'Remplacer la pompe à eau', level: 4, minutes: 180, premium: true,
    tools: ['Douilles et clés', 'Bac de récupération', 'Grattoir plastique', 'Clé dynamométrique', 'Pince à colliers'],
    parts: ['Pompe à eau et joint', 'Liquide de refroidissement compatible', 'Courroie si elle doit être déposée'],
    steps: [
      { title: 'Savoir ce qui entraîne la pompe', detail: 'Entraînée par la courroie de distribution : elle se change avec le kit de distribution, voyez ce guide (garage conseillé). Entraînée par la courroie d’accessoires ou électrique : ce guide s’applique.' },
      { title: 'Confirmer la panne', detail: 'Traces de liquide séché sous la pompe, jeu dans la poulie, bruit de roulement, surchauffe.' },
      { title: 'Moteur froid, batterie débranchée', detail: 'Liquide brûlant sous pression moteur chaud ; le ventilateur peut démarrer seul.', danger: true },
      { title: 'Vidanger le circuit', detail: 'Liquide toxique : récupérez-le entièrement et rapportez-le en déchetterie.' },
      { title: 'Déposer la courroie et la pompe', detail: 'Photographiez le cheminement de la courroie. Desserrez les vis de la pompe en croix.' },
      { title: 'Nettoyer et monter la pompe neuve', detail: 'Plan de joint propre, joint neuf, serrage en croix.', torques: ['Vis de pompe à eau : 8 à 25 N·m selon diamètre (valeur type)'] },
      { title: 'Remplir et purger soigneusement', detail: 'Une bulle d’air peut faire surchauffer le moteur. Surveillez la température pendant les premiers trajets.' },
    ],
  },
  {
    id: 'radiateur', category: 'refroidissement', title: 'Remplacer le radiateur de refroidissement', level: 3, minutes: 150, premium: true,
    tools: ['Douilles et tournevis', 'Pince à colliers', 'Bac de récupération', 'Gants'],
    parts: ['Radiateur (référence exacte, boîte manuelle ou automatique)', 'Colliers et durites si fatigués', 'Liquide de refroidissement compatible'],
    steps: [
      { title: 'Moteur froid', detail: 'Ne touchez à rien moteur chaud : liquide sous pression.', danger: true },
      { title: 'Vidanger', detail: 'Par le bouchon du radiateur ou la durite inférieure, dans un bac.' },
      { title: 'Ne pas ouvrir le circuit de climatisation', detail: 'Le condenseur de clim est souvent fixé devant le radiateur : désolidarisez-le sans débrancher ses tuyaux. Le fluide frigorigène ne se manipule pas sans habilitation.', danger: true },
      { title: 'Débrancher durites et ventilateur', detail: 'Connecteur du motoventilateur, durites haute et basse, éventuels tuyaux de refroidissement de boîte automatique.' },
      { title: 'Déposer le radiateur', detail: 'Il sort le plus souvent par le haut ou par le bas avec la face avant. Protégez les ailettes, très fragiles.' },
      { title: 'Monter le neuf', detail: 'Transférez les silentblocs, rebranchez tout dans l’ordre inverse.' },
      { title: 'Remplir et purger', detail: 'Chauffage au maximum, vis de purge ouvertes, jusqu’au déclenchement du ventilateur. Contrôlez le niveau à froid les jours suivants.' },
    ],
  },
  {
    id: 'vidange-refroidissement', category: 'refroidissement', title: 'Vidanger et remplacer le liquide de refroidissement', level: 2, minutes: 90, premium: true,
    tools: ['Bac de 10 L', 'Pince à colliers', 'Entonnoir à purge (conseillé)', 'Gants'],
    parts: ['Liquide de refroidissement à la norme constructeur (capacité du circuit, souvent 5 à 9 L)'],
    steps: [
      { title: 'Choisir le bon liquide', detail: 'Norme du carnet, pas seulement la couleur. Prêt à l’emploi ou concentré à diluer à l’eau déminéralisée selon la protection voulue.' },
      { title: 'Attendre le moteur froid', detail: 'N’ouvrez jamais le circuit moteur chaud.', danger: true },
      { title: 'Vidanger', detail: 'Bouchon de vidange du radiateur ou durite inférieure, vase d’expansion ouvert pour faire entrer l’air.' },
      { title: 'Rincer si le liquide est sale', detail: 'Eau claire, moteur tournant quelques minutes, puis nouvelle vidange. Un liquide huileux fait penser au joint de culasse : garage.' },
      { title: 'Remplir lentement', detail: 'Vis de purge ouvertes jusqu’à ce que le liquide en sorte sans bulles, puis refermées.' },
      { title: 'Chauffer et purger', detail: 'Chauffage au maximum, moteur au ralenti jusqu’au déclenchement du ventilateur. Le chauffage doit souffler chaud.' },
      { title: 'Compléter à froid et éliminer l’ancien liquide', detail: 'Niveau au MAX le lendemain. Liquide usagé en déchetterie : il est toxique.' },
    ],
  },

  // ——— Électricité et éclairage ———
  {
    id: 'alternateur', category: 'electricite', title: 'Remplacer l’alternateur', level: 3, minutes: 120, premium: true,
    tools: ['Multimètre', 'Douilles 10 à 16 mm', 'Outil de détente du galet tendeur', 'Clé dynamométrique'],
    parts: ['Alternateur (même intensité, même poulie, éventuellement poulie débrayable)', 'Courroie d’accessoires conseillée'],
    steps: [
      { title: 'Mesurer la tension de charge', detail: 'Batterie au repos : environ 12,6 V. Moteur tournant, phares allumés : souvent 13,8 à 14,7 V. Les alternateurs pilotés récents varient davantage (12,5 à 15 V) : en dessous de la batterie au repos de façon durable, la charge est en défaut.' },
      { title: 'Contrôler les pistes simples', detail: 'Courroie qui patine, cosse de batterie oxydée, fusible de forte intensité, masse moteur.' },
      { title: 'Débrancher le négatif de la batterie', detail: 'Le gros câble de l’alternateur (B+) est relié en permanence à la batterie : une clé qui touche la masse provoque un court-circuit violent.', danger: true },
      { title: 'Déposer la courroie', detail: 'Photo du cheminement, détente du tendeur.' },
      { title: 'Débrancher et déposer l’alternateur', detail: 'Écrou du câble B+, connecteur de pilotage, vis de fixation.' },
      { title: 'Monter le neuf', detail: 'Vis de fixation, puis câble B+ sans excès : le goujon est fragile.', torques: ['Vis de fixation : 20 à 50 N·m selon diamètre (valeur type)', 'Écrou de câble B+ : 8 à 15 N·m selon diamètre (valeur type)'] },
      { title: 'Reposer la courroie et rebrancher', detail: 'Rebranchez la batterie, démarrez, mesurez de nouveau la tension de charge.' },
    ],
  },
  {
    id: 'demarreur', category: 'electricite', title: 'Remplacer le démarreur', level: 3, minutes: 120, premium: true,
    tools: ['Multimètre', 'Douilles et rallonges', 'Cric et chandelles selon accès', 'Clé dynamométrique'],
    parts: ['Démarreur (référence exacte, attention aux versions Stop & Start)'],
    steps: [
      { title: 'Écarter la batterie', detail: 'Un clic sans rotation vient souvent d’une batterie faible ou d’une cosse oxydée. Mesurez 12,4 V au moins au repos et vérifiez les cosses.' },
      { title: 'Débrancher le négatif de la batterie', detail: 'Le gros câble du démarreur est relié en permanence au positif : risque de court-circuit et de brûlure.', danger: true },
      ON_STANDS,
      { title: 'Débrancher le démarreur', detail: 'Écrou du câble positif et fil de commande du solénoïde. Photographiez.' },
      { title: 'Déposer les vis de fixation', detail: 'Souvent deux ou trois longues vis côté boîte. Soutenez le démarreur, il est lourd.' },
      { title: 'Monter le démarreur neuf', torques: ['Vis de fixation : 25 à 50 N·m selon diamètre (valeur type)', 'Écrou de câble positif : 8 à 15 N·m (valeur type)'] },
      { title: 'Rebrancher et essayer', detail: 'Rebranchez la batterie en dernier. Plusieurs démarrages pour confirmer.' },
    ],
  },
  {
    id: 'ampoules-phare', category: 'electricite', title: 'Changer une ampoule de phare', level: 1, minutes: 20, premium: false,
    tools: ['Gants propres ou chiffon', 'Tournevis selon accès'],
    parts: ['Ampoule du bon type (H4, H7, H1… inscrit sur l’ancienne ou dans le manuel)'],
    steps: [
      { title: 'Identifier le type d’éclairage', detail: 'Halogène : ampoule remplaçable. Xénon : arc à très haute tension, à confier à un garage. LED d’origine : souvent un bloc non remplaçable seul.', danger: true },
      { title: 'Couper les feux et le contact', detail: 'Une ampoule halogène allumée dépasse plusieurs centaines de degrés : laissez refroidir.' },
      { title: 'Accéder à l’arrière du phare', detail: 'Par le capot, le passage de roue ou une trappe. Sur certains modèles il faut déposer le phare : voyez le manuel.' },
      { title: 'Retirer l’ampoule', detail: 'Connecteur, capuchon, puis ressort ou bague de maintien. Notez l’orientation des ergots.' },
      { title: 'Poser l’ampoule neuve sans toucher le verre', detail: 'Les traces de doigt font éclater ou noircir une ampoule halogène. Nettoyez à l’alcool si vous l’avez touchée.' },
      { title: 'Contrôler et changer par paire', detail: 'Testez feux de croisement et de route. L’autre ampoule a le même âge : changez-la aussi pour un éclairage égal.' },
      { title: 'Attention aux ampoules LED « retrofit »', detail: 'Dans un phare halogène, elles ne sont autorisées que si elles sont homologuées pour ce phare précis : vérifiez avant d’acheter.' },
    ],
  },
  {
    id: 'fusible', category: 'electricite', title: 'Trouver et remplacer un fusible', level: 1, minutes: 15, premium: false,
    tools: ['Pince à fusible (souvent dans la boîte)', 'Lampe', 'Testeur de fusible ou multimètre (facultatif)'],
    parts: ['Fusible de même calibre (ampères) et même format'],
    steps: [
      { title: 'Couper le contact et l’accessoire', detail: 'On ne remplace jamais un fusible sous tension.' },
      { title: 'Trouver la bonne boîte', detail: 'Souvent une boîte dans l’habitacle (bout de planche de bord, sous le volant) et une sous le capot. Le schéma est sur le couvercle ou dans le manuel.' },
      { title: 'Retirer et inspecter', detail: 'Un fusible grillé a son filament coupé. Couleurs courantes des fusibles à lame : 5 A beige, 7,5 A marron, 10 A rouge, 15 A bleu, 20 A jaune, 25 A transparent, 30 A vert.' },
      { title: 'Remplacer par le même calibre', detail: 'Jamais plus fort, jamais un fil ou du papier aluminium : c’est le fil du faisceau qui brûlerait, avec un risque d’incendie.', danger: true },
      { title: 'Si le fusible grille de nouveau', detail: 'Il y a un court-circuit : arrêtez les essais et faites contrôler.' },
    ],
  },
  {
    id: 'batterie-hybride-12v', category: 'electricite', title: 'Remplacer la batterie 12 V d’un véhicule hybride ou électrique', level: 2, minutes: 45, premium: true,
    tools: ['Clés 10 mm', 'Gants isolants et lunettes', 'Lampe', 'Outil de diagnostic si l’enregistrement de batterie est requis'],
    parts: ['Batterie 12 V de même technologie (AGM ou EFB), même format et même position des bornes', 'Tube d’évent si la batterie est dans l’habitacle ou le coffre'],
    steps: [
      { title: 'Ne jamais toucher les câbles orange', detail: 'Les câbles orange et les composants marqués haute tension travaillent à plusieurs centaines de volts : un contact peut être mortel. Ce guide ne concerne que la petite batterie 12 V, et rien d’autre.', danger: true },
      { title: 'Comprendre son rôle', detail: 'La batterie 12 V réveille les calculateurs et le système hybride. Faible, la voiture ne passe pas en mode prêt alors que la grande batterie est chargée.' },
      { title: 'Trouver la batterie', detail: 'Selon le modèle : sous le capot, dans le coffre ou sous un siège. Le manuel indique aussi le point de démarrage de secours sous le capot.' },
      { title: 'Véhicule éteint, clé loin', detail: 'Système hybride arrêté (pas de mode prêt), clé mains libres hors de portée pour qu’elle ne réveille pas la voiture.', danger: true },
      { title: 'Débrancher le négatif (−) en premier', detail: 'Puis le positif (+), le tube d’évent et la bride.' },
      { title: 'Poser une batterie de même technologie', detail: 'Une batterie dans l’habitacle doit être étanche et ventilée vers l’extérieur : rebranchez le tube d’évent.', torques: ['Cosses de batterie : 5 à 8 N·m (valeur type)'] },
      { title: 'Rebrancher (+) puis (−) et réinitialiser', detail: 'Lève-vitres, hayon électrique : réinitialisez selon le manuel. Certains véhicules demandent d’enregistrer la batterie neuve avec un outil de diagnostic.' },
    ],
  },

  // ——— Suspension et direction ———
  {
    id: 'biellette-stabilisatrice', category: 'suspension-direction', title: 'Remplacer une biellette de barre stabilisatrice', level: 2, minutes: 45, premium: true,
    tools: ['Cric et chandelles', 'Clé à pipe ou plate 13 à 17 mm', 'Embout Torx ou six pans pour tenir la rotule', 'Dégrippant', 'Clé dynamométrique'],
    parts: ['Biellette de barre stabilisatrice (côté et référence exacts)', 'Écrous autofreinés neufs (souvent fournis)'],
    steps: [
      { title: 'Reconnaître le bruit', detail: 'Claquement sourd sur petites bosses et ralentisseurs, surtout à basse vitesse. Secouez la biellette roue levée : un jeu dans la rotule la condamne.' },
      LOOSEN_NUTS,
      ON_STANDS,
      { title: 'Dégripper les écrous', detail: 'Dégrippant sur les filetages, quelques minutes d’attente.' },
      { title: 'Desserrer en tenant la rotule', detail: 'Tenez l’axe avec l’embout Torx ou six pans pendant que vous dévissez, sinon la rotule tourne dans le vide.' },
      { title: 'Libérer la tension de la barre', detail: 'Si les trous ne s’alignent pas, levez ou baissez légèrement l’autre côté, ou soulevez le bras avec le cric.' },
      { title: 'Monter la biellette neuve', detail: 'Écrous neufs, rotule tenue pendant le serrage.', torques: ['Écrous de biellette : 40 à 60 N·m (valeur type)'] },
      REFIT_WHEEL,
    ],
  },
  {
    id: 'rotule-direction', category: 'suspension-direction', title: 'Remplacer une rotule de direction', level: 3, minutes: 75, premium: true,
    tools: ['Cric et chandelles', 'Arrache-rotule', 'Clés plates 17 à 22 mm', 'Clé dynamométrique', 'Mètre ou pied à coulisse', 'Marqueur'],
    parts: ['Rotule de direction (côté exact)', 'Écrou autofreiné neuf'],
    steps: [
      { title: 'Savoir que la direction touche la sécurité', detail: 'Une rotule mal serrée peut se désaccoupler : direction perdue. Au moindre doute, faites contrôler. Un parallélisme est obligatoire après l’intervention.', danger: true },
      LOOSEN_NUTS,
      ON_STANDS,
      { title: 'Repérer la position', detail: 'Desserrez le contre-écrou d’un quart de tour seulement, puis marquez sa position ou mesurez la longueur de la biellette pour retrouver le réglage approximatif.' },
      { title: 'Décoller la rotule du pivot', detail: 'Écrou dévissé de quelques tours (il protège le filetage), arrache-rotule, puis retirez l’écrou.' },
      { title: 'Dévisser la rotule en comptant les tours', detail: 'Visser la neuve du même nombre de tours garde un réglage proche.' },
      { title: 'Monter la rotule neuve', detail: 'Contre-écrou bloqué, écrou de rotule neuf au couple.', torques: ['Écrou de rotule : 35 à 60 N·m (valeur type)', 'Contre-écrou de biellette : 50 à 70 N·m (valeur type)'], danger: true },
      REFIT_WHEEL,
      { title: 'Faire faire le parallélisme', detail: 'Rapidement : un mauvais réglage use un pneu en quelques centaines de kilomètres et fait tirer la voiture.' },
    ],
  },
  {
    id: 'amortisseurs', category: 'suspension-direction', title: 'Remplacer les amortisseurs avant (jambes de force)', level: 4, minutes: 240, premium: true,
    tools: ['Cric et chandelles', 'Compresseur de ressorts de qualité, en bon état', 'Clés et douilles 15 à 21 mm', 'Clé à choc ou contre-clé six pans pour tige', 'Clé dynamométrique', 'Marqueur'],
    parts: ['Paire d’amortisseurs avant', 'Coupelles et roulements de coupelle', 'Butées et soufflets', 'Écrous neufs', 'Ou jambes de force complètes, ressort pré-monté'],
    steps: [
      { title: 'Envisager les jambes complètes', detail: 'Une jambe de force livrée avec ressort monté évite tout compresseur : c’est l’option la plus sûre pour un particulier.' },
      { title: 'Remplacer par paire', detail: 'Toujours les deux amortisseurs d’un même essieu.' },
      LOOSEN_NUTS,
      ON_STANDS,
      { title: 'Repérer et désolidariser la jambe', detail: 'Marquez la position des vis sur le pivot (certaines sont excentriques et règlent le carrossage), retirez biellette de barre stabilisatrice, flexibles et capteurs de leurs attaches.' },
      { title: 'Déposer la jambe', detail: 'Écrous de dôme en dernier, en soutenant le pivot : il ne doit pas tirer sur le flexible de frein ni sur le cardan.' },
      { title: 'Comprimer le ressort', detail: 'Un ressort de suspension stocke une énergie énorme : un crochet qui ripe peut tuer. Deux crochets opposés, serrés à tour de rôle, jamais de compresseur tordu ou bon marché, jamais le visage dans l’axe.', danger: true },
      { title: 'Démonter l’écrou de tige', detail: 'Uniquement quand le ressort ne porte plus sur la coupelle. Si la coupelle reste en tension, ne dévissez pas.', danger: true },
      { title: 'Remonter sur l’amortisseur neuf', detail: 'Ressort bien en place dans ses logements, butée et soufflet neufs, puis détendez progressivement.', torques: ['Écrou de tige : 40 à 70 N·m (valeur type)'], danger: true },
      { title: 'Reposer la jambe', detail: 'Position marquée retrouvée. Couple des vis pivot très variable, parfois avec angle : valeur constructeur obligatoire.', torques: ['Vis jambe/pivot : 80 à 130 N·m (valeur type, très variable)', 'Écrous de dôme : 20 à 40 N·m (valeur type)'], danger: true },
      REFIT_WHEEL,
      { title: 'Contrôler la géométrie', detail: 'Faites vérifier le parallélisme après remplacement de jambes avant.' },
    ],
  },
  {
    id: 'roulement-roue', category: 'suspension-direction', title: 'Remplacer un roulement de roue', level: 4, minutes: 180, premium: true,
    tools: ['Cric et chandelles', 'Clé dynamométrique forte (300 N·m et plus)', 'Douille d’écrou de moyeu (souvent 30 à 36 mm)', 'Presse et bagues si le roulement est emmanché', 'Arrache-moyeu'],
    parts: ['Roulement ou moyeu-roulement (côté et référence exacts)', 'Écrou de moyeu neuf', 'Circlips neuf si prévu'],
    steps: [
      { title: 'Identifier le roulement bruyant', detail: 'Ronronnement qui augmente avec la vitesse et change en virage : il vient en général du côté qui est déchargé dans le virage. Roue levée, un jeu ou un frottement en la tournant confirme.' },
      { title: 'Savoir quel montage vous avez', detail: 'Moyeu-roulement vissé : faisable à la maison. Roulement emmanché dans le pivot : il faut une presse, confiez le pivot à un atelier.' },
      { title: 'Débloquer l’écrou de moyeu au sol', detail: 'Il est très serré. Voiture sur ses roues, un aide appuie sur la pédale de frein. Débloquez aussi les écrous de roue d’un quart de tour.' },
      ON_STANDS,
      { title: 'Déposer frein et capteur ABS', detail: 'Étrier suspendu par un fil, disque déposé, capteur ABS retiré avec précaution.' },
      { title: 'Déposer le roulement', detail: 'Moyeu vissé : retirez ses vis et extrayez-le. Roulement emmanché : pivot à la presse.' },
      { title: 'Respecter le sens de la cible ABS', detail: 'Sur de nombreux roulements, la bague magnétique de l’ABS doit faire face au capteur : un montage inversé allume le voyant ABS.' },
      { title: 'Remonter au couple', detail: 'Écrou de moyeu neuf, souvent à usage unique et parfois serré au couple plus un angle.', torques: ['Écrou de moyeu : très variable, souvent 200 à 350 N·m — valeur constructeur obligatoire', 'Vis de moyeu-roulement : 50 à 100 N·m (valeur type)'], danger: true },
      REFIT_WHEEL,
      { title: 'Essayer', detail: 'Le bruit doit avoir disparu, sans voyant ABS. Pédale de frein ferme avant de rouler.', danger: true },
    ],
  },

  // ——— Transmission et embrayage ———
  {
    id: 'soufflet-cardan', category: 'transmission', title: 'Remplacer un soufflet de cardan', level: 3, minutes: 150, premium: true,
    tools: ['Cric et chandelles', 'Douille d’écrou de moyeu', 'Clé dynamométrique forte', 'Pince à colliers d’oreille', 'Pince à circlips', 'Chiffons et dégraissant'],
    parts: ['Kit soufflet (soufflet, graisse, colliers, circlips)', 'Écrou de moyeu neuf'],
    steps: [
      { title: 'Réagir vite', detail: 'Un soufflet fendu laisse sortir la graisse et entrer la poussière : le cardan se met à claquer en virage. C’est aussi un défaut relevé au contrôle technique.' },
      { title: 'Choisir entre soufflet d’origine et universel', detail: 'Le soufflet d’origine demande de déposer le cardan ou le joint. Le soufflet universel (fendu ou extensible) évite cette dépose, mais tient moins longtemps.' },
      { title: 'Débloquer l’écrou de moyeu au sol', detail: 'Voiture sur ses roues, un aide sur la pédale de frein. Débloquez aussi les écrous de roue d’un quart de tour.' },
      ON_STANDS,
      { title: 'Libérer le cardan', detail: 'Rotule de triangle ou de direction désaccouplée selon le modèle, cardan sorti du moyeu. Ne laissez pas le cardan pendre côté boîte.' },
      { title: 'Déposer le joint et nettoyer', detail: 'Joint de cardan sorti de l’arbre (circlips), ancienne graisse entièrement retirée. Si le joint a du jeu ou des billes marquées, changez le cardan.' },
      { title: 'Monter le soufflet neuf', detail: 'Toute la graisse fournie dans le joint, soufflet bien en place sur ses gorges, colliers serrés à la pince.' },
      { title: 'Remonter le cardan et le moyeu', torques: ['Écrou de moyeu : très variable, souvent 200 à 350 N·m — valeur constructeur obligatoire'], danger: true },
      REFIT_WHEEL,
    ],
  },
  {
    id: 'kit-embrayage', category: 'transmission', title: 'Kit d’embrayage : diagnostiquer et préparer le remplacement', level: 5, minutes: 360, premium: true, garage: true,
    tools: ['Pont élévateur', 'Support de boîte', 'Outil de centrage de disque', 'Outil de compression pour mécanisme à rattrapage', 'Clé dynamométrique'],
    parts: ['Kit d’embrayage (mécanisme, disque, butée)', 'Butée hydraulique si montée', 'Volant moteur si bimasse usé', 'Liquide pour la purge'],
    steps: [
      { title: 'Pourquoi le garage est conseillé', detail: 'Il faut déposer la boîte de vitesses (souvent plusieurs dizaines de kilos) et parfois un berceau, sur pont élévateur. Un disque mal centré ou un mécanisme à rattrapage mal comprimé détruit le kit neuf.', danger: true },
      { title: 'Confirmer que l’embrayage patine', detail: 'En 4e ou 5e à bas régime, accélérez franchement : si le régime monte sans que la voiture accélère, il patine. Une odeur de brûlé en côte va dans le même sens.' },
      { title: 'Distinguer les autres causes', detail: 'Pédale qui reste au plancher : souvent la commande hydraulique. Vibrations au démarrage ou claquements au ralenti : souvent le volant bimasse.' },
      { title: 'Demander le contrôle du volant moteur', detail: 'Un volant bimasse usé se change avec le kit : le remonter coûte une seconde main-d’œuvre complète plus tard.' },
      { title: 'Comparer des devis complets', detail: 'Kit complet avec butée, purge, et réponse écrite sur l’état du volant moteur et des joints spi de vilebrequin et de boîte.' },
      { title: 'Après l’intervention', detail: 'Évitez les démarrages en côte brutaux pendant les premiers 500 km : le disque neuf se rode.' },
    ],
  },
  {
    id: 'vidange-boite', category: 'transmission', title: 'Vidanger une boîte de vitesses manuelle', level: 3, minutes: 60, premium: true,
    tools: ['Cric et chandelles ou fosse', 'Clé adaptée aux bouchons (carré, six pans ou Torx selon la boîte)', 'Pompe de remplissage', 'Bac de récupération', 'Clé dynamométrique'],
    parts: ['Huile de boîte à la norme constructeur (viscosité et spécification exactes)', 'Joints de bouchon neufs'],
    steps: [
      { title: 'Vérifier la procédure de votre boîte', detail: 'Beaucoup de boîtes sont dites « lubrifiées à vie », mais un changement d’huile reste bénéfique. Boîte automatique ou robotisée : procédure spécifique, avec contrôle à température, à confier à un garage.' },
      { title: 'Mettre la voiture à plat', detail: 'Le niveau se fait voiture horizontale : les quatre roues sur chandelles ou au sol sur fosse.', danger: true },
      { title: 'Ouvrir d’abord le bouchon de remplissage', detail: 'Si vous videz la boîte et que le bouchon de remplissage est grippé, la voiture est immobilisée.' },
      { title: 'Vidanger', detail: 'Huile tiède après un petit trajet. Nettoyez l’aimant du bouchon : une fine pâte grise est normale, des éclats ne le sont pas.' },
      { title: 'Remonter le bouchon de vidange', detail: 'Joint neuf.', torques: ['Bouchons de boîte : souvent 25 à 50 N·m (valeur type, très variable)'] },
      { title: 'Remplir au bon niveau', detail: 'Sur la plupart des boîtes, jusqu’à ce que l’huile affleure au trou de remplissage. Certaines ont une procédure ou une quantité précise : suivez-la.' },
      { title: 'Rapporter l’huile usagée', detail: 'En déchetterie ou chez un vendeur de pièces.' },
    ],
  },

  // ——— Échappement et dépollution ———
  {
    id: 'silencieux', category: 'echappement', title: 'Remplacer le silencieux arrière', level: 2, minutes: 90, premium: true,
    tools: ['Cric et chandelles', 'Dégrippant', 'Scie à métaux ou disqueuse', 'Clés et douilles 13 à 15 mm', 'Gants et lunettes'],
    parts: ['Silencieux arrière (référence exacte)', 'Collier de raccordement', 'Silentblocs de suspension d’échappement', 'Pâte de montage d’échappement (facultatif)'],
    steps: [
      { title: 'Échappement froid', detail: 'Il reste brûlant longtemps après l’arrêt.', danger: true },
      ON_STANDS,
      { title: 'Dégripper', detail: 'Dégrippant sur les colliers et écrous, la veille si possible.' },
      { title: 'Repérer la coupe', detail: 'Sur une ligne d’origine monobloc, le silencieux de rechange se raccorde à un repère de coupe : présentez la pièce neuve et mesurez avant de couper.' },
      { title: 'Déposer l’ancien silencieux', detail: 'Coupez ou desserrez, décrochez-le de ses silentblocs. Soutenez-le : il tombe d’un coup.' },
      { title: 'Monter le neuf', detail: 'Emboîtement complet, alignement sous la caisse, silentblocs neufs.', torques: ['Collier d’échappement : 25 à 40 N·m (valeur type)'] },
      { title: 'Contrôler l’étanchéité', detail: 'Moteur tournant, cherchez un souffle au raccord. Aucune pièce de la ligne ne doit toucher la caisse.' },
    ],
  },
  {
    id: 'egr-nettoyage', category: 'echappement', title: 'Déposer et nettoyer la vanne EGR', level: 3, minutes: 120, premium: true,
    tools: ['Douilles et Torx', 'Grattoir plastique', 'Nettoyant spécial admission ou EGR', 'Dongle OBD2 et outil de diagnostic', 'Gants et lunettes'],
    parts: ['Joints de vanne EGR neufs (obligatoire)', 'Vanne EGR neuve si le moteur électrique ou le capteur est en défaut'],
    steps: [
      { title: 'Confirmer la piste EGR', detail: 'Codes P0400 à P0409, perte de puissance, fumée, mode dégradé. Une vanne encrassée est fréquente sur les diesels qui font peu de route.' },
      { title: 'Moteur froid, batterie débranchée', detail: 'La vanne est près de l’échappement et du collecteur : brûlures garanties à chaud.', danger: true },
      { title: 'Déposer la vanne', detail: 'Connecteur, tuyau de liaison, vis. Photographiez l’ensemble. L’accès est très variable selon le moteur.' },
      { title: 'Nettoyer le clapet et les conduits', detail: 'Ne plongez jamais la partie électrique dans le nettoyant. Grattez la calamine du clapet et du conduit sans abîmer les portées.' },
      { title: 'Contrôler la vanne', detail: 'Clapet qui bouge librement, sans jeu excessif. Un moteur ou un capteur de position en défaut impose une vanne neuve.' },
      { title: 'Remonter avec des joints neufs', detail: 'Un joint réutilisé fuit : gaz chauds et code défaut assurés.', torques: ['Vis de vanne EGR : 8 à 25 N·m selon diamètre (valeur type)'] },
      { title: 'Réinitialiser l’apprentissage', detail: 'Effacez les codes ; certains calculateurs demandent un apprentissage de la vanne avec un outil de diagnostic. La suppression de l’EGR est illégale et refusée au contrôle technique.' },
    ],
  },
  {
    id: 'fap-regeneration', category: 'echappement', title: 'Filtre à particules (FAP) : réussir une régénération', level: 2, minutes: 40, premium: true,
    tools: ['Dongle OBD2', 'Outil de diagnostic pour régénération forcée (selon véhicule)'],
    parts: ['Additif FAP si votre véhicule utilise un réservoir d’additif (complément en garage)'],
    steps: [
      { title: 'Comprendre le voyant', detail: 'Le FAP piège les suies et les brûle lors d’une régénération automatique, qui demande un trajet roulant. Les trajets courts répétés empêchent ces régénérations.' },
      { title: 'Écarter une panne', detail: 'Lisez les codes. Capteur de pression différentielle, vanne EGR ou injecteur défaillant encrassent le FAP : le régénérer sans corriger la cause ne sert à rien.' },
      { title: 'Rouler pour régénérer', detail: 'Sur voie rapide, une vingtaine de minutes à régime soutenu (souvent 2 500 à 3 000 tr/min, rapport inférieur si besoin), dans le respect des limitations. N’arrêtez pas le moteur pendant la régénération.' },
      { title: 'Vérifier l’additif', detail: 'Certains diesels utilisent un additif stocké dans un petit réservoir séparé : vide, il empêche les régénérations. Son remplissage se fait en garage.' },
      { title: 'Régénération forcée', detail: 'Lancée avec un outil de diagnostic, moteur au ralenti accéléré : l’échappement dépasse alors 600 °C. Dehors, loin de l’herbe sèche et de toute matière inflammable.', danger: true },
      { title: 'Si rien n’y fait', detail: 'Nettoyage ou remplacement du FAP en garage. Le supprimer est illégal, sanctionné et refusé au contrôle technique.' },
    ],
  },
  {
    id: 'adblue', category: 'echappement', title: 'Faire le plein d’AdBlue', level: 1, minutes: 10, premium: false,
    tools: ['Bidon à bec verseur ou pistolet AdBlue en station', 'Gants'],
    parts: ['AdBlue conforme à la norme ISO 22241'],
    steps: [
      { title: 'Trouver la goulotte bleue', detail: 'Près du bouchon de gazole sous la trappe, ou dans le coffre ou sous le capot selon le modèle. Bouchon bleu.' },
      { title: 'Ne jamais le verser dans le réservoir de gazole', detail: 'L’AdBlue dans le gazole endommage gravement le circuit d’injection. En cas d’erreur, ne démarrez pas et faites vidanger le réservoir.', danger: true },
      { title: 'Remplir sans déborder', detail: 'L’AdBlue cristallise en séchant et attaque certains métaux : essuyez et rincez toute coulure à l’eau.' },
      { title: 'Ne pas attendre la fin du compte à rebours', detail: 'Réservoir vide, le moteur ne redémarre plus. Certains véhicules exigent un ajout minimum avant d’autoriser le redémarrage : voyez le manuel.' },
      { title: 'Si le voyant reste allumé', detail: 'Un défaut du système (capteur, pompe, réchauffeur) demande un diagnostic : lisez les codes.' },
    ],
  },

  // ——— Climatisation et habitacle ———
  {
    id: 'filtre-habitacle', category: 'climatisation-habitacle', title: 'Changer le filtre d’habitacle', level: 1, minutes: 15, premium: false,
    tools: ['Tournevis ou Torx selon accès', 'Lampe'],
    parts: ['Filtre d’habitacle (à charbon actif conseillé)'],
    steps: [
      { title: 'Trouver le filtre', detail: 'Le plus souvent derrière la boîte à gants (qui se décroche ou se vide), sinon sous la grille d’auvent au pied du pare-brise.' },
      { title: 'Retirer l’ancien filtre', detail: 'Notez la flèche de sens d’air. Feuilles et poussière tombent : aspirez le logement.' },
      { title: 'Poser le filtre neuf', detail: 'Flèche dans le sens du flux d’air indiqué sur le boîtier, sans plier le filtre.' },
      { title: 'Remonter et essayer', detail: 'Ventilation à fond : le débit doit être meilleur. Un filtre bouché fait aussi embuer les vitres.' },
    ],
  },
  {
    id: 'recharge-clim', category: 'climatisation-habitacle', title: 'Climatisation qui ne refroidit plus : contrôles et recharge', level: 1, minutes: 20, premium: false,
    tools: ['Lampe', 'Thermomètre (facultatif)'], parts: ['Filtre d’habitacle si encrassé'],
    steps: [
      { title: 'Savoir ce que dit la loi', detail: 'En France, la manipulation des fluides frigorigènes (recharge, vidange, ouverture du circuit) est réservée aux professionnels titulaires d’une attestation de capacité. La recharge se fait donc en garage, pas à la maison.' },
      { title: 'Ne jamais ouvrir le circuit', detail: 'Le fluide sort sous pression et très froid : gelures, lésions des yeux. Le R1234yf des voitures récentes est en plus légèrement inflammable.', danger: true },
      { title: 'Écouter le compresseur', detail: 'Moteur tournant, clim allumée : un déclic suivi d’une légère baisse du régime indique que le compresseur s’enclenche (les compresseurs sans embrayage, fréquents aujourd’hui, ne font pas ce déclic). Sinon : fusible, relais, pressostat ou manque de fluide.' },
      { title: 'Contrôler le filtre d’habitacle et le condenseur', detail: 'Filtre bouché : peu de débit d’air. Condenseur encrassé par les insectes à l’avant : mauvais refroidissement. Rincez-le à l’eau douce, sans jet haute pression.' },
      { title: 'Demander une recherche de fuite', detail: 'Une clim qui perd son efficacité en quelques mois fuit. Un garage sérieux cherche la fuite (colorant, détecteur) avant de recharger : recharger un circuit percé rejette un gaz à effet de serre.' },
      { title: 'Faire tourner la clim toute l’année', detail: 'Quelques minutes par semaine, même en hiver : l’huile du fluide lubrifie les joints du circuit.' },
    ],
  },
  {
    id: 'resistance-pulseur', category: 'climatisation-habitacle', title: 'Remplacer la résistance de pulseur d’air', level: 2, minutes: 45, premium: true,
    tools: ['Tournevis et Torx', 'Lampe', 'Clé 10 mm pour la batterie'],
    parts: ['Résistance ou module de commande du pulseur (référence exacte)'],
    steps: [
      { title: 'Reconnaître la panne', detail: 'La ventilation ne marche plus qu’à la vitesse maximale : c’est très souvent la résistance. Avec une clim automatique, c’est en général un module électronique qui joue ce rôle.' },
      { title: 'Débrancher la batterie', detail: 'Le travail se fait sous la planche de bord, près de connecteurs d’airbag (souvent jaunes) : ne débranchez jamais un connecteur jaune.', danger: true },
      { title: 'Trouver la résistance', detail: 'Le plus souvent côté passager, près du moteur de pulseur, fixée par deux vis dans le conduit d’air.' },
      { title: 'Laisser refroidir', detail: 'Elle chauffe fortement en fonctionnement.' },
      { title: 'Contrôler le connecteur', detail: 'Un connecteur fondu ou bruni signale un pulseur qui force : changez aussi le moteur de pulseur, sinon la résistance neuve grillera.' },
      { title: 'Monter la neuve et essayer', detail: 'Rebranchez la batterie et testez toutes les vitesses.' },
    ],
  },

  // ——— Carrosserie et vitrage ———
  {
    id: 'essuie-glaces', category: 'carrosserie', title: 'Changer les balais d’essuie-glace', level: 1, minutes: 10, premium: false,
    tools: ['Serviette'], parts: ['Balais avant (longueur côté conducteur et passager) et arrière, avec le bon adaptateur'],
    steps: [
      { title: 'Relever les bras', detail: 'Certains véhicules ont une position de service à activer juste après avoir coupé le contact (voir le manuel) : sinon, le bras bute sous le capot.' },
      { title: 'Protéger le pare-brise', detail: 'Posez une serviette : un bras qui retombe sans balai peut fêler le pare-brise.' },
      { title: 'Déposer le balai', detail: 'Appuyez sur le verrou de l’adaptateur et faites glisser le balai le long du bras.' },
      { title: 'Poser le balai neuf', detail: 'Jusqu’au déclic. Vérifiez la longueur de chaque côté, elles sont souvent différentes.' },
      { title: 'Essayer', detail: 'Un balai qui broute ou laisse des traces est mal posé ou de mauvaise taille. Nettoyez le pare-brise avant.' },
    ],
  },
  {
    id: 'retroviseur', category: 'carrosserie', title: 'Remplacer la glace ou la coque d’un rétroviseur', level: 2, minutes: 30, premium: true,
    tools: ['Levier plastique', 'Gants anti-coupure', 'Ruban adhésif', 'Sèche-cheveux (facultatif)'],
    parts: ['Glace de rétroviseur (côté, chauffante ou non, asphérique ou non)', 'Ou coque de rétroviseur'],
    steps: [
      { title: 'Choisir la bonne pièce', detail: 'Côté conducteur ou passager, glace chauffante (deux cosses à l’arrière), détection d’angle mort intégrée ou non.' },
      { title: 'Protéger les mains', detail: 'Une glace fêlée se brise au démontage : gants et ruban adhésif sur la glace.', danger: true },
      { title: 'Déclipser la glace', detail: 'Inclinez-la au maximum vers l’intérieur, glissez le levier sous le bord extérieur et tirez progressivement. Tiédir au sèche-cheveux assouplit les clips.' },
      { title: 'Débrancher le chauffage', detail: 'Retirez les deux cosses à l’arrière.' },
      { title: 'Poser la glace neuve', detail: 'Cosses rebranchées, puis appui ferme au centre jusqu’au déclic.' },
      { title: 'Remplacer la coque', detail: 'Elle se clipse ou se visse derrière la glace. Le remplacement du rétroviseur complet passe souvent par la dépose du panneau de porte : voyez le guide du lève-vitre pour les précautions.' },
    ],
  },
  {
    id: 'pare-brise-impact', category: 'carrosserie', title: 'Réparer un impact de pare-brise', level: 2, minutes: 45, premium: false,
    tools: ['Kit de réparation à résine', 'Ruban adhésif transparent', 'Lame de rasoir (fournie)', 'Lumière UV ou soleil'],
    parts: ['Résine du kit'],
    steps: [
      { title: 'Protéger l’impact tout de suite', detail: 'Un morceau d’adhésif transparent empêche l’eau et la saleté d’entrer en attendant la réparation.' },
      { title: 'Vérifier qu’il est réparable', detail: 'En général, un impact plus petit qu’une pièce de 2 €, hors du champ de vision du conducteur et à distance des bords. Sinon, remplacement du pare-brise.' },
      { title: 'Regarder votre assurance', detail: 'Avec une garantie bris de glace, la réparation par un professionnel est souvent prise en charge sans franchise.' },
      { title: 'Éviter les chocs thermiques', detail: 'Pas de dégivrage brutal ni d’eau chaude : l’impact peut se transformer en fissure.' },
      { title: 'Injecter la résine', detail: 'Pare-brise propre et sec, à l’ombre. Suivez la notice du kit : ventouse centrée, résine injectée, cycles de pression.' },
      { title: 'Durcir et araser', detail: 'Film fourni, exposition aux UV, puis arasement à la lame tenue à plat.' },
      { title: 'Surveiller', detail: 'Si une fissure part de l’impact, le pare-brise doit être remplacé. Un pare-brise fissuré dans le champ de vision est relevé au contrôle technique.' },
    ],
  },
  {
    id: 'leve-vitre', category: 'carrosserie', title: 'Remplacer un mécanisme de lève-vitre', level: 3, minutes: 120, premium: true,
    tools: ['Leviers plastiques de garnissage', 'Torx et douilles', 'Perceuse et riveteuse si le mécanisme est riveté', 'Ruban adhésif fort', 'Clé 10 mm pour la batterie'],
    parts: ['Mécanisme de lève-vitre (avec ou sans moteur, côté exact)', 'Agrafes de garnissage', 'Rivets'],
    steps: [
      { title: 'Débrancher la batterie', detail: 'Certaines portes contiennent un airbag latéral ou ses capteurs. Batterie débranchée, attendez le délai prévu par le constructeur (souvent quelques minutes) et ne débranchez jamais un connecteur jaune sans cette précaution.', danger: true },
      { title: 'Déposer le panneau de porte', detail: 'Vis cachées dans la poignée et l’accoudoir, puis agrafes au levier plastique. Débranchez les commandes et le câble de poignée.' },
      { title: 'Décoller la feuille d’étanchéité', detail: 'Doucement, pour la recoller : elle empêche l’eau d’entrer dans l’habitacle.' },
      { title: 'Bloquer la vitre en haut', detail: 'Remontez-la à la main et tenez-la au ruban adhésif sur le cadre : une vitre qui tombe se brise ou blesse.', danger: true },
      { title: 'Déposer l’ancien mécanisme', detail: 'Désolidarisez la vitre, débranchez le moteur, retirez vis ou perçez les rivets. Sortez le mécanisme par l’ouverture de la porte.' },
      { title: 'Monter le neuf et essayer avant de refermer', detail: 'Vitre refixée, moteur branché, batterie rebranchée : testez montée et descente.' },
      { title: 'Recoller la feuille et remonter le panneau', detail: 'Agrafes neuves pour les cassées.' },
      { title: 'Réinitialiser l’anti-pincement', detail: 'Souvent : vitre en butée haute, maintenez la commande quelques secondes. La procédure varie, voyez le manuel.' },
    ],
  },

  // ——— Pneus et roues ———
  {
    id: 'changer-roue', category: 'pneus', title: 'Changer une roue crevée', level: 1, minutes: 30, premium: false,
    tools: ['Cric et clé de roue du bord', 'Clé d’antivol de roue si équipé', 'Gilet de sécurité et triangle', 'Gants', 'Clé dynamométrique pour le resserrage'],
    parts: ['Roue de secours, galette ou kit anti-crevaison'],
    steps: [
      { title: 'Se mettre en sécurité', detail: 'Feux de détresse, gilet enfilé avant de sortir, passagers derrière les glissières. Sur autoroute, ne changez pas la roue sur la bande d’arrêt d’urgence : appelez l’assistance depuis une borne ou votre téléphone, à l’abri.', danger: true },
      { title: 'Placer le triangle', detail: 'À environ 30 m en amont si c’est possible sans danger.' },
      { title: 'Immobiliser la voiture', detail: 'Sol plat et dur, frein à main serré, première ou P engagée.' },
      { title: 'Débloquer les écrous au sol', detail: 'Un quart de tour, roue encore au sol, sans oublier l’écrou antivol.' },
      { title: 'Lever sur le point de levage', detail: 'Uniquement au repère prévu sous le bas de caisse (voir le manuel). Ne passez jamais un membre sous la voiture.', danger: true },
      { title: 'Changer la roue', detail: 'Écrous retirés, roue posée, écrous approchés à la main en étoile.' },
      { title: 'Reposer et serrer', detail: 'Voiture au sol, serrage ferme en étoile.', danger: true },
      { title: 'Respecter la galette', detail: 'Une roue de secours galette est souvent limitée à 80 km/h : voyez l’étiquette. Faites réparer le pneu au plus vite.' },
      { title: 'Resserrer au couple', detail: 'Après quelques dizaines de kilomètres, à la clé dynamométrique.', torques: [WHEEL_TORQUE] },
    ],
  },
  {
    id: 'pneus-controle', category: 'pneus', title: 'Contrôler la pression et l’usure des pneus', level: 1, minutes: 15, premium: false,
    tools: ['Manomètre ou gonfleur de station', 'Jauge de profondeur ou pièce de monnaie', 'Lampe'], parts: [],
    steps: [
      { title: 'Trouver les pressions', detail: 'Étiquette dans l’encadrement de la porte conducteur, sur la trappe à carburant ou dans le manuel. Elles changent souvent avec la charge.' },
      { title: 'Mesurer à froid', detail: 'Moins de quelques kilomètres parcourus. À chaud, la pression monte : ne dégonflez pas un pneu chaud.' },
      { title: 'Ajuster les quatre roues et la secours', detail: 'Remettez les bouchons de valve.' },
      { title: 'Mesurer la profondeur', detail: 'Minimum légal en France : 1,6 mm, signalé par les témoins d’usure dans les rainures. Au-dessous d’environ 3 mm, l’adhérence sur sol mouillé baisse nettement.', danger: true },
      { title: 'Lire l’usure', detail: 'Usure sur un seul bord : géométrie à contrôler. Usure au centre : surgonflage. Usure sur les deux bords : sous-gonflage.' },
      { title: 'Inspecter les flancs et l’âge', detail: 'Hernie, coupure ou craquelures : remplacement. Le code DOT donne la semaine et l’année de fabrication (ex. 2321 = semaine 23 de 2021).' },
      { title: 'Réinitialiser le TPMS si demandé', detail: 'Après un réglage de pression, certains véhicules demandent une réinitialisation de la surveillance de pression (menu ou bouton).' },
    ],
  },
  {
    id: 'permutation-pneus', category: 'pneus', title: 'Permuter les pneus avant et arrière', level: 2, minutes: 60, premium: false,
    tools: ['Cric et 2 chandelles (4 idéalement)', 'Clé à roue et clé dynamométrique', 'Craie'], parts: [],
    steps: [
      { title: 'Vérifier si c’est possible', detail: 'Pas de permutation si les dimensions avant et arrière diffèrent. Pneus directionnels (flèche sur le flanc) : ils restent du même côté.' },
      { title: 'Choisir le schéma', detail: 'Le plus courant : avant vers l’arrière du même côté. Les pneus les moins usés vont de préférence à l’arrière, comme le recommandent les manufacturiers.' },
      { title: 'Marquer chaque roue', detail: 'À la craie : AVG, AVD, ARG, ARD.' },
      LOOSEN_NUTS,
      ON_STANDS,
      { title: 'Intervertir les roues', detail: 'Profitez-en pour inspecter freins, soufflets et flancs intérieurs.' },
      REFIT_WHEEL,
      { title: 'Ajuster pressions et TPMS', detail: 'Les pressions avant et arrière sont souvent différentes. Réinitialisez la surveillance de pression ; un système à capteurs peut devoir réapprendre les positions.' },
    ],
  },
  {
    id: 'valve-tpms', category: 'pneus', title: 'Remplacer une valve à capteur de pression (TPMS)', level: 3, minutes: 60, premium: true,
    tools: ['Outil de diagnostic TPMS (activation et programmation)', 'Démonte-pneu et équilibreuse (atelier pneus)', 'Clé dynamométrique de faible couple'],
    parts: ['Capteur TPMS compatible ou programmable', 'Kit de service de valve (écrou, joint, obus)'],
    steps: [
      { title: 'Savoir quel système vous avez', detail: 'Indirect : pas de capteur, l’ABS compare les vitesses de roue, une réinitialisation suffit. Direct : un capteur à pile dans chaque roue, souvent reconnaissable à sa valve métallique avec écrou.' },
      { title: 'Trouver le capteur en défaut', detail: 'Un outil TPMS lit chaque capteur et l’état de sa pile. La pile n’est pas remplaçable seule et dure souvent 5 à 10 ans.' },
      { title: 'Commander le bon capteur', detail: 'Capteur d’origine ou programmable, à cloner ou programmer pour votre véhicule.' },
      { title: 'Faire déjanter le pneu', detail: 'Le capteur est à l’intérieur de la jante : un atelier pneus le démonte sans abîmer le capteur ni le talon. C’est aussi le moment de changer le kit de service de valve.' },
      { title: 'Serrer l’écrou de valve sans excès', detail: 'Une valve aluminium trop serrée casse.', torques: ['Écrou de valve TPMS : 4 à 8 N·m selon fabricant (valeur type)'] },
      { title: 'Équilibrer et regonfler', detail: 'Équilibrage obligatoire après démontage, pression à froid de l’étiquette.' },
      { title: 'Faire apprendre le capteur', detail: 'Selon le véhicule : automatiquement après quelques kilomètres, par le menu, ou avec l’outil TPMS. Le voyant doit s’éteindre.' },
    ],
  },
];

export const GUIDE_IDS = GUIDES.map((g) => g.id);

export function findGuide(id: string | null | undefined): Guide | undefined {
  return id ? GUIDES.find((g) => g.id === id) : undefined;
}

export function findCategory(id: GuideCategoryId): GuideCategory {
  return GUIDE_CATEGORIES.find((c) => c.id === id) ?? GUIDE_CATEGORIES[0];
}

/** Minuscules sans accents, pour une recherche tolérante (« electricite » trouve « Électricité »). */
export function normalizeSearch(text: string): string {
  // `normalize` peut manquer sur d'anciens moteurs JS : on garde alors les accents.
  const base = typeof text.normalize === 'function' ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : text;
  return base.toLowerCase().replace(/[’']/g, ' ').trim();
}

/** Guides dont le titre ou la catégorie contient tous les mots de la recherche. */
export function searchGuides(query: string, guides: Guide[] = GUIDES): Guide[] {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!words.length) return guides;
  return guides.filter((g) => {
    const hay = normalizeSearch(`${g.title} ${findCategory(g.category).label}`);
    return words.every((w) => hay.includes(w));
  });
}

export type GuideSection = { category: GuideCategory; guides: Guide[] };

/** Guides regroupés par catégorie, dans l'ordre de `GUIDE_CATEGORIES` ; les catégories vides sont omises. */
export function guidesByCategory(guides: Guide[] = GUIDES): GuideSection[] {
  return GUIDE_CATEGORIES.map((category) => ({ category, guides: guides.filter((g) => g.category === category.id) })).filter(
    (s) => s.guides.length > 0,
  );
}

/** Durée lisible : « 45 min », « 1 h 30 », « 5 h ». */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}
