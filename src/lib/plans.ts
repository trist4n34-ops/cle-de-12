/** Formules d'abonnement Premium proposées à l'écran (mensuelle, annuelle). */
import type { PurchasesPackage } from 'react-native-purchases';

export type PlanId = 'monthly' | 'annual';

export type Plan = {
  id: PlanId;
  /** Prix affiché tel que le store le formate (« 6,99 € »). */
  price: string;
  /** Équivalent mensuel de l'annuel (« 4,08 € »). */
  perMonth?: string;
  pkg?: PurchasesPackage;
};

/** Prix de démonstration, alignés sur ceux du store. */
export const DEMO_PRICES = { monthly: 6.99, annual: 49 };

/** Économie de l'annuel par rapport à 12 mois au mensuel, en pourcentage entier. */
export function annualSavings(monthly: number, annual: number): number | null {
  if (!(monthly > 0) || !(annual > 0)) return null;
  const pct = Math.round((1 - annual / (monthly * 12)) * 100);
  return pct > 0 ? pct : null;
}

/** Formules mensuelle et annuelle de l'offre RevenueCat courante (paquets $rc_monthly et $rc_annual). */
export function plansFrom(packages: PurchasesPackage[]): { plans: Plan[]; savings: number | null } {
  const monthly = packages.find((p) => String(p.packageType) === 'MONTHLY');
  const annual = packages.find((p) => String(p.packageType) === 'ANNUAL');
  const plans: Plan[] = [];
  if (monthly) plans.push({ id: 'monthly', price: monthly.product.priceString, pkg: monthly });
  if (annual)
    plans.push({ id: 'annual', price: annual.product.priceString, perMonth: annual.product.pricePerMonthString ?? undefined, pkg: annual });
  return { plans, savings: monthly && annual ? annualSavings(monthly.product.price, annual.product.price) : null };
}
