/**
 * Abonnement Premium via RevenueCat (App Store, Google Play et web avec la même
 * logique). Sans clé publique configurée, l'app passe en mode démo : Premium se
 * débloque gratuitement sur l'appareil, pour tester.
 */
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

import { useStore } from '@/lib/store';

export const ENTITLEMENT = 'premium';
/** Paquet RevenueCat du diagnostic à l'unité (produit consommable à 2,99 €). */
export const CREDIT_PACKAGE = 'diag_unit';
export const CREDIT_PRICE = '2,99 €';

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  web: process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY,
});

export const DEMO_MODE = !API_KEY;

type PremiumState = {
  isPremium: boolean;
  demo: boolean;
  /** Abonnements proposés (mensuel, annuel). */
  packages: PurchasesPackage[];
  /** Achète un diagnostic à l'unité ; renvoie true si le crédit est ajouté. */
  buyCredit: () => Promise<boolean>;
  creditPrice: string;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  setDemo: (on: boolean) => void;
};

const PremiumContext = createContext<PremiumState | null>(null);

const hasEntitlement = (info: CustomerInfo) => !!info.entitlements.active[ENTITLEMENT];

/** Identifiant avec lequel le SDK RevenueCat (un singleton) a été configuré. */
let rcUserId: string | null = null;

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { state, ready, update } = useStore();
  const [paid, setPaid] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);

  // RevenueCat est configuré une seule fois, avec l'identifiant de la session
  // signée par le serveur : c'est celui que le serveur vérifie auprès de RevenueCat.
  const sessionUserId = state.session?.userId;
  const configured = !DEMO_MODE && ready && !!API_KEY && !!sessionUserId;

  useEffect(() => {
    if (!configured || !API_KEY || !sessionUserId || sessionUserId === rcUserId) return;
    if (rcUserId === null) {
      Purchases.configure({ apiKey: API_KEY, appUserID: sessionUserId });
    } else {
      // Session recréée par le serveur : on bascule RevenueCat sur le nouvel identifiant.
      // « Restaurer les achats » rattache ensuite l'abonnement du store à ce compte.
      Purchases.logIn(sessionUserId)
        .then(({ customerInfo }) => setPaid(hasEntitlement(customerInfo)))
        .catch(() => undefined);
    }
    rcUserId = sessionUserId;
  }, [configured, sessionUserId]);

  useEffect(() => {
    if (!configured) return;
    const listener = (info: CustomerInfo) => setPaid(hasEntitlement(info));
    Purchases.addCustomerInfoUpdateListener(listener);
    Purchases.getCustomerInfo().then(listener).catch(() => undefined);
    Purchases.getOfferings()
      .then((o) => setPackages(o.current?.availablePackages ?? []))
      .catch(() => undefined);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [configured]);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      setPaid(hasEntitlement(customerInfo));
      return hasEntitlement(customerInfo);
    } catch (e) {
      if ((e as { userCancelled?: boolean }).userCancelled) return false;
      throw e;
    }
  }, []);

  const restore = useCallback(async () => {
    // Sans session (premier lancement hors ligne), RevenueCat n'est pas encore configuré.
    if (!configured) throw new Error('Connectez-vous à internet puis réessayez.');
    const info = await Purchases.restorePurchases();
    setPaid(hasEntitlement(info));
    return hasEntitlement(info);
  }, [configured]);

  const credit = packages.find((p) => p.identifier === CREDIT_PACKAGE);

  const buyCredit = useCallback(async () => {
    const add = () => update((s) => ({ ...s, credits: (s.credits ?? 0) + 1 }));
    if (DEMO_MODE) {
      add();
      return true;
    }
    if (!credit) return false;
    try {
      await Purchases.purchasePackage(credit);
      add();
      return true;
    } catch (e) {
      if ((e as { userCancelled?: boolean }).userCancelled) return false;
      throw e;
    }
  }, [credit, update]);

  const setDemo = useCallback((on: boolean) => update((s) => ({ ...s, demoPremium: on })), [update]);

  const value = useMemo<PremiumState>(
    () => ({
      isPremium: DEMO_MODE ? state.demoPremium : paid,
      demo: DEMO_MODE,
      packages: packages.filter((p) => p.identifier !== CREDIT_PACKAGE),
      buyCredit,
      creditPrice: credit?.product.priceString ?? CREDIT_PRICE,
      purchase,
      restore,
      setDemo,
    }),
    [state.demoPremium, paid, packages, buyCredit, credit, purchase, restore, setDemo],
  );
  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium(): PremiumState {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium hors de PremiumProvider');
  return ctx;
}
