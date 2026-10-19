/**
 * Pannes connues par moteur ou par modèle, affichées dès l'ajout du véhicule et
 * transmises au diagnostic. Sources : campagnes et extensions de garantie des
 * constructeurs, retours d'atelier largement documentés. À enrichir avec les
 * retours « ça a réglé le problème ? » des utilisateurs.
 */
import type { Fuel, Vehicle } from '@/lib/diagnosis';

export type KnownIssue = {
  id: string;
  title: string;
  /** Ce que l'utilisateur remarque. */
  signs: string;
  /** Ce qu'il faut vérifier ou faire. */
  advice: string;
  cost: string;
  severity: 'info' | 'surveiller' | 'grave';
  match: {
    /** Morceaux de la motorisation saisie, sans accents ni casse. */
    engine?: string[];
    make?: string[];
    model?: string[];
    fuel?: Fuel[];
    years?: [number, number];
  };
};

export const KNOWN_ISSUES: KnownIssue[] = [
  {
    id: 'puretech-courroie',
    title: 'Courroie de distribution « humide » du 1.2 PureTech',
    signs: 'Voyant de pression d’huile, freinage plus dur, perte de puissance, débris de courroie dans l’huile.',
    advice:
      'Faites contrôler l’état de la courroie (mesure de la largeur) et respectez la vidange avec l’huile homologuée. Stellantis a étendu sa prise en charge (jusqu’à 10 ans ou 175 000 km selon les cas) : demandez-la en concession avec votre carnet d’entretien.',
    cost: 'Courroie et crépine : 900 à 1 500 € au garage, souvent pris en charge',
    severity: 'grave',
    match: { engine: ['puretech', '1.2 turbo'], years: [2013, 2023] },
  },
  {
    id: 'puretech-huile',
    title: 'Consommation d’huile du 1.2 PureTech',
    signs: 'Niveau d’huile qui baisse entre deux vidanges, alerte niveau d’huile, fumée bleutée.',
    advice: 'Vérifiez le niveau tous les 1 000 km. Au-delà de 0,5 L pour 1 000 km, ouvrez un dossier auprès du constructeur.',
    cost: 'Variable, segmentation ou moteur pris en charge selon le dossier',
    severity: 'surveiller',
    match: { engine: ['puretech'], years: [2013, 2023] },
  },
  {
    id: 'dv6-turbo',
    title: 'Turbo et crépine du 1.6 HDi',
    signs: 'Sifflement, perte de puissance, mode dégradé, fumée bleue, code P0299.',
    advice:
      'Le turbo casse souvent parce que la crépine d’huile du turbo se bouche. Au remplacement, changez aussi la crépine, le tuyau d’arrivée d’huile et faites une vidange.',
    cost: 'Turbo et kit : 600 à 1 200 € au garage, 250 à 500 € en pièces',
    severity: 'grave',
    match: { engine: ['1.6 hdi', '1.6 tdci', '1.6 e-hdi'], years: [2004, 2015] },
  },
  {
    id: 'dv6-injecteurs',
    title: 'Joints d’injecteurs du 1.6 HDi',
    signs: 'Odeur de gasoil brûlé dans l’habitacle, claquement, calamine noire autour des injecteurs.',
    advice: 'Remplacez les joints cuivre et les vis de bride des injecteurs avant que la calamine ne grippe le puits.',
    cost: 'Joints : 10 à 30 €, 150 à 300 € au garage',
    severity: 'surveiller',
    match: { engine: ['1.6 hdi', '1.6 tdci'], years: [2004, 2012] },
  },
  {
    id: 'thp-chaine',
    title: 'Chaîne de distribution du 1.6 THP / VTi',
    signs: 'Bruit de chaîne à froid au démarrage pendant quelques secondes, codes P0016 ou P0017.',
    advice: 'Faites mesurer l’allongement de la chaîne et contrôler le tendeur. Vidanges rapprochées recommandées (15 000 km).',
    cost: 'Kit chaîne : 800 à 1 500 € au garage',
    severity: 'grave',
    match: { engine: ['1.6 thp', '1.4 vti', '1.6 vti'], years: [2006, 2014] },
  },
  {
    id: 'k9k-coussinets',
    title: 'Coussinets de bielle du 1.5 dCi',
    signs: 'Claquement métallique moteur chaud, voyant de pression d’huile.',
    advice: 'Vidange au moins tous les 15 000 km avec une huile de qualité. Au moindre claquement, arrêtez le moteur : la casse est rapide.',
    cost: 'Coussinets : 600 à 1 000 € au garage, moteur si casse',
    severity: 'grave',
    match: { engine: ['1.5 dci'], years: [2001, 2012] },
  },
  {
    id: 'k9k-egr',
    title: 'Vanne EGR et injecteurs du 1.5 dCi',
    signs: 'Trous à l’accélération, voyant moteur, fumée noire, code P0401 ou P0403.',
    advice: 'Un nettoyage de la vanne EGR suffit souvent. Les injecteurs Delphi des premières versions se testent en atelier (test de retour).',
    cost: 'Vanne EGR : 80 à 250 € en pièce, 200 à 450 € au garage',
    severity: 'surveiller',
    match: { engine: ['1.5 dci', 'blue dci'] },
  },
  {
    id: 'tce-huile',
    title: 'Consommation d’huile du 1.2 TCe 115/120',
    signs: 'Niveau d’huile qui baisse vite, alerte niveau, ratés d’allumage.',
    advice: 'Contrôlez le niveau chaque mois. Renault et Dacia ont accordé des prises en charge : gardez les factures d’entretien.',
    cost: 'Moteur ou segmentation, souvent pris en charge partiellement',
    severity: 'surveiller',
    match: { engine: ['1.2 tce'], years: [2012, 2016] },
  },
  {
    id: 'ea111-chaine',
    title: 'Chaîne de distribution des 1.2 et 1.4 TSI première génération',
    signs: 'Bruit de crécelle au démarrage, moteur qui cale, codes de calage d’arbre à cames.',
    advice: 'Faites contrôler le tendeur et la chaîne. La casse détruit les soupapes.',
    cost: 'Kit chaîne : 700 à 1 300 € au garage',
    severity: 'grave',
    match: { engine: ['1.2 tsi', '1.4 tsi'], make: ['Volkswagen', 'Audi', 'Seat', 'Skoda'], years: [2006, 2012] },
  },
  {
    id: 'dsg7',
    title: 'Boîte DSG7 à embrayage sec (DQ200)',
    signs: 'À-coups au démarrage, passages de vitesse brutaux, voyant boîte qui clignote.',
    advice: 'Mise à jour logicielle et apprentissage de l’embrayage en atelier. Le bloc mécatronique est la pièce qui lâche le plus.',
    cost: 'Mécatronique : 1 200 à 2 500 € au garage',
    severity: 'surveiller',
    match: { engine: ['dsg'], make: ['Volkswagen', 'Audi', 'Seat', 'Skoda', 'Cupra'], years: [2008, 2020] },
  },
  {
    id: 'ecoboost-courroie',
    title: 'Courroie humide et refroidissement du 1.0 EcoBoost',
    signs: 'Baisse du liquide de refroidissement, surchauffe, fumée blanche.',
    advice: 'Contrôlez le vase d’expansion chaque mois. Une surchauffe sur ce moteur peut fissurer la culasse : arrêtez-vous tout de suite.',
    cost: 'Durite et courroie : 400 à 1 200 €, plus si culasse',
    severity: 'grave',
    match: { engine: ['ecoboost'], make: ['Ford'] },
  },
  {
    id: 'n47-chaine',
    title: 'Chaîne de distribution des diesels BMW N47',
    signs: 'Bruit de sifflement ou de cliquetis côté boîte, qui augmente avec le régime.',
    advice: 'La chaîne est côté boîte : sa casse détruit le moteur. Faites écouter le moteur par un spécialiste au moindre bruit.',
    cost: 'Chaîne : 1 500 à 2 500 € au garage',
    severity: 'grave',
    match: { make: ['BMW', 'Mini'], fuel: ['Diesel'], years: [2007, 2014] },
  },
  {
    id: 'fap-trajets-courts',
    title: 'Filtre à particules colmaté sur trajets courts',
    signs: 'Voyant FAP ou moteur, perte de puissance, ventilateur qui tourne après l’arrêt, consommation en hausse.',
    advice:
      'Faites 20 minutes de voie rapide à 2 500–3 000 tr/min pour lancer une régénération. Si le voyant reste, faites lire les codes (P2002, P2463) avant de remplacer quoi que ce soit.',
    cost: 'Régénération forcée : 80 à 200 €, FAP neuf : 500 à 1 500 €',
    severity: 'surveiller',
    match: { fuel: ['Diesel'], years: [2009, 2030] },
  },
  {
    id: 'peugeot-train-arriere',
    title: 'Roulements du train arrière des 206, 207 et 307',
    signs: 'Roue arrière qui penche en haut (carrossage), pneus arrière usés à l’intérieur, bruit de claquement à l’arrière.',
    advice: 'Les aiguilles des bras arrière s’usent. Le kit de réfection se monte avec une presse : réparation de niveau avancé.',
    cost: 'Kit : 80 à 200 €, 400 à 800 € au garage',
    severity: 'surveiller',
    match: { make: ['Peugeot'], model: ['206', '206+', '207', '307', 'partner'] },
  },
  {
    id: 'renault-bobines',
    title: 'Bobines d’allumage des Renault essence 16v',
    signs: 'Moteur qui broute, voyant moteur, codes P0300 à P0304.',
    advice: 'Inversez la bobine du cylindre en défaut avec une autre : si le défaut suit, changez la bobine.',
    cost: 'Bobine : 20 à 50 € pièce',
    severity: 'info',
    match: { make: ['Renault', 'Dacia'], engine: ['16v'] },
  },
  {
    id: 'hybride-12v',
    title: 'Batterie 12 V auxiliaire des hybrides et électriques',
    signs: 'La voiture ne passe pas en « Ready », écrans qui clignotent, alertes multiples après quelques jours sans rouler.',
    advice: 'C’est presque toujours la petite batterie 12 V, pas la batterie de traction. Testez-la et rechargez-la ; ne touchez jamais aux câbles orange.',
    cost: 'Batterie 12 V : 100 à 250 €',
    severity: 'info',
    match: { fuel: ['Hybride', 'Électrique'] },
  },
];

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Pannes connues qui concernent ce véhicule, les plus graves d'abord. */
export function knownIssuesFor(v: Pick<Vehicle, 'make' | 'model' | 'engine' | 'fuel' | 'year'>): KnownIssue[] {
  const engine = fold(v.engine ?? '');
  const make = fold(v.make ?? '');
  const model = fold(v.model ?? '');
  const year = Number(v.year);
  const rank = { grave: 0, surveiller: 1, info: 2 };
  return KNOWN_ISSUES.filter(({ match: m }) => {
    if (m.engine && !m.engine.some((e) => engine.includes(fold(e)))) return false;
    if (m.make && !m.make.some((x) => fold(x) === make)) return false;
    if (m.model && !m.model.some((x) => fold(x) === model)) return false;
    if (m.fuel && !m.fuel.includes(v.fuel)) return false;
    if (m.years && Number.isFinite(year) && year > 0 && (year < m.years[0] || year > m.years[1])) return false;
    return true;
  }).sort((a, b) => rank[a.severity] - rank[b.severity]);
}
