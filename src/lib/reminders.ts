/**
 * Rappels locaux (sans React ni module natif, donc testables) : échéance du
 * contrôle technique et liste des notifications à programmer.
 *
 * Contrôle technique (voitures particulières, France) : premier contrôle avant
 * le 4e anniversaire de la première mise en circulation, puis tous les 2 ans ;
 * contre-visite dans les 2 mois après un contrôle défavorable.
 */
import { maintenanceDue } from '@/data/maintenance';
import type { Vehicle } from '@/lib/diagnosis';
import { addDays, addMonths, isoDate, localDate } from '@/lib/garage';
import type { LogEntry } from '@/lib/store';
import type { TKey } from '@/i18n/locales/fr';

/** Données du véhicule propres aux rappels, gardées hors du store principal. */
export type VehicleExtras = {
  /** Date de première mise en circulation (carte grise, case B), AAAA-MM-JJ. */
  firstRegistration?: string;
  /** Date du dernier contrôle technique, AAAA-MM-JJ. */
  lastCt?: string;
  /** Le dernier contrôle impose une contre-visite. */
  counterVisit?: boolean;
  /** Dernière mise à jour du kilométrage (ISO). */
  mileageUpdatedAt?: string;
};

export type ReminderSettings = { enabled: boolean; maintenance: boolean; ct: boolean; mileage: boolean };
export const DEFAULT_SETTINGS: ReminderSettings = { enabled: false, maintenance: true, ct: true, mileage: true };

export type CtKind = 'premier' | 'periodique' | 'contre-visite';
export type CtDeadline = { date: string; kind: CtKind };

/** Échéance du prochain contrôle technique, ou null si on ne peut pas la connaître. */
export function ctDeadline(x: VehicleExtras | undefined, today: string = isoDate(new Date())): CtDeadline | null {
  if (!x) return null;
  if (x.lastCt && x.counterVisit) return { date: addMonths(x.lastCt, 2), kind: 'contre-visite' };
  if (x.lastCt) return { date: addMonths(x.lastCt, 24), kind: 'periodique' };
  if (x.firstRegistration) {
    const date = addMonths(x.firstRegistration, 48);
    // Véhicule de plus de 4 ans sans date de dernier contrôle : échéance inconnue.
    return date >= today ? { date, kind: 'premier' } : null;
  }
  return null;
}

export type CtStatus = 'retard' | 'bientot' | 'ok';

export function ctStatus(deadline: CtDeadline, today: string = isoDate(new Date())): CtStatus {
  if (deadline.date < today) return 'retard';
  return deadline.date <= addMonths(today, 2) ? 'bientot' : 'ok';
}

export type ReminderKind = 'maintenance' | 'ct' | 'mileage';

export type PlannedReminder = {
  /** Identifiant stable : la même échéance garde le même identifiant d'une programmation à l'autre. */
  id: string;
  kind: ReminderKind;
  at: Date;
  title: string;
  body: string;
  vehicleId?: string;
};

/** Préfixe de toutes les notifications programmées par l'app (pour les annuler sans toucher aux autres). */
export const REMINDER_PREFIX = 'cle12-reminder:';
/** iOS garde au plus 64 notifications locales programmées. */
export const MAX_REMINDERS = 40;

const MORNING = 10;
const EVENING = 18;
/** Rappels avant une échéance d'entretien datée encore lointaine. */
const MAINTENANCE_LEAD_DAYS = 30;
const CT_LEAD_DAYS: Record<CtKind, number[]> = { premier: [30, 7, 1], periodique: [30, 7, 1], 'contre-visite': [14, 3, 1] };
const MILEAGE_MONTHS_AHEAD = 3;
/** Pas de rappel de kilométrage s'il a été mis à jour il y a moins de 10 jours. */
const MILEAGE_QUIET_DAYS = 10;

/** Samedi suivant à 10 h (ou aujourd'hui si l'on est samedi avant 10 h) : un rappel hebdomadaire stable. */
export function nextSaturdayMorning(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), MORNING);
  while (d.getDay() !== 6 || d <= now) d.setDate(d.getDate() + 1);
  return d;
}

