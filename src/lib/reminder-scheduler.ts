/**
 * Notifications locales des rappels (iOS et Android) via expo-notifications.
 * Aucune notification push : tout est programmé sur l'appareil.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { type PlannedReminder, REMINDER_PREFIX, syncScheduled, type SchedulerAdapter } from '@/lib/reminders';

export const remindersSupported = true;

const CHANNEL = 'reminders';
const SIGNATURE_KEY = 'cle12:reminders:scheduled';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

/** Android 13+ exige un canal avant de demander l'autorisation ; le nom est celui affiché dans les réglages. */
async function ensureChannel(name: string) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, { name, importance: AndroidImportance.DEFAULT });
}

/** État de l'autorisation ; `ask` ne la demande qu'à l'activation des rappels. */
export async function notificationPermission(ask: boolean, channelName: string): Promise<PermissionState> {
  await ensureChannel(channelName);
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!ask) return current.status === 'undetermined' ? 'undetermined' : 'denied';
  if (!current.canAskAgain) return 'denied';
  const res = await Notifications.requestPermissionsAsync();
  return res.granted ? 'granted' : 'denied';
}

const adapter: SchedulerAdapter = {
  scheduledIds: async () => (await Notifications.getAllScheduledNotificationsAsync()).map((n) => n.identifier),
  cancel: (id) => Notifications.cancelScheduledNotificationAsync(id),
  schedule: async (r: PlannedReminder) => {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, data: { url: '/garage' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
    });
  },
};

// Les programmations se suivent : deux appels rapprochés ne se mélangent pas.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/** Programme exactement le plan donné (un plan vide annule les rappels de l'app). */
export function applyReminders(plan: PlannedReminder[], channelName: string): Promise<boolean> {
  return serial(async () => {
    if (plan.length) await ensureChannel(channelName);
    const last = await AsyncStorage.getItem(SIGNATURE_KEY).catch(() => null);
    const { signature, changed } = await syncScheduled(adapter, plan, last);
    if (changed) await AsyncStorage.setItem(SIGNATURE_KEY, signature).catch(() => undefined);
    return changed;
  });
}

let handlerSet = false;

/** Affiche les rappels même app ouverte, et ouvre le garage quand on touche l'un d'eux. */
export function listenReminderTaps(onOpen: () => void): () => void {
  if (!handlerSet) {
    handlerSet = true;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }
  const ours = (r: Notifications.NotificationResponse | null) => !!r?.notification.request.identifier.startsWith(REMINDER_PREFIX);
  // App lancée par un rappel.
  Notifications.getLastNotificationResponseAsync()
    .then((r) => {
      if (!ours(r)) return;
      onOpen();
      return Notifications.clearLastNotificationResponseAsync();
    })
    .catch(() => undefined);
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    if (ours(r)) onOpen();
  });
  return () => sub.remove();
}
