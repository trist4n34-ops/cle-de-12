/**
 * Garde les notifications programmées en accord avec le garage : à chaque
 * changement (véhicules, carnet, réglages, langue) et au retour dans l'app.
 * Monté une fois, dans les onglets de l'app mobile.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useT } from '@/i18n';
import { localDate } from '@/lib/garage';
import { applyReminders, listenReminderTaps, notificationPermission } from '@/lib/reminder-scheduler';
import { useReminderData } from '@/lib/reminder-store';
import { planReminders } from '@/lib/reminders';
import { useStore } from '@/lib/store';

const DEBOUNCE_MS = 800;

export function useReminderSync() {
  const { state } = useStore();
  const { t, date } = useT();
  const { settings, extras, ready } = useReminderData();
  const [wake, setWake] = useState(0);

  useEffect(() => listenReminderTaps(() => router.push('/garage')), []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setWake((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const channel = t('reminders.title');
    const timer = setTimeout(async () => {
      try {
        if (settings.enabled && (await notificationPermission(false, channel)) !== 'granted') return;
        const plan = planReminders({
          vehicles: state.vehicles,
          log: state.log,
          extras,
          settings,
          now: new Date(),
          t,
          formatDate: (iso) => date(localDate(iso, 12)),
        });
        await applyReminders(plan, channel);
      } catch {
        // Planificateur indisponible (Expo Go, simulateur…) : on réessaiera au prochain changement.
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [ready, settings, extras, state.vehicles, state.log, t, date, wake]);
}
