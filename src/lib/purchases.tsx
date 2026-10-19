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

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  web: process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY,
});

export const DEMO_MODE = !API_KEY;

type PremiumState = {
  isPremium: boolean;
  demo: boolean;
  packages: PurchasesPackage[];
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  setDemo: (on: boolean) => void;
};

const PremiumContext = createContext<PremiumState | null>(null);

const hasEntitlement = (info: CustomerInfo) => !!info.entitlements.active[ENTITLEMENT];

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { state, ready, update } = useStore();
  const [paid, setPaid] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);

  useEffect(() => {
    if (DEMO_MODE || !ready || !API_KEY) return;
    Purchases.configure({ apiKey: API_KEY, appUserID: state.userId });
    const listener = (info: CustomerInfo) => setPaid(hasEntitlement(info));
    Purchases.addCustomerInfoUpdateListener(listener);
    Purchases.getCustomerInfo().then(listener).catch(() => undefined);
    Purchases.getOfferings()
      .then((o) => setPackages(o.current?.availablePackages ?? []))
      .catch(() => undefined);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
    // L'identifiant utilisateur est fixé au premier lancement.
  }, [ready, state.userId]);

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
    const info = await Purchases.restorePurchases();
    setPaid(hasEntitlement(info));
    return hasEntitlement(info);
  }, []);

  const setDemo = useCallback((on: boolean) => update((s) => ({ ...s, demoPremium: on })), [update]);

  const value = useMemo<PremiumState>(
    () => ({
      isPremium: DEMO_MODE ? state.demoPremium : paid,
      demo: DEMO_MODE,
      packages,
      purchase,
      restore,
      setDemo,
    }),
    [state.demoPremium, paid, packages, purchase, restore, setDemo],
  );
  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium(): PremiumState {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium hors de PremiumProvider');
  return ctx;
}
