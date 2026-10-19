import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';

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
import { useT } from '@/i18n';
import { api, ApiError, stripId } from '@/lib/api';
import { DiagnosisRecord, DiagnosisRequest, vehicleLabel } from '@/lib/diagnosis';
import { localDiagnosis } from '@/lib/local-diagnosis';
import { pickPhoto } from '@/lib/photo';
import { usePremium } from '@/lib/purchases';
import { FREE_DIAGNOSES_PER_MONTH, newId, usage, useCurrentVehicle, useStore } from '@/lib/store';

export default function DiagnosticScreen() {
  const { state, update } = useStore();
  const { t, tn } = useT();
  const { isPremium, buyCredit, creditPrice } = usePremium();
  const [buying, setBuying] = useState(false);
  const vehicle = useCurrentVehicle();
  const obd = useObdReader();

  const [symptoms, setSymptoms] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [codesText, setCodesText] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState('');
  const [result, setResult] = useState<DiagnosisRecord | null>(null);

  const used = usage(state).diagnoses;
  const left = Math.max(0, FREE_DIAGNOSES_PER_MONTH - used);
  const credits = state.credits ?? 0;
  // Après le quota gratuit, un diagnostic acheté à l'unité prend le relais.
  const useCredit = !isPremium && left === 0 && credits > 0;
  const blocked = !isPremium && left === 0 && credits === 0;
  const latest = result ?? state.history[0];

  const scanned = obd.scan ? [...obd.scan.stored, ...obd.scan.pending] : [];
  const codes = [...new Set([...extractCodes(codesText), ...scanned])];

  const toggle = (id: string) => setTags((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const run = async () => {
    if (!vehicle || blocked) return;
    if (!symptoms.trim() && !tags.length && !codes.length) {
      setNote(t('diag.needInput'));
      return;
    }
    const v = obd.scan?.vin && !vehicle.vin ? { ...vehicle, vin: obd.scan.vin } : vehicle;
    const req: DiagnosisRequest = {
      vehicle: stripId(v),
      symptoms: symptoms.trim(),
      symptomTags: tags.map((id) => SYMPTOMS.find((s) => s.id === id)?.label ?? id),
      codes,
      photo: isPremium && photo ? photo : undefined,
    };
    setRunning(true);
    setNote('');
    let record: DiagnosisRecord;
    try {
      const ai = await api.diagnose(req);
      record = { id: newId(), date: new Date().toISOString(), vehicleLabel: vehicleLabel(v), symptoms: req.symptoms || req.symptomTags.join(', '), codes, result: ai, source: 'ai' };
    } catch (e) {
      setNote(t('diag.offlineFallback', { reason: e instanceof ApiError ? e.message : t('diag.aiDown') }));
      record = {
        id: newId(),
        date: new Date().toISOString(),
        vehicleLabel: vehicleLabel(v),
        symptoms: req.symptoms || req.symptomTags.join(', '),
        codes,
        result: localDiagnosis({ ...req, symptomTags: tags }),
        source: 'offline',
      };
    } finally {
      setRunning(false);
    }
    setResult(record);
    update((s) => ({
      ...s,
      vehicles: s.vehicles.map((x) => (x.id === v.id ? v : x)),
      history: [record, ...s.history].slice(0, 50),
      usage: { ...s.usage, diagnoses: s.usage.diagnoses + (isPremium || useCredit || record.source === 'offline' ? 0 : 1) },
      credits: useCredit && record.source === 'ai' ? Math.max(0, (s.credits ?? 0) - 1) : (s.credits ?? 0),
    }));
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
              {obd.scan ? <Button kind="ghost" label={t('diag.codes.clear')} onPress={obd.clear} /> : null}
            </Row>
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
              <Button label={t('diag.run')} loading={running} onPress={run} />
              <ThemedText type="small" themeColor="textSecondary">
                {isPremium
                  ? t('diag.unlimited')
                  : useCredit
                    ? tn('diag.purchased', credits)
                    : tn('diag.freeLeft', left)}
              </ThemedText>
            </Row>
          )}
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

      {latest ? <DiagnosisView record={latest} /> : null}
    </Screen>
  );
}
