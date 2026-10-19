/** Symptômes fréquents proposés en un toucher, avec leurs causes de secours hors ligne. */

export type SymptomCause = {
  title: string;
  weight: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  partsCost: string;
  garageCost: string;
  guideId?: string;
};

export type Symptom = {
  id: string;
  label: string;
  keywords: string[];
  causes: SymptomCause[];
  /** Symptôme qui touche la sécurité ou risque de casser le moteur. */
  stop?: boolean;
};

const c = (
  title: string,
  weight: number,
  difficulty: SymptomCause['difficulty'],
  partsCost: string,
  garageCost: string,
  guideId?: string,
): SymptomCause => ({ title, weight, difficulty, partsCost, garageCost, guideId });

export const SYMPTOMS: Symptom[] = [
  { id: 'voyant', label: 'Voyant moteur', keywords: ['voyant moteur', 'check engine', 'voyant orange'], causes: [
    c('Lire le code défaut avec une valise OBD2', 40, 1, '15–30 € (dongle)', '40–60 €', 'obd'),
    c('Capteur ou sonde défaillant', 30, 2, '30–120 €', '100–250 €'),
    c("Ratés d'allumage", 30, 2, '40–150 €', '120–300 €', 'bobine')] },
  { id: 'broute', label: 'Broute / ratés', keywords: ['broute', 'raté', 'tremble', 'hoquet'], causes: [
    c("Bobine d'allumage défectueuse", 45, 2, '35–90 €', '120–220 €', 'bobine'),
    c('Bougies usées', 35, 2, '20–60 €', '80–160 €', 'bougies'),
    c("Prise d'air à l'admission", 20, 3, '5–40 €', '80–200 €')] },
  { id: 'frein', label: 'Bruit au freinage', keywords: ['frein', 'grince', 'couine', 'freinage'], stop: true, causes: [
    c("Plaquettes usées jusqu'au témoin", 60, 2, '25–60 €', '90–160 €', 'plaquettes'),
    c('Disques voilés ou rayés', 30, 3, '50–120 €', '180–320 €', 'plaquettes'),
    c('Étrier grippé', 10, 3, '40–120 €', '150–300 €')] },
  { id: 'demarrage', label: 'Démarre mal', keywords: ['démarre mal', 'démarre pas', 'démarrage', 'ne démarre'], causes: [
    c('Batterie faible', 55, 1, '80–160 €', '130–220 €', 'batterie'),
    c('Démarreur fatigué', 25, 3, '90–250 €', '250–450 €'),
    c('Bougies de préchauffage (diesel)', 20, 3, '30–90 €', '150–300 €')] },
  { id: 'fumee-noire', label: 'Fumée noire', keywords: ['fumée noire'], causes: [
    c('Filtre à air colmaté', 30, 1, '10–30 €', '40–70 €', 'filtre-air'),
    c('Vanne EGR encrassée', 35, 3, '0–200 €', '150–450 €'),
    c('Injecteur défectueux', 35, 4, '120–400 €', '300–900 €')] },
  { id: 'fumee-blanche', label: 'Fumée blanche', keywords: ['fumée blanche'], stop: true, causes: [
    c('Condensation à froid (normal si elle disparaît)', 40, 1, '0 €', '0 €'),
    c('Liquide de refroidissement brûlé (joint de culasse)', 45, 5, '150–400 €', '900–2 000 €', 'refroidissement'),
    c('Bougies de préchauffage (diesel)', 15, 3, '30–90 €', '150–300 €')] },
  { id: 'surchauffe', label: 'Surchauffe', keywords: ['surchauffe', 'chauffe', 'température monte'], stop: true, causes: [
    c('Niveau de liquide de refroidissement bas', 45, 1, '10–25 €', '40–80 €', 'refroidissement'),
    c('Motoventilateur ou son relais', 30, 3, '40–250 €', '200–450 €'),
    c('Thermostat bloqué fermé', 25, 3, '20–60 €', '150–280 €')] },
  { id: 'vibrations', label: 'Vibrations', keywords: ['vibr', 'volant tremble'], causes: [
    c('Équilibrage des roues', 50, 1, '0 €', '15–40 €'),
    c('Disques voilés (si au freinage)', 30, 3, '50–120 €', '180–320 €', 'plaquettes'),
    c('Silentbloc ou rotule usé', 20, 3, '20–80 €', '120–300 €')] },
  { id: 'puissance', label: 'Perte de puissance', keywords: ['perte de puissance', 'mode dégradé', "n'avance plus", 'pas de puissance'], causes: [
    c('Mode dégradé suite à un défaut moteur : lire les codes', 40, 1, '15–30 € (dongle)', '40–60 €', 'obd'),
    c('Durite de turbo percée', 30, 2, '20–90 €', '100–250 €'),
    c('Filtre à particules ou EGR encrassé', 30, 3, '0–300 €', '150–800 €')] },
  { id: 'brule', label: 'Odeur de brûlé', keywords: ['brûlé', 'odeur'], causes: [
    c("Fuite d'huile sur l'échappement", 40, 2, '10–80 €', '100–300 €'),
    c('Embrayage qui patine', 30, 4, '150–350 €', '500–1 000 €'),
    c('Frein qui frotte (étrier grippé)', 30, 3, '40–120 €', '150–300 €')] },
  { id: 'fuite', label: 'Fuite sous la voiture', keywords: ['fuite', 'flaque', 'goutte'], causes: [
    c('Eau de climatisation (normal, claire et sans odeur)', 35, 1, '0 €', '0 €'),
    c('Huile moteur (joint de carter ou bouchon)', 35, 2, '5–60 €', '80–250 €', 'vidange'),
    c('Liquide de refroidissement (rose, vert ou bleu, odeur sucrée)', 30, 2, '10–80 €', '100–300 €', 'refroidissement')] },
  { id: 'claquement', label: 'Claquement en tournant', keywords: ['claque', 'tournant', 'cardan'], causes: [
    c('Soufflet de cardan déchiré, joint homocinétique usé', 60, 3, '20–150 €', '150–400 €'),
    c('Biellette de barre stabilisatrice', 30, 2, '15–40 €', '80–150 €'),
    c("Coupelle d'amortisseur", 10, 3, '30–80 €', '150–300 €')] },
];
