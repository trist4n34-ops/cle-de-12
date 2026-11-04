/**
 * Lancement d'un diagnostic : appel à l'IA, repli sur la base intégrée sans
 * réseau ou si le serveur est en panne (jamais pour un refus : quota, débit,
 * session), enregistrement dans l'historique et décompte du quota.
 */
import { useEffect, useState } from 'react';

import { useT } from '@/i18n';
import { errorText } from '@/i18n/errors';
import { api, shouldFallbackOffline, stripId } from '@/lib/api';
import { DiagnosisRecord, DiagnosisRequest, Vehicle, vehicleLabel } from '@/lib/diagnosis';
import { localDiagnosis } from '@/lib/local-diagnosis';
import { usePremium } from '@/lib/purchases';
import { FREE_DIAGNOSES_PER_MONTH, newId, usage, useStore } from '@/lib/store';

/** Étapes affichées pendant l'attente (20 à 60 s), une toutes les quelques secondes. */
export const PROGRESS_STEPS = [
  'diag.progress.codes',
  'diag.progress.known',
  'diag.progress.symptoms',
  'diag.progress.costs',
  'diag.progress.writing',
] as const;
const STEP_MS = 6000;

export type RunInput = {
  vehicle: Vehicle;
  symptoms: string;
  /** Libellés des symptômes cochés (envoyés à l'IA). */
  symptomTags: string[];
  /** Identifiants des symptômes cochés (base intégrée). */
  tagIds: string[];
  codes: string[];
  photo?: string;
  /** Diagnostic hors ligne que ce diagnostic IA remplace. */
  replaces?: string;
};

export function useDiagnosisRunner() {
  const { state, update } = useStore();
  const i18n = useT();
  const { isPremium } = usePremium();
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [failure, setFailure] = useState<unknown>(null);
  const [note, setNote] = useState('');

  const left = Math.max(0, FREE_DIAGNOSES_PER_MONTH - usage(state).diagnoses);
  const credits = state.credits ?? 0;
  // Après le quota gratuit, un diagnostic acheté à l'unité prend le relais.
  const useCredit = !isPremium && left === 0 && credits > 0;
  const blocked = !isPremium && left === 0 && credits === 0;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1)), STEP_MS);
    return () => clearInterval(id);
  }, [running]);

  /** Renvoie le diagnostic enregistré, ou null (rien à analyser, quota, refus du serveur). */
  const run = async (input: RunInput): Promise<DiagnosisRecord | null> => {
    if (running || blocked) return null;
    const { vehicle: v, codes } = input;
    const req: DiagnosisRequest = {
      vehicle: stripId(v),
      symptoms: input.symptoms.trim(),
      symptomTags: input.symptomTags,
      codes,
      photo: isPremium ? input.photo : undefined,
    };
    setRunning(true);
    setStep(0);
    setNote('');
    setFailure(null);
    const base = {
      id: newId(),
      date: new Date().toISOString(),
      vehicleLabel: vehicleLabel(v),
      vehicleId: v.id,
      vehicle: v,
      symptoms: req.symptoms || req.symptomTags.join(', '),
      codes,
    };
    let record: DiagnosisRecord | null = null;
    try {
      record = { ...base, result: await api.diagnose(req), source: 'ai' };
    } catch (e) {
      if (shouldFallbackOffline(e)) {
        setNote(i18n.t('diag.offlineFallback', { reason: errorText(e, i18n, i18n.t('diag.aiDown')) }));
        record = { ...base, result: localDiagnosis({ ...req, symptomTags: input.tagIds }), source: 'offline' };
      } else {
        setFailure(e);
      }
    } finally {
      setRunning(false);
    }
    if (!record) return null;
    const saved = record;
    const replaced = saved.source === 'ai' ? input.replaces : undefined;
    update((s) => ({
      ...s,
      vehicles: s.vehicles.map((x) => (x.id === v.id ? v : x)),
      history: [saved, ...s.history.filter((h) => h.id !== replaced)].slice(0, 50),
      usage: { ...s.usage, diagnoses: s.usage.diagnoses + (isPremium || useCredit || saved.source === 'offline' ? 0 : 1) },
      credits: useCredit && saved.source === 'ai' ? Math.max(0, (s.credits ?? 0) - 1) : (s.credits ?? 0),
    }));
    return saved;
  };

  return {
    run,
    running,
    /** Clé de l'étape à afficher pendant l'attente. */
    progress: PROGRESS_STEPS[step],
    /** Refus du serveur (quota, débit, session…), sans résultat hors ligne. */
    failure,
    clearFailure: () => setFailure(null),
    note,
    setNote,
    left,
    credits,
    useCredit,
    blocked,
  };
}
