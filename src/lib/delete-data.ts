/**
 * « Supprimer mes données » (exigence Google Play) : efface les données du
 * serveur liées à la session, annule les rappels programmés, puis efface tout
 * ce que l'app a enregistré sur l'appareil. Le store est remis à neuf par
 * l'écran appelant (freshState), la langue choisie est gardée.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api, clearApiSession } from '@/lib/api';
import { applyReminders } from '@/lib/reminder-scheduler';
import { resetReminderData } from '@/lib/reminder-store';

/** Toutes les clés AsyncStorage de l'app. */
export const LOCAL_KEYS = ['cle12:state:v1', 'cle12:reminders:v1', 'cle12:reminders:scheduled', 'cle12:obd:last-dongle'] as const;

/**
 * Sans session enregistrée, le serveur n'a rien sur cet appareil : on ne
 * l'appelle pas (sinon on créerait une session juste pour la supprimer).
 * Une erreur serveur arrête tout avant d'effacer l'appareil, pour que
 * l'utilisateur puisse réessayer avec la même session.
 */
export async function deleteMyData({ hasServerSession }: { hasServerSession: boolean }): Promise<void> {
  if (hasServerSession) await api.deleteMyData();
  await applyReminders([], '').catch(() => undefined);
  await AsyncStorage.multiRemove([...LOCAL_KEYS]).catch(() => undefined);
  resetReminderData();
  clearApiSession();
}
