/** Échéance du contrôle technique d'un véhicule (garage et fiche du véhicule). */
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { type TKey, useT } from '@/i18n';
import type { Vehicle } from '@/lib/diagnosis';
import { isoDate, localDate } from '@/lib/garage';
import { useReminderData } from '@/lib/reminder-store';
import { ctDeadline, type CtStatus, ctStatus } from '@/lib/reminders';

/** Date AAAA-MM-JJ affichée dans la langue de l'app (à midi : pas de décalage de fuseau). */
export function useDay() {
  const { date } = useT();
  return (iso: string) => date(localDate(iso, 12));
}

const CT_STATUS = {
  retard: { label: 'reminders.ct.status.retard', color: 'stop' },
  bientot: { label: 'reminders.ct.status.bientot', color: 'warn' },
  ok: { label: 'reminders.ct.status.ok', color: 'textSecondary' },
} as const satisfies Record<CtStatus, { label: TKey; color: 'stop' | 'warn' | 'textSecondary' }>;

/** « Contrôle technique avant le … », en couleur à l'approche ; sans date connue, comment l'obtenir. */
export function CtLine({ vehicle, hideUnknown }: { vehicle: Vehicle; hideUnknown?: boolean }) {
  const theme = useTheme();
  const { t } = useT();
  const day = useDay();
  const { extras } = useReminderData();
  const today = isoDate(new Date());
  const ct = ctDeadline(extras[vehicle.id], today);
  if (!ct) {
    return hideUnknown ? null : (
      <ThemedText type="small" themeColor="textSecondary">
        {t('reminders.ct.unknown')}
      </ThemedText>
    );
  }
  const st = CT_STATUS[ctStatus(ct, today)];
  const what = ct.kind === 'contre-visite' ? t('reminders.ct.counterVisit') : t('reminders.ct.ct');
  return (
    <ThemedText type="small" style={{ color: theme[st.color], fontWeight: st.color === 'textSecondary' ? undefined : 700 }}>
      {t(st.label, { what, date: day(ct.date) })}
    </ThemedText>
  );
}
