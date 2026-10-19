/**
 * Plan d'entretien type, recalé sur le carnet de l'utilisateur. Les intervalles
 * sont des valeurs courantes : le carnet constructeur du véhicule prime.
 */
import type { Fuel, Vehicle } from '@/lib/diagnosis';
import type { LogEntry } from '@/lib/store';

export type MaintenanceItem = {
  id: string;
  title: string;
  everyKm?: number;
  everyMonths?: number;
  /** Mots qui reconnaissent l'opération dans le carnet. */
  keywords: string[];
  guideId?: string;
  note?: string;
  fuels?: Fuel[];
};

const THERMAL: Fuel[] = ['Essence', 'Diesel', 'Hybride', 'GPL'];

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Moteurs à chaîne de distribution, sans remplacement périodique. */
const CHAIN = ['thp', 'vti', 'tce', 'hybrid', 'ecoboost 1.5', 'tsi 1.2', '1.0 vvt-i', '1.33'];
const PURETECH = ['puretech', '1.2 turbo'];

function timing(v: Pick<Vehicle, 'engine' | 'fuel'>): MaintenanceItem | null {
  const engine = fold(v.engine);
  if (v.fuel === 'Électrique') return null;
  if (PURETECH.some((k) => engine.includes(k)))
    return {
      id: 'distribution',
      title: 'Courroie de distribution',
      everyKm: 100_000,
      everyMonths: 72,
      keywords: ['distribution', 'courroie'],
      note: 'Intervalle révisé par Stellantis pour le 1.2 PureTech. Faites aussi contrôler l’état de la courroie à chaque vidange.',
    };
  if (CHAIN.some((k) => engine.includes(k)))
    return {
      id: 'distribution',
      title: 'Chaîne de distribution (contrôle)',
      keywords: ['distribution', 'chaine'],
      note: 'Pas de remplacement périodique. Un bruit de chaîne au démarrage à froid doit être vérifié.',
    };
  return {
    id: 'distribution',
    title: 'Courroie de distribution',
    everyKm: 120_000,
    everyMonths: 60,
    keywords: ['distribution', 'courroie'],
    note: 'Valeur courante : selon le moteur, entre 100 000 et 180 000 km. Vérifiez votre carnet ; la casse détruit souvent le moteur.',
  };
}

export function maintenancePlan(v: Pick<Vehicle, 'engine' | 'fuel'>): MaintenanceItem[] {
  const items: MaintenanceItem[] = [
    { id: 'vidange', title: 'Vidange et filtre à huile', everyKm: 15_000, everyMonths: 12, keywords: ['vidange', 'huile'], guideId: 'vidange', fuels: THERMAL },
    { id: 'filtre-air', title: 'Filtre à air', everyKm: 30_000, everyMonths: 24, keywords: ['filtre a air'], guideId: 'filtre-air', fuels: THERMAL },
    { id: 'habitacle', title: 'Filtre d’habitacle', everyKm: 15_000, everyMonths: 12, keywords: ['habitacle', 'pollen'] },
    { id: 'bougies', title: 'Bougies d’allumage', everyKm: 60_000, everyMonths: 48, keywords: ['bougie'], guideId: 'bougies', fuels: ['Essence', 'Hybride', 'GPL'] },
    { id: 'filtre-gasoil', title: 'Filtre à gasoil', everyKm: 60_000, everyMonths: 48, keywords: ['gasoil', 'gazole', 'filtre a carburant'], fuels: ['Diesel'] },
    { id: 'freins', title: 'Contrôle des plaquettes et disques', everyKm: 20_000, everyMonths: 12, keywords: ['plaquette', 'disque', 'frein'], guideId: 'plaquettes' },
    { id: 'liquide-frein', title: 'Liquide de frein', everyMonths: 24, keywords: ['liquide de frein', 'purge'] },
    { id: 'refroidissement', title: 'Liquide de refroidissement', everyKm: 120_000, everyMonths: 60, keywords: ['refroidissement'], guideId: 'refroidissement' },
    { id: 'batterie', title: 'Test de la batterie 12 V', everyMonths: 24, keywords: ['batterie'], guideId: 'batterie', note: 'Une batterie de plus de 4 ans mérite un test avant l’hiver.' },
    { id: 'pneus', title: 'Pression et usure des pneus', everyKm: 10_000, everyMonths: 6, keywords: ['pneu', 'permutation'] },
  ];
  const t = timing(v);
  if (t) items.splice(1, 0, t);
  return items.filter((i) => !i.fuels || i.fuels.includes(v.fuel));
}

export type DueStatus = 'retard' | 'bientot' | 'ok' | 'inconnu';

export type Due = {
  item: MaintenanceItem;
  status: DueStatus;
  /** Dernière opération trouvée dans le carnet. */
  last?: LogEntry;
  nextKm?: number;
  nextDate?: string;
};

const addMonths = (iso: string, months: number) => {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

/** Échéances de chaque opération, les plus urgentes d'abord. */
export function maintenanceDue(v: Vehicle, log: LogEntry[], today = new Date().toISOString().slice(0, 10)): Due[] {
  const km = Number(String(v.mileage).replace(/\D/g, '')) || 0;
  const entries = log.filter((l) => l.vehicleId === v.id).sort((a, b) => b.date.localeCompare(a.date));
  const rank: Record<DueStatus, number> = { retard: 0, bientot: 1, inconnu: 2, ok: 3 };

  return maintenancePlan(v)
    .map((item): Due => {
      const last = entries.find((l) => item.keywords.some((k) => fold(l.operation).includes(k)));
      if (!item.everyKm && !item.everyMonths) return { item, status: 'ok', last };
      if (!last) {
        // Sans historique, on vise le prochain multiple de l'intervalle.
        const nextKm = item.everyKm && km ? Math.ceil((km + 1) / item.everyKm) * item.everyKm : undefined;
        return { item, status: 'inconnu', nextKm };
      }
      const lastKm = Number(last.mileage) || undefined;
      const nextKm = item.everyKm && lastKm ? lastKm + item.everyKm : undefined;
      const nextDate = item.everyMonths ? addMonths(last.date, item.everyMonths) : undefined;
      const soonDate = item.everyMonths ? addMonths(today, 2) : undefined;
      const late = (nextKm !== undefined && km >= nextKm) || (nextDate !== undefined && today >= nextDate);
      const soon =
        (nextKm !== undefined && item.everyKm !== undefined && km >= nextKm - item.everyKm * 0.1) ||
        (nextDate !== undefined && soonDate !== undefined && soonDate >= nextDate);
      return { item, status: late ? 'retard' : soon ? 'bientot' : 'ok', last, nextKm, nextDate };
    })
    .sort((a, b) => rank[a.status] - rank[b.status]);
}
