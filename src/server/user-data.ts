/**
 * Suppression des données serveur d'un utilisateur (exigence Google Play) :
 * ses avis sur les guides, retirés des moyennes publiques. Les clés sont
 * connues d'avance : aucun parcours de la base (SCAN).
 *
 * Gardés volontairement : les compteurs de quota du mois (ils expirent au plus
 * un jour après la fin du mois), les crédits consommés (suivi des achats) et
 * les compteurs de débit (`rl:*`, moins d'une heure). Ce sont des nombres liés
 * à un identifiant de session aléatoire, sans contenu ; les effacer laisserait
 * une suppression remettre à zéro le quota gratuit ou réutiliser des crédits
 * déjà payés. La politique de confidentialité le dit.
 */
import { deleteUserFeedback } from '@/server/guide-feedback';
import type { UsageStore } from '@/server/usage-store';

export async function deleteUserData(
  store: UsageStore,
  userId: string,
  guideIds: readonly string[],
): Promise<{ deleted: true }> {
  await deleteUserFeedback(store, userId, guideIds);
  return { deleted: true };
}
