/**
 * Quotas gratuits par mois. Module sans dépendance pour être importé à la fois
 * par l'app (via store.tsx) et par le serveur (src/server/limits.ts), qui les
 * fait respecter.
 */
export const FREE_DIAGNOSES_PER_MONTH = 3;
export const FREE_QUOTES_PER_MONTH = 1;
export const FREE_CT_REPORTS_PER_MONTH = 1;