/** Les prochains 1ers du mois à 18 h. */
export function nextMonthStarts(now: Date, count: number): Date[] {
  const out: Date[] = [];
  const d = new Date(now.getFullYear(), now.getMonth(), 1, EVENING);
  while (out.length < count) {
    if (d > now) out.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

export type PlanInput = {
  vehicles: Vehicle[];
  log: LogEntry[];
  extras: Record<string, VehicleExtras>;
  settings: ReminderSettings;
  now: Date;
  t: (key: TKey, params?: Record<string, string | number>) => string;
  /** Date AAAA-MM-JJ formatée pour l'utilisateur. */
  formatDate: (iso: string) => string;
  /** Nom court du véhicule (« Peugeot 208 »). */
  label?: (v: Vehicle) => string;
};

const shortLabel = (v: Vehicle) => [v.make, v.model].filter(Boolean).join(' ') || v.plate || '';

/** Notifications à programmer, les plus proches d'abord. */
export function planReminders(input: PlanInput): PlannedReminder[] {
  const { vehicles, log, extras, settings, now, t, formatDate } = input;
  if (!settings.enabled) return [];
  const label = input.label ?? shortLabel;
  const today = isoDate(now);
  const saturday = nextSaturdayMorning(now);
  const out: PlannedReminder[] = [];

  for (const v of vehicles) {
    const vehicle = label(v);

    if (settings.maintenance) {
      const due = maintenanceDue(v, log, today);
      const urgent = due.filter((d) => d.status === 'retard' || d.status === 'bientot');
      if (urgent.length) {
        const names = urgent.slice(0, 3).map((d) => d.item.title);
        out.push({
          id: `${REMINDER_PREFIX}maintenance:${v.id}`,
          kind: 'maintenance',
          vehicleId: v.id,
          at: saturday,
          title: t('reminders.n.maintenance.title', { vehicle }),
          body: names.join(', ') + (urgent.length > names.length ? '…' : ''),
        });
      }
      for (const d of due) {
        if (d.status !== 'ok' || !d.nextDate) continue;
        const at = localDate(addDays(d.nextDate, -MAINTENANCE_LEAD_DAYS), MORNING);
        if (at <= now) continue;
        out.push({
          id: `${REMINDER_PREFIX}item:${v.id}:${d.item.id}`,
          kind: 'maintenance',
          vehicleId: v.id,
          at,
          title: t('reminders.n.item.title', { vehicle }),
          body: t('reminders.n.item.body', { item: d.item.title, date: formatDate(d.nextDate) }),
        });
      }
    }

    if (settings.ct) {
      const ct = ctDeadline(extras[v.id], today);
      if (ct) {
        const what = ct.kind === 'contre-visite' ? t('reminders.ct.counterVisit') : t('reminders.ct.ct');
        if (ct.date < today) {
          out.push({
            id: `${REMINDER_PREFIX}ct:${v.id}:late`,
            kind: 'ct',
            vehicleId: v.id,
            at: saturday,
            title: t('reminders.n.ctLate.title', { vehicle }),
            body: t('reminders.n.ctLate.body', { what, date: formatDate(ct.date) }),
          });
        } else {
          for (const lead of CT_LEAD_DAYS[ct.kind]) {
            const at = localDate(addDays(ct.date, -lead), MORNING);
            if (at <= now) continue;
            out.push({
              id: `${REMINDER_PREFIX}ct:${v.id}:${ct.date}:${lead}`,
              kind: 'ct',
              vehicleId: v.id,
              at,
              title: t('reminders.n.ct.title', { vehicle }),
              body: t('reminders.n.ct.body', { what, date: formatDate(ct.date) }),
            });
          }
        }
      }
    }
  }

  if (settings.mileage && vehicles.length) {
    const updated = vehicles
      .map((v) => extras[v.id]?.mileageUpdatedAt)
      .filter((d): d is string => !!d)
      .sort()
      .at(-1);
    for (const at of nextMonthStarts(now, MILEAGE_MONTHS_AHEAD)) {
      if (updated && at.getTime() - new Date(updated).getTime() < MILEAGE_QUIET_DAYS * 86_400_000) continue;
      out.push({
        id: `${REMINDER_PREFIX}mileage:${isoDate(at)}`,
        kind: 'mileage',
        at,
        title: t('reminders.n.mileage.title'),
        body: t('reminders.n.mileage.body'),
      });
    }
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id)).slice(0, MAX_REMINDERS);
}

/** Empreinte d'un plan : inutile de reprogrammer si elle n'a pas changé. */
export const planSignature = (plan: PlannedReminder[]) =>
  JSON.stringify(plan.map((r) => [r.id, r.at.getTime(), r.title, r.body]));

/** Accès minimal au planificateur de notifications du système (injecté : testable sans module natif). */
export type SchedulerAdapter = {
  /** Identifiants des notifications programmées (de l'app et d'ailleurs). */
  scheduledIds: () => Promise<string[]>;
  cancel: (id: string) => Promise<void>;
  schedule: (reminder: PlannedReminder) => Promise<void>;
};

/**
 * Remplace les rappels programmés par l'app par ceux du plan. Idempotent : sans
 * changement du plan (même empreinte, mêmes identifiants programmés), rien
 * n'est touché ; sinon, les anciens rappels de l'app sont annulés avant de
 * programmer les nouveaux. Les notifications qui ne viennent pas de l'app
 * (autre préfixe) ne sont jamais annulées.
 */
export async function syncScheduled(
  adapter: SchedulerAdapter,
  plan: PlannedReminder[],
  lastSignature: string | null,
): Promise<{ signature: string; changed: boolean }> {
  const signature = planSignature(plan);
  const ours = (await adapter.scheduledIds()).filter((id) => id.startsWith(REMINDER_PREFIX));
  const ids = new Set(ours);
  if (signature === lastSignature && ours.length === plan.length && plan.every((r) => ids.has(r.id))) {
    return { signature, changed: false };
  }
  for (const id of ours) await adapter.cancel(id);
  for (const r of plan) await adapter.schedule(r);
  return { signature, changed: true };
}
