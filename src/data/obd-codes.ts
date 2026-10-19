/**
 * Base de codes défaut OBD2 intégrée : sert au mode hors ligne et à expliquer
 * immédiatement un code lu par le dongle, avant même la réponse de l'IA.
 */

export type ObdCodeInfo = {
  meaning: string;
  causes: string[];
  /** Guide intégré lié à la cause la plus fréquente. */
  guideId?: string;
  /** Code qui impose d'arrêter le véhicule. */
  stop?: boolean;
};

export const OBD_CODES: Record<string, ObdCodeInfo> = {
  P0300: { meaning: "Ratés d'allumage aléatoires, plusieurs cylindres", causes: ['Bougies usées', "Bobine(s) d'allumage", "Prise d'air", "Pression d'essence faible"], guideId: 'bobine' },
  P0301: { meaning: "Ratés d'allumage, cylindre 1", causes: ['Bobine du cylindre 1', 'Bougie du cylindre 1', 'Injecteur du cylindre 1', 'Compression faible'], guideId: 'bobine' },
  P0302: { meaning: "Ratés d'allumage, cylindre 2", causes: ['Bobine du cylindre 2', 'Bougie du cylindre 2', 'Injecteur du cylindre 2'], guideId: 'bobine' },
  P0303: { meaning: "Ratés d'allumage, cylindre 3", causes: ['Bobine du cylindre 3', 'Bougie du cylindre 3', 'Injecteur du cylindre 3'], guideId: 'bobine' },
  P0304: { meaning: "Ratés d'allumage, cylindre 4", causes: ['Bobine du cylindre 4', 'Bougie du cylindre 4', 'Injecteur du cylindre 4'], guideId: 'bobine' },
  P0171: { meaning: 'Mélange trop pauvre, banc 1', causes: ["Prise d'air après le débitmètre", "Débitmètre d'air encrassé", 'Pompe ou filtre à essence'], guideId: 'filtre-air' },
  P0172: { meaning: 'Mélange trop riche, banc 1', causes: ['Injecteur qui fuit', 'Sonde lambda amont', "Débitmètre d'air défaillant"] },
  P0101: { meaning: "Débitmètre d'air : signal incohérent", causes: ['Débitmètre encrassé', 'Filtre à air colmaté', "Prise d'air"], guideId: 'filtre-air' },
  P0113: { meaning: "Sonde de température d'air d'admission : signal haut", causes: ['Connecteur débranché ou oxydé', 'Sonde défectueuse'] },
  P0128: { meaning: 'Moteur trop lent à chauffer', causes: ['Thermostat bloqué ouvert', 'Sonde de température moteur'], guideId: 'refroidissement' },
  P0217: { meaning: 'Surchauffe moteur', causes: ['Niveau de liquide bas', 'Ventilateur', 'Pompe à eau', 'Joint de culasse'], guideId: 'refroidissement', stop: true },
  P0335: { meaning: 'Capteur de vilebrequin : pas de signal', causes: ['Capteur PMH défectueux', 'Faisceau endommagé', 'Cible abîmée'] },
  P0340: { meaning: "Capteur d'arbre à cames : défaut circuit", causes: ['Capteur défectueux', 'Faisceau', 'Calage de distribution'] },
  P0016: { meaning: 'Corrélation vilebrequin / arbre à cames', causes: ['Courroie ou chaîne de distribution détendue', 'Déphaseur', 'Capteur'] },
  P0087: { meaning: 'Pression du rail trop basse (diesel)', causes: ['Filtre à gazole colmaté', 'Pompe de gavage', 'Régulateur de pression', "Prise d'air circuit gazole"] },
  P0299: { meaning: 'Pression de suralimentation insuffisante', causes: ['Durite de turbo percée', 'Électrovanne de turbo', 'Turbo grippé'] },
  P0380: { meaning: 'Circuit de préchauffage défaillant', causes: ['Bougie de préchauffage HS', 'Boîtier de préchauffage'] },
  P0401: { meaning: 'Débit EGR insuffisant', causes: ['Vanne EGR encrassée', 'Conduits EGR bouchés'] },
  P0420: { meaning: 'Efficacité du catalyseur sous le seuil', causes: ['Catalyseur usé', 'Sonde lambda aval', "Fuite d'échappement"] },
  P0441: { meaning: 'Système EVAP : débit de purge incorrect', causes: ['Électrovanne de purge canister', 'Durite fissurée'] },
  P0456: { meaning: 'Système EVAP : très petite fuite', causes: ['Bouchon de réservoir mal fermé', 'Joint du bouchon', 'Durite canister'] },
  P0505: { meaning: 'Régulation du ralenti défaillante', causes: ['Boîtier papillon encrassé', "Prise d'air"] },
  P0562: { meaning: 'Tension du réseau de bord trop basse', causes: ['Batterie faible', 'Alternateur', 'Cosse oxydée'], guideId: 'batterie' },
  P0700: { meaning: 'Défaut boîte de vitesses automatique', causes: ['Lire les codes du calculateur de boîte', "Niveau d'huile de boîte"] },
  P2002: { meaning: 'Efficacité du filtre à particules sous le seuil', causes: ['FAP colmaté', 'Capteur de pression différentielle', 'Trajets trop courts'] },
  U0100: { meaning: 'Perte de communication avec le calculateur moteur', causes: ['Batterie faible', 'Faisceau CAN', 'Calculateur'], guideId: 'batterie' },
};

const CODE_RE = /[PCBU][0-3][0-9A-F]{3}/g;

/** Extrait les codes défaut d'un texte libre (« p0301, P0171 » → ['P0301', 'P0171']). */
export function extractCodes(text: string): string[] {
  return [...new Set(text.toUpperCase().match(CODE_RE) ?? [])];
}
