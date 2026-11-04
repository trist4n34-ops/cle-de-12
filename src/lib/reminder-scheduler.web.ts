/** Sur le web, pas de notifications locales programmées : les rappels sont réservés aux apps mobiles. */
import type { PlannedReminder } from '@/lib/reminders';

export const remindersSupported = false;

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export const notificationPermission = async (_ask: boolean, _channelName: string): Promise<PermissionState> => 'denied';
export const applyReminders = async (_plan: PlannedReminder[], _channelName: string): Promise<boolean> => false;
export const listenReminderTaps = (_onOpen: () => void) => () => undefined;
