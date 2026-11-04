import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ApiErrorNotice } from '@/components/api-error-notice';
import { DiagnosisView } from '@/components/diagnosis-view';
import { KnownIssues } from '@/components/known-issues';
import { LiveData } from '@/components/live-data';
import { NoiseFinder } from '@/components/noise-finder';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, Eyebrow, Field, LockBox, Row, Screen, Tag, Title } from '@/components/ui';
import { VehicleCard } from '@/components/vehicle-editor';
import { Spacing } from '@/constants/theme';
import { extractCodes } from '@/data/obd-codes';
import { SYMPTOMS } from '@/data/symptoms';
import { useObdReader } from '@/features/obd/use-obd-reader';
import { RunInput, useDiagnosisRunner } from '@/hooks/use-diagnosis-runner';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { latestForVehicle, recordVehicle } from '@/lib/diagnosis';
import { pickPhoto } from '@/lib/photo';
import { usePremium } from '@/lib/purchases';
import { FREE_DIAGNOSES_PER_MONTH, newId, useCurrentVehicle, useStore } from '@/lib/store';

export default function DiagnosticScreen() {
  const { state, update } = useStore();
  const { t, tn } = useT();
  const theme = useTheme();
  const { isPremium, buyCredit, creditPrice } = usePremium();
  const [buying, setBuying] = useState(false);
  const vehicle = useCurrentVehicle();
  const obd = useObdReader();
  const runner = useDiagnosisRunner();
  const { left, credits, useCredit, blocked, note, setNote } = runner;
  // « Relancer » depuis un diagnostic : /?retry=<id>&at=<horodatage> (prérempli), &auto=1 (relancé aussitôt).
  const params = useLocalSearchParams<{ retry?: string; auto?: string; at?: string }>();

  const [symptoms, setSymptoms] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [codesText, setCodesText] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Seul le dernier diagnostic du véhicule affiché, jamais celui d'une autre voiture.
  const latest = latestForVehicle(state.history, vehicle?.id, state.vehicles.length);

  const scanned = obd.scan ? [...obd.scan.stored, ...obd.scan.pending] : [];
  const codes = [...new Set([...extractCodes(codesText), ...scanned])];

  const toggle = (id: string) => setTags((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const { run: runDiagnosis } = runner;
  /** Lance le diagnostic puis ouvre son résultat (IA, ou base intégrée sans réseau). */
  const launch = useCallback(
    async (input: RunInput) => {
      const record = await runDiagnosis(input);
      if (record) router.push(`/result/${record.id}`);
    },
    [runDiagnosis],
  );

  const run = () => {
    if (!vehicle || blocked) return;
    if (!symptoms.trim() && !tags.length && !codes.length) {
      setNote(t('diag.needInput'));
      return;
    }
    const v = obd.scan?.vin && !vehicle.vin ? { ...vehicle, vin: obd.scan.vin } : vehicle;
    void launch({
      vehicle: v,
      symptoms,
      symptomTags: tags.map((id) => SYMPTOMS.find((s) => s.id === id)?.label ?? id),
      tagIds: tags,
      codes,
      photo: photo ?? undefined,
    });
  };

  // Formulaire prérempli dès le rendu (motif « état dérivé d'une nouvelle prop »).
  const record = params.retry ? state.history.find((h) => h.id === params.retry) : undefined;
  const retryKey = record ? `${record.id}:${params.at ?? ''}` : null;
  const [prefilled, setPrefilled] = useState<string | null>(null);
  if (record && retryKey && retryKey !== prefilled) {
    setPrefilled(retryKey);
    setSymptoms(record.symptoms);
    setTags([]);
    setCodesText(record.codes.join(' '));
  }
  // Puis, une seule fois par demande : véhicule du diagnostic, relance éventuelle.
  const handledRetry = useRef<string | null>(null);
  useEffect(() => {
    if (!record || !retryKey || handledRetry.current === retryKey) return;
    handledRetry.current = retryKey;
    router.setParams({ retry: undefined, auto: undefined, at: undefined });
    const v = recordVehicle(record, state.vehicles, vehicle);
    if (v && v.id !== vehicle?.id && state.vehicles.some((x) => x.id === v.id)) update((s) => ({ ...s, vehicleId: v.id }));
    if (params.auto === '1' && v) {
      void launch({
        vehicle: v,
        symptoms: record.symptoms,
        symptomTags: [],
        tagIds: [],
        codes: record.codes,
        // Le résultat IA remplace le diagnostic hors ligne dans l'historique.
        replaces: record.source === 'offline' ? record.id : undefined,
      });
    } else {
      setNote(t('diag.retried'));
    }
  }, [record, retryKey, params.auto, state.vehicles, vehicle, update, launch, setNote, t]);

  // Codes en cours d'effacement : notés dans le carnet une fois l'effacement confirmé par le dongle.
  const clearing = useRef<string[] | null>(null);
  useEffect(() => {
    const cleared = clearing.current;
    if (!cleared) return;
    if (obd.status === 'error') clearing.current = null;
    if (obd.status !== 'done' || obd.scan) return;
    clearing.current = null;
    if (!vehicle || !cleared.length) return;
    const entry = {
      id: newId(),
      vehicleId: vehicle.id,
      date: new Date().toISOString(),
      mileage: vehicle.mileage ?? '',
      operation: t('diag.clear.log', { codes: cleared.join(', ') }),
    };
    update((s) => ({ ...s, log: [entry, ...s.log] }));
  }, [obd.status, obd.scan, vehicle, update, t]);

  const clearCodes = () => {
    setConfirmClear(false);
    // Les codes lus restent dans le formulaire : on peut encore les diagnostiquer après effacement.
    setCodesText((text) => [...new Set([...extractCodes(text), ...scanned])].join(' '));
    clearing.current = scanned;
    void obd.clear();
  };

  return (
    <Screen>
      <Title lede={t('diag.lede')}>{t('diag.title')}</Title>

      <VehicleCard />

      {vehicle ? <KnownIssues vehicle={vehicle} /> : null}

      {vehicle ? (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Eyebrow>{t('diag.codes.eyebrow')}</Eyebrow>
            <Tag label={t('diag.codes.dongle')} />
          </Row>
          {Platform.OS !== 'web' ? (
            <Row>
              <Button
                label={t('diag.codes.read')}
                loading={obd.status === 'searching' || obd.status === 'reading'}
                onPress={obd.read}
              />
              {obd.scan && !confirmClear ? (
                <Button kind="ghost" label={t('diag.codes.clear')} onPress={() => setConfirmClear(true)} />
              ) : null}
            </Row>
          ) : null}
          {confirmClear ? (
            <View style={[styles.confirm, { backgroundColor: theme.warnBg, borderLeftColor: theme.warn }]}>
              <ThemedText type="smallBold">{t('diag.clear.title')}</ThemedText>
              <ThemedText type="small">{t('diag.clear.body')}</ThemedText>
              <Row>
                <Button kind="ghost" label={t('diag.clear.confirm')} onPress={clearCodes} />
                <Button kind="ghost" label={t('diag.clear.cancel')} onPress={() => setConfirmClear(false)} />
              </Row>
            </View>
          ) : null}
          {obd.message ? <ThemedText type="small">{obd.message}</ThemedText> : null}
          {obd.scan?.milOn ? <ThemedText type="small">{t('diag.codes.mil')}</ThemedText> : null}
          <Field
            label={t('diag.codes.manual')}
            placeholder="P0301, P0171"
            autoCapitalize="characters"
            value={codesText}
            onChangeText={setCodesText}
          />
          {codes.length ? <ThemedText type="code">{codes.join('  ')}</ThemedText> : null}
        </Card>
      ) : null}

      {vehicle && Platform.OS !== 'web' ? (
        isPremium ? (
          <LiveData obd={obd} />
        ) : (
          <Card>
            <Eyebrow>{t('live.title')}</Eyebrow>
            <LockBox text={t('diag.live.locked')} onUnlock={() => router.push('/premium')} />
          </Card>
        )
      ) : null}

      {vehicle ? <NoiseFinder onAdd={(sentence) => setSymptoms((t) => (t ? `${t}\n${sentence}` : sentence))} /> : null}

      {vehicle ? (
        <Card>
          <Eyebrow>{t('diag.symptoms.eyebrow')}</Eyebrow>
          <Row>
            {SYMPTOMS.map((s) => (
              <Chip key={s.id} label={s.label} selected={tags.includes(s.id)} onPress={() => toggle(s.id)} />
            ))}
          </Row>
          <Field
            label={t('diag.symptoms.label')}
            placeholder={t('diag.symptoms.placeholder')}
            multiline
            value={symptoms}
            onChangeText={setSymptoms}
          />
          {isPremium ? (
            <Row>
              <Button kind="ghost" label={photo ? t('diag.photo.added') : t('diag.photo.add')} onPress={async () => setPhoto(await pickPhoto('library'))} />
              {Platform.OS !== 'web' ? <Button kind="ghost" label={t('diag.photo.take')} onPress={async () => setPhoto(await pickPhoto('camera'))} /> : null}
            </Row>
          ) : null}
          {blocked ? (
            <>
              <LockBox
                text={t('diag.quota.locked', { count: FREE_DIAGNOSES_PER_MONTH })}
                onUnlock={() => router.push('/premium')}
              />
              <Row>
                <Button
                  kind="ghost"
                  loading={buying}
                  label={t('diag.buyOne', { price: creditPrice })}
                  onPress={async () => {
                    setBuying(true);
                    try {
                      if (!(await buyCredit())) setNote(t('common.purchaseCancelled'));
                    } catch {
                      setNote(t('common.paymentFailed'));
                    } finally {
                      setBuying(false);
                    }
                  }}
                />
              </Row>
            </>
          ) : (
            <Row>
              <Button label={t('diag.run')} loading={runner.running} onPress={run} />
              <ThemedText type="small" themeColor="textSecondary">
                {isPremium
                  ? t('diag.unlimited')
                  : useCredit
                    ? tn('diag.purchased', credits)
                    : tn('diag.freeLeft', left)}
              </ThemedText>
            </Row>
          )}
          {runner.running ? (
            <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
              {t(runner.progress)}
            </ThemedText>
          ) : null}
          {runner.failure ? <ApiErrorNotice error={runner.failure} credit onPurchased={runner.clearFailure} /> : null}
          {note ? <ThemedText type="small" themeColor="textSecondary">{note}</ThemedText> : null}
        </Card>
      ) : null}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, minWidth: 200, gap: Spacing.one }}>
            <ThemedText type="smallBold">{t('quote.title')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('diag.quoteCard.body')}
            </ThemedText>
          </View>
          <Button kind="ghost" label={t('diag.quoteCard.button')} onPress={() => router.push('/devis')} />
        </Row>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, minWidth: 200, gap: Spacing.one }}>
            <ThemedText type="smallBold">{t('ct.title')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('diag.ctCard.body')}
            </ThemedText>
          </View>
          <Button kind="ghost" label={t('diag.ctCard.button')} onPress={() => router.push('/controle-technique')} />
        </Row>
      </Card>

      {latest ? <DiagnosisView key={latest.id} record={latest} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  confirm: { borderLeftWidth: 6, borderRadius: 10, padding: Spacing.three, gap: Spacing.two },
});
