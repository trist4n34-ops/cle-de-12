/**
 * Auto-contrôle avant le contrôle technique : ce qu'un débutant peut vérifier
 * en 20 minutes devant chez lui. Depuis le 20 mai 2018, le contrôle technique
 * porte sur 133 points et classe chaque défaillance en trois niveaux :
 * mineure (à réparer, pas de contre-visite), majeure (contre-visite sous
 * 2 mois) et critique (le véhicule ne peut circuler que jusqu'à minuit le jour
 * du contrôle, puis contre-visite sous 2 mois).
 *
 * `defect` indique le niveau généralement retenu si le contrôleur constate le
 * défaut ; `defectNote` nuance quand la gravité dépend de l'état constaté.
 */
import type { CtLevel } from '@/lib/ct';

export type CtArea = 'eclairage' | 'pneus' | 'freins' | 'visibilite' | 'direction' | 'pollution' | 'carrosserie' | 'equipements';

export const CT_AREAS: { id: CtArea; label: string }[] = [
  { id: 'eclairage', label: 'Éclairage et signalisation' },
  { id: 'pneus', label: 'Pneus et roues' },
  { id: 'freins', label: 'Freins' },
  { id: 'visibilite', label: 'Visibilité et essuie-glaces' },
  { id: 'direction', label: 'Direction et train avant' },
  { id: 'pollution', label: 'Pollution, fuites et voyants' },
  { id: 'carrosserie', label: 'Carrosserie et plaques' },
  { id: 'equipements', label: 'Équipements' },
];

export type CtCheckItem = {
  id: string;
  area: CtArea;
  title: string;
  how: string;
  defect: CtLevel;
  defectNote?: string;
};

