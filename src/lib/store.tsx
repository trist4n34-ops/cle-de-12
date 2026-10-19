/**
 * État de l'app persisté sur l'appareil (AsyncStorage). La synchronisation
 * avec un compte en ligne viendra remplacer ce stockage local.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { DiagnosisRecord, Vehicle } from '@/lib/diagnosis';

// Définis dans un module sans dépendance, partagé avec le serveur qui les applique.
export { FREE_CT_REPORTS_PER_MONTH, FREE_DIAGNOSES_PER_MONTH, FREE_QUOTES_PER_MONTH } from '@/lib/quotas';

export type LogEntry = { id: string; vehicleId: string; date: string; mileage: string; operation: string };

export type AppState = {
  /** Ancien identifiant tiré par l'app. Conservé pour compatibilité, il n'est plus envoyé au serveur. */
  userId: string;
  /**
   * Session signée par le serveur (/api/session). `session.userId` est l'identité
   * reconnue par le serveur et l'appUserID RevenueCat.
   */
  session?: { userId: string; token: string };
  vehicles: Vehicle[];
  vehicleId: string | null;
  history: DiagnosisRecord[];
  log: LogEntry[];
  /** Étapes cochées par guide. */
  progress: Record<string, boolean[]>;
  usage: { month: string; diagnoses: number; quotes: number; ct: number };
  /** Diagnostics achetés à l'unité (offre « une panne »), utilisés après le quota gratuit. */
  credits: number;
  /** Premium simulé, utilisé quand aucun compte RevenueCat n'est configuré. */
  demoPremium: boolean;
  /** Langue choisie par l'utilisateur (fr, en…). Absente : langue de l'appareil. */
  language?: string;
};

const KEY = 'cle12:state:v1';
const month = () => new Date().toISOString().slice(0, 7);

function initialState(): AppState {
  return {
    userId: randomUUID(),
    vehicles: [],
    vehicleId: null,
    history: [],
    log: [],
    progress: {},
    usage: { month: month(), diagnoses: 0, quotes: 0, ct: 0 },
    credits: 0,
    demoPremium: false,
  };
}

type Store = {
  state: AppState;
  ready: boolean;
  update: (fn: (s: AppState) => AppState) => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setState((s) => ({ ...s, ...(JSON.parse(raw) as Partial<AppState>) }));
      })
      .catch(() => undefined)
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => undefined);
  }, [state]);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState((s) => {
      const next = fn(s);
      // Le compteur gratuit repart le 1er du mois.
      return next.usage.month === month() ? next : { ...next, usage: { month: month(), diagnoses: 0, quotes: 0, ct: 0 } };
    });
  }, []);

  const value = useMemo(() => ({ state, ready, update }), [state, ready, update]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore hors de StoreProvider');
  return store;
}

export function useCurrentVehicle(): Vehicle | undefined {
  const { state } = useStore();
  return state.vehicles.find((v) => v.id === state.vehicleId) ?? state.vehicles[0];
}

export function usage(state: AppState) {
  const fresh = state.usage.month === month();
  return {
    diagnoses: fresh ? state.usage.diagnoses : 0,
    quotes: fresh ? state.usage.quotes : 0,
    ct: fresh ? (state.usage.ct ?? 0) : 0,
  };
}

export const newId = () => randomUUID();