export const CT_CHECKLIST: CtCheckItem[] = [
  // Éclairage et signalisation : se fait à deux, ou seul devant un mur ou une vitrine.
  {
    id: 'feux-position', area: 'eclairage', title: 'Feux de position avant et arrière',
    how: 'Allumez les veilleuses et faites le tour de la voiture : les deux feux avant et les deux feux arrière doivent éclairer.',
    defect: 'majeure', defectNote: 'Une simple ampoule grillée suffit à imposer une contre-visite.',
  },
  {
    id: 'feux-croisement-route', area: 'eclairage', title: 'Feux de croisement et de route',
    how: 'Allumez les codes puis les pleins phares face à un mur : les deux côtés doivent s’allumer, avec la même intensité.',
    defect: 'majeure',
  },
  {
    id: 'reglage-phares', area: 'eclairage', title: 'Hauteur des phares',
    how: 'Garé à 3 ou 4 m d’un mur, codes allumés : la limite du faisceau doit être un peu plus basse que les phares et à la même hauteur des deux côtés.',
    defect: 'majeure', defectNote: 'Un faisceau trop haut éblouit les autres conducteurs.',
  },
  {
    id: 'feux-stop', area: 'eclairage', title: 'Feux stop, y compris le troisième',
    how: 'Faites appuyer quelqu’un sur la pédale de frein, ou reculez près d’un mur et regardez le reflet : les feux stop latéraux et le feu central doivent s’allumer.',
    defect: 'majeure', defectNote: 'Critique si aucun feu stop ne s’allume.',
  },
  {
    id: 'clignotants', area: 'eclairage', title: 'Clignotants et feux de détresse',
    how: 'Testez le clignotant gauche, le droit puis les warnings : tous les clignotants, répétiteurs latéraux compris, doivent clignoter à un rythme normal.',
    defect: 'majeure', defectNote: 'Un clignotement très rapide signale souvent une ampoule grillée.',
  },
  {
    id: 'eclairage-plaque', area: 'eclairage', title: 'Éclairage de la plaque arrière',
    how: 'Veilleuses allumées, de préférence à la tombée de la nuit : la plaque arrière doit être éclairée et lisible.',
    defect: 'mineure',
  },

  // Pneus et roues
  {
    id: 'pneus-usure', area: 'pneus', title: 'Usure des pneus',
    how: 'Cherchez les témoins d’usure dans les rainures, ou mesurez avec une jauge : il faut au moins 1,6 mm de sculpture partout, y compris sur les bords intérieurs.',
    defect: 'majeure', defectNote: 'Une usure très inégale signale aussi un problème de parallélisme.',
  },
  {
    id: 'pneus-flancs', area: 'pneus', title: 'Flancs des pneus',
    how: 'Braquez le volant à fond pour voir les pneus avant, puis faites le tour : pas de hernie (bosse), de coupure profonde ni de craquelures importantes.',
    defect: 'majeure', defectNote: 'Critique si la carcasse (les toiles) est visible.',
  },
  {
    id: 'pneus-essieu', area: 'pneus', title: 'Pneus identiques sur un même essieu',
    how: 'Lisez les inscriptions sur les flancs : sur un même essieu, les deux pneus doivent avoir la même dimension et la même structure.',
    defect: 'majeure',
  },
  {
    id: 'roues-fixation', area: 'pneus', title: 'Jantes et écrous de roue',
    how: 'Vérifiez qu’aucun écrou ou boulon de roue ne manque et qu’aucune jante n’est fissurée ou fortement déformée.',
    defect: 'majeure', defectNote: 'Critique si la roue risque de se détacher.',
  },

  // Freins
  {
    id: 'liquide-frein', area: 'freins', title: 'Niveau du liquide de frein',
    how: 'Capot ouvert, sur sol plat : le niveau du bocal doit être entre MIN et MAX. Un niveau bas indique des plaquettes usées ou une fuite.',
    defect: 'majeure',
  },
  {
    id: 'fuite-frein', area: 'freins', title: 'Fuites de liquide de frein',
    how: 'Regardez derrière chaque roue et sous le bocal : pas de traces humides ou grasses sur les flexibles, les étriers ou l’intérieur des jantes.',
    defect: 'critique', defectNote: 'Une fuite de liquide de frein est un danger immédiat : ne roulez pas.',
  },
  {
    id: 'pedale-frein', area: 'freins', title: 'Pédale de frein',
    how: 'Moteur tournant, appuyez fort sur la pédale pendant 10 secondes : elle doit rester ferme et ne pas descendre lentement vers le plancher.',
    defect: 'majeure', defectNote: 'Critique si le freinage est très insuffisant.',
  },
  {
    id: 'frein-main', area: 'freins', title: 'Frein de stationnement',
    how: 'Dans une pente, serrez le frein à main (ou activez le frein électrique) au point mort : la voiture doit rester immobile.',
    defect: 'majeure',
  },
  {
    id: 'disques', area: 'freins', title: 'Disques de frein',
    how: 'Regardez les disques à travers les jantes : un rebord marqué sur le bord extérieur ou des rayures profondes indiquent des disques usés.',
    defect: 'majeure',
  },

  // Visibilité et essuie-glaces
  {
    id: 'pare-brise', area: 'visibilite', title: 'Pare-brise',
    how: 'Cherchez impacts et fissures, surtout dans la zone balayée par l’essuie-glace côté conducteur. Un petit impact se répare souvent sans changer le pare-brise.',
    defect: 'majeure', defectNote: 'Surtout si le défaut est dans le champ de vision du conducteur.',
  },
  {
    id: 'essuie-glaces', area: 'visibilite', title: 'Essuie-glaces',
    how: 'Testez toutes les vitesses : les balais doivent essuyer sans laisser de traînées ni sauter. Un balai déchiré se change en deux minutes.',
    defect: 'majeure', defectNote: 'Majeure s’il ne fonctionne pas ; des balais usés restent moins graves.',
  },
  {
    id: 'lave-glace', area: 'visibilite', title: 'Lave-glace',
    how: 'Actionnez le lave-glace : le liquide doit arriver sur le pare-brise. Remplissez le réservoir avant le contrôle.',
    defect: 'mineure',
  },
  {
    id: 'retroviseurs', area: 'visibilite', title: 'Rétroviseurs',
    how: 'Vérifiez le rétroviseur intérieur et les rétroviseurs extérieurs : présents, bien fixés, glace non cassée et réglable.',
    defect: 'mineure', defectNote: 'Majeure si un rétroviseur obligatoire manque ou est inutilisable.',
  },

  // Direction et train avant (ce qui se voit sans lever la voiture)
  {
    id: 'jeu-direction', area: 'direction', title: 'Jeu dans la direction',
    how: 'Moteur tournant, roues droites, tournez doucement le volant à gauche et à droite en regardant une roue : elle doit bouger presque aussitôt, sans jeu notable.',
    defect: 'majeure',
  },
  {
    id: 'soufflets', area: 'direction', title: 'Soufflets de cardan et de direction',
    how: 'Volant braqué à fond, regardez derrière la roue avant avec une lampe : les soufflets en caoutchouc ne doivent pas être déchirés ni avoir projeté de graisse.',
    defect: 'majeure', defectNote: 'La gravité dépend de l’organe et de l’état du soufflet.',
  },
  {
    id: 'amortisseurs', area: 'direction', title: 'Amortisseurs',
    how: 'Appuyez fort sur chaque coin de la voiture puis relâchez : elle doit remonter sans rebondir. Regardez aussi s’il y a de l’huile sur le corps de l’amortisseur.',
    defect: 'mineure', defectNote: 'Majeure si la fuite est importante ou l’amortisseur inefficace.',
  },
  {
    id: 'ressorts', area: 'direction', title: 'Ressorts de suspension',
    how: 'Avec une lampe, regardez les ressorts derrière chaque roue et vérifiez que la voiture ne penche pas d’un côté : une spire cassée est fréquente à l’avant.',
    defect: 'majeure',
  },

  // Pollution, fuites et voyants
  {
    id: 'voyant-moteur', area: 'pollution', title: 'Voyant moteur (antipollution)',
    how: 'Mettez le contact : le voyant moteur orange s’allume puis doit s’éteindre au démarrage. S’il reste allumé, lisez les codes défaut avec un dongle OBD2.',
    defect: 'majeure',
  },
  {
    id: 'voyants-securite', area: 'pollution', title: 'Voyants ABS, airbag, freinage et direction',
    how: 'Après le démarrage, aucun voyant de sécurité (ABS, airbag, frein, direction assistée) ne doit rester allumé au tableau de bord.',
    defect: 'majeure',
  },
  {
    id: 'fumees', area: 'pollution', title: 'Fumées à l’échappement',
    how: 'Moteur chaud, faites accélérer quelqu’un pendant que vous regardez l’échappement : pas de fumée noire, bleue ou blanche épaisse persistante. Le contrôleur mesure les émissions.',
    defect: 'majeure', defectNote: 'Majeure si les émissions mesurées dépassent les limites.',
  },
  {
    id: 'echappement', area: 'pollution', title: 'Ligne d’échappement',
    how: 'Moteur tournant, écoutez sous la voiture : pas de bruit de souffle ou de claquement. Le silencieux ne doit pas pendre ni être percé.',
    defect: 'majeure',
  },
  {
    id: 'fuites-moteur', area: 'pollution', title: 'Fuites d’huile ou de liquides',
    how: 'Après une nuit garée, regardez le sol sous le moteur et la boîte : pas de flaque d’huile, de liquide de refroidissement ou de carburant.',
    defect: 'majeure', defectNote: 'Une fuite de carburant est critique : ne roulez pas.',
  },

  // Carrosserie et plaques
  {
    id: 'plaques', area: 'carrosserie', title: 'Plaques d’immatriculation',
    how: 'Les deux plaques doivent être présentes, bien fixées, propres, lisibles et identiques au numéro de la carte grise.',
    defect: 'majeure',
  },
  {
    id: 'carrosserie', area: 'carrosserie', title: 'Éléments de carrosserie',
    how: 'Faites le tour : pas de pare-chocs ou de pièce qui pend, ni de tôle déchirée aux arêtes coupantes.',
    defect: 'majeure', defectNote: 'Majeure si une pièce risque de tomber ou de blesser.',
  },
  {
    id: 'corrosion', area: 'carrosserie', title: 'Corrosion du soubassement',
    how: 'Avec une lampe, regardez les bas de caisse et le dessous des portes : de la rouille de surface passe, une tôle percée ou qui s’effrite non.',
    defect: 'majeure', defectNote: 'Critique si la structure du véhicule est fragilisée.',
  },
  {
    id: 'portes', area: 'carrosserie', title: 'Portes, capot et hayon',
    how: 'Ouvrez et fermez chaque porte de l’intérieur et de l’extérieur, puis le capot et le coffre : tout doit s’ouvrir et se verrouiller correctement.',
    defect: 'majeure', defectNote: 'Surtout si une porte ne se ferme pas correctement.',
  },

  // Équipements
  {
    id: 'ceintures', area: 'equipements', title: 'Ceintures de sécurité',
    how: 'Tirez chaque ceinture d’un coup sec : elle doit se bloquer, s’enrouler seule, se verrouiller dans la boucle et ne pas être effilochée.',
    defect: 'majeure',
  },
  {
    id: 'klaxon', area: 'equipements', title: 'Avertisseur sonore',
    how: 'Appuyez sur le klaxon : il doit émettre un son franc et continu.',
    defect: 'majeure',
  },
  {
    id: 'sieges', area: 'equipements', title: 'Siège conducteur',
    how: 'Assis, poussez le siège d’avant en arrière et le dossier : il doit être bien fixé et ses réglages doivent se verrouiller.',
    defect: 'majeure',
  },
];
