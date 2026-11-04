import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CtLine, useDay } from '@/components/ct-line';
import { KnownIssues } from '@/components/known-issues';
import { Button, Card, Chip, Field, Heading, LockBox, Row, Screen, Tag, Title, Verdict } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { Due, maintenanceDue } from '@/data/maintenance';
import { useTheme } from '@/hooks/use-theme';
import { LANGUAGES, type TKey, useT } from '@/i18n';
import { errorText } from '@/i18n/errors';
import { type Vehicle, vehicleLabel } from '@/lib/diagnosis';
import { exportLog } from '@/lib/export-log';
import {
  DATE_ERROR_KEYS,
  formatDateInput,
  isoDate,
  MILEAGE_ERROR_KEYS,
  parseDateInput,
  parseMileage,
  recordMatchesVehicle,
  removeLogEntry,
  removeVehicle,
  saveLogEntry,
  vehicleKm,
} from '@/lib/garage';
import { usePremium } from '@/lib/purchases';
import { notificationPermission, type PermissionState, remindersSupported } from '@/lib/reminder-scheduler';
import { markMileageUpdated, removeVehicleExtras, setReminderSettings, useReminderData } from '@/lib/reminder-store';
import { planReminders, type ReminderSettings } from '@/lib/reminders';
import { deleteMyData } from '@/lib/delete-data';
import { LEGAL_PAGES, siteUrl } from '@/lib/site-links';
import { freshState, type LogEntry, newId, useCurrentVehicle, useStore } from '@/lib/store';

const shortName = (v: Vehicle) => [v.make, v.model].filter(Boolean).join(' ') || v.plate || '?';

export default function GarageScreen() {
  const { t } = useT();
  const { state, update } = useStore();
  const { isPremium } = usePremium();
  const current = useCurrentVehicle();
  const due = current ? maintenanceDue(current, state.log, isoDate(new Date())) : [];

  const doneToday = (vehicle: Vehicle, operation: string) =>
    update((s) =>
      saveLogEntry(s, {
        id: newId(),
        vehicleId: vehicle.id,
        date: isoDate(new Date()),
        mileage: String(vehicleKm(vehicle) || ''),
        operation,
      }),
    );

  return (
    <Screen>
      <Title lede={t('garage.lede')}>{t('garage.title')}</Title>

      <VehiclesCard current={current} />

      {current ? <KnownIssues vehicle={current} /> : null}

      {current ? (
        <Card>
          <Heading>{t('garage.maintenance.title')}</Heading>
          <ThemedText type="small" themeColor="textSecondary">
            {t('garage.maintenance.note')}
          </ThemedText>
          {due.map((d) => (
            <DueRow key={d.item.id} due={d} onDone={isPremium ? () => doneToday(current, d.item.title) : undefined} />
          ))}
        </Card>
      ) : null}

      <LogbookCard current={current} />

      <RemindersCard current={current} />

      <HistoryCard />

      <LanguageCard />

      <PrivacyCard />
    </Screen>
  );
}

/** Véhicules : choix, retrait confirmé sur place, relevé rapide du kilométrage. */
function VehiclesCard({ current }: { current?: Vehicle }) {
  const theme = useTheme();
  const { t, tn } = useT();
  const { state, update } = useStore();
  const [confirming, setConfirming] = useState<string | null>(null);

  const remove = (v: Vehicle) => {
    update((s) => removeVehicle(s, v.id));
    removeVehicleExtras(v.id);
    setConfirming(null);
  };

  return (
    <Card>
      <Heading>{t('garage.vehicles')}</Heading>
      {state.vehicles.length ? (
        state.vehicles.map((v) => {
          const entries = state.log.filter((l) => l.vehicleId === v.id).length;
          return (
            <View key={v.id} style={{ gap: Spacing.two }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <ThemedText type={v.id === current?.id ? 'smallBold' : 'small'} style={{ flex: 1, minWidth: 160 }}>
                  {vehicleLabel(v)}
                  {v.plate ? ` · ${v.plate}` : ''}
                </ThemedText>
                {v.id !== current?.id ? (
                  <Button kind="ghost" label={t('garage.select')} onPress={() => update((s) => ({ ...s, vehicleId: v.id }))} />
                ) : null}
                {confirming !== v.id ? (
                  <Button kind="ghost" label={t('garage.remove')} onPress={() => setConfirming(v.id)} />
                ) : null}
              </Row>
              {confirming === v.id ? (
                <View
                  accessibilityRole="alert"
                  style={{ gap: Spacing.two, padding: Spacing.three, borderRadius: 10, backgroundColor: theme.stopBg }}>
                  <ThemedText type="smallBold">
                    {entries
                      ? tn('garage.remove.confirmLog', entries, { vehicle: shortName(v) })
                      : t('garage.remove.confirm', { vehicle: shortName(v) })}
                  </ThemedText>
                  <Row>
                    <Button kind="signal" label={t('garage.remove.yes')} onPress={() => remove(v)} />
                    <Button kind="ghost" label={t('garage.cancel')} onPress={() => setConfirming(null)} />
                  </Row>
                </View>
              ) : null}
            </View>
          );
        })
      ) : (
        <ThemedText themeColor="textSecondary">{t('garage.noVehicle')}</ThemedText>
      )}
      {current ? <QuickMileage vehicle={current} /> : null}
      {current && (current.fuel === 'Hybride' || current.fuel === 'Électrique') ? (
        <Verdict urgency="stop" title={t('garage.hv.title')} reason={t('garage.hv.reason')} />
      ) : null}
    </Card>
  );
}

/** Relevé du kilométrage en deux gestes (c'est ce que demande le rappel mensuel). */
function QuickMileage({ vehicle }: { vehicle: Vehicle }) {
  const theme = useTheme();
  const { t, num, date } = useT();
  const { update } = useStore();
  const { extras } = useReminderData();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const updatedAt = extras[vehicle.id]?.mileageUpdatedAt;
  const known = vehicleKm(vehicle);

  const submit = () => {
    const parsed = parseMileage(text);
    if (!parsed.ok) return setError(t(MILEAGE_ERROR_KEYS[parsed.error]));
    if (parsed.value === null) return setError(t('garage.err.mileage.format'));
    if (parsed.value < known) return setError(t('garage.mileage.lower', { km: num(known) }));
    setError(undefined);
    update((s) => ({
      ...s,
      vehicles: s.vehicles.map((v) => (v.id === vehicle.id ? { ...v, mileage: String(parsed.value) } : v)),
    }));
    markMileageUpdated(vehicle.id);
    setText('');
    setSaved(true);
  };

  return (
    <View style={{ gap: Spacing.two, borderTopWidth: 1, borderTopColor: theme.line, paddingTop: Spacing.two }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <Field
          label={t('garage.mileage.label', { vehicle: shortName(vehicle) })}
          keyboardType="number-pad"
          value={text}
          onChangeText={(v) => {
            setText(v);
            setSaved(false);
          }}
          onSubmitEditing={submit}
          placeholder={known ? String(known) : '98000'}
          error={error}
        />
        <View style={{ paddingTop: 24 }}>
          <Button kind="ghost" label={t('garage.mileage.save')} disabled={!text.trim()} onPress={submit} />
        </View>
      </Row>
      <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
        {saved
          ? t('garage.mileage.saved')
          : [known ? `${num(known)} km` : '', updatedAt ? t('garage.mileage.updatedOn', { date: date(updatedAt) }) : '']
              .filter(Boolean)
              .join(' · ')}
      </ThemedText>
    </View>
  );
}

type Draft = { id: string | null; date: string; mileage: string; operation: string };
const emptyDraft = (): Draft => ({ id: null, date: formatDateInput(isoDate(new Date())), mileage: '', operation: '' });

/** Carnet d'entretien : ajout, modification et suppression (confirmée sur place) des entrées. */
function LogbookCard({ current }: { current?: Vehicle }) {
  const theme = useTheme();
  const { t, num } = useT();
  const day = useDay();
  const { state, update } = useStore();
  const { isPremium } = usePremium();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<{ date?: string; mileage?: string }>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState('');
  const [exportMsg, setExportMsg] = useState('');

  const log = state.log.filter((l) => l.vehicleId === current?.id).sort((a, b) => b.date.localeCompare(a.date));
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const reset = () => {
    setDraft(emptyDraft());
    setErrors({});
    setConfirmDelete(false);
  };

  const edit = (l: LogEntry) => {
    setDraft({ id: l.id, date: formatDateInput(l.date), mileage: l.mileage, operation: l.operation });
    setErrors({});
    setConfirmDelete(false);
    setNotice('');
  };

  const save = () => {
    if (!current || !draft.operation.trim()) return;
    const d = parseDateInput(draft.date);
    const km = parseMileage(draft.mileage);
    setErrors({
      date: d.ok ? undefined : t(DATE_ERROR_KEYS[d.error]),
      mileage: km.ok ? undefined : t(MILEAGE_ERROR_KEYS[km.error]),
    });
    if (!d.ok || !km.ok) return;
    const entry: LogEntry = {
      id: draft.id ?? newId(),
      vehicleId: current.id,
      date: d.value,
      mileage: km.value === null ? '' : String(km.value),
      operation: draft.operation.trim(),
    };
    const raised = km.value !== null && km.value > vehicleKm(current);
    update((s) => saveLogEntry(s, entry));
    if (raised) markMileageUpdated(current.id);
    setNotice(raised ? t('garage.log.mileageRaised', { km: num(km.value ?? 0) }) : '');
    reset();
  };

  const remove = () => {
    if (!draft.id) return;
    const id = draft.id;
    update((s) => removeLogEntry(s, id));
    setNotice('');
    reset();
  };

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Heading>{t('garage.log.title')}</Heading>
        {isPremium && current ? (
          <Button
            kind="ghost"
            label={t('garage.log.export')}
            onPress={() => exportLog(current, state.log).catch(() => setExportMsg(t('garage.log.exportFailed')))}
          />
        ) : null}
      </Row>
      {exportMsg ? <ThemedText type="small">{exportMsg}</ThemedText> : null}
      {!isPremium ? (
        <LockBox text={t('garage.log.locked')} onUnlock={() => router.push('/premium')} />
      ) : !current ? null : (
        <>
          {log.map((l) => {
            const selected = l.id === draft.id;
            return (
              <Pressable
                key={l.id}
                accessibilityRole="button"
                accessibilityHint={t('garage.log.editHint')}
                accessibilityState={{ selected }}
                onPress={() => (selected ? reset() : edit(l))}
                style={({ pressed }) => ({
                  borderTopWidth: 1,
                  borderTopColor: theme.line,
                  paddingVertical: Spacing.two,
                  minHeight: 44,
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: selected ? theme.backgroundSelected : undefined,
                })}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <ThemedText type="code">{day(l.date)}</ThemedText>
                  <ThemedText type="code">{l.mileage ? `${num(Number(l.mileage))} km` : ''}</ThemedText>
                </Row>
                <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                  <ThemedText style={{ flexShrink: 1 }}>{l.operation}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.accent }}>
                    {t('garage.log.edit')}
                  </ThemedText>
                </Row>
              </Pressable>
            );
          })}
          {draft.id ? (
            <ThemedText type="smallBold" style={{ borderTopWidth: 1, borderTopColor: theme.line, paddingTop: Spacing.two }}>
              {t('garage.log.editing')}
            </ThemedText>
          ) : null}
          <Row style={{ alignItems: 'flex-start' }}>
            <Field
              label={t('garage.log.date')}
              value={draft.date}
              onChangeText={(date) => set({ date })}
              placeholder={t('garage.datePlaceholder')}
              keyboardType="numbers-and-punctuation"
              error={errors.date}
            />
            <Field
              label={t('garage.log.mileage')}
              keyboardType="number-pad"
              value={draft.mileage}
              onChangeText={(mileage) => set({ mileage })}
              placeholder="98000"
              error={errors.mileage}
            />
            <Field
              label={t('garage.log.operation')}
              value={draft.operation}
              onChangeText={(operation) => set({ operation })}
              placeholder={t('garage.log.operationPlaceholder')}
            />
          </Row>
          {confirmDelete ? (
            <View
              accessibilityRole="alert"
              style={{ gap: Spacing.two, padding: Spacing.three, borderRadius: 10, backgroundColor: theme.stopBg }}>
              <ThemedText type="smallBold">{t('garage.log.deleteConfirm')}</ThemedText>
              <Row>
                <Button kind="signal" label={t('garage.log.delete')} onPress={remove} />
                <Button kind="ghost" label={t('garage.cancel')} onPress={() => setConfirmDelete(false)} />
              </Row>
            </View>
          ) : (
            <Row>
              <Button
                label={draft.id ? t('garage.log.save') : t('garage.log.add')}
                disabled={!draft.operation.trim()}
                onPress={save}
              />
              {draft.id ? (
                <>
                  <Button kind="ghost" label={t('garage.log.delete')} onPress={() => setConfirmDelete(true)} />
                  <Button kind="ghost" label={t('garage.cancel')} onPress={reset} />
                </>
              ) : null}
            </Row>
          )}
          {notice ? (
            <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
              {notice}
            </ThemedText>
          ) : null}
        </>
      )}
    </Card>
  );
}

const KINDS: [Exclude<keyof ReminderSettings, 'enabled'>, TKey][] = [
  ['maintenance', 'reminders.kind.maintenance'],
  ['ct', 'reminders.kind.ct'],
  ['mileage', 'reminders.kind.mileage'],
];

/** Rappels : activation (l'autorisation n'est demandée qu'ici), types de rappels, prochaine échéance. */
function RemindersCard({ current }: { current?: Vehicle }) {
  const { t, date } = useT();
  const day = useDay();
  const { state } = useStore();
  const { settings, extras } = useReminderData();
  const [perm, setPerm] = useState<PermissionState | null>(null);
  const [busy, setBusy] = useState(false);
  const channel = t('reminders.title');

  // Relu au retour des réglages du téléphone.
  useEffect(() => {
    if (!remindersSupported || !settings.enabled) return;
    const check = () =>
      notificationPermission(false, channel)
        .then(setPerm)
        .catch(() => setPerm('denied'));
    check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, [settings.enabled, channel]);

  const enable = async () => {
    setBusy(true);
    try {
      const p = await notificationPermission(true, channel);
      setPerm(p);
      if (p === 'granted') setReminderSettings({ enabled: true });
    } catch {
      setPerm('denied');
    } finally {
      setBusy(false);
    }
  };

  const next =
    remindersSupported && settings.enabled
      ? planReminders({
          vehicles: state.vehicles,
          log: state.log,
          extras,
          settings,
          now: new Date(),
          t,
          formatDate: day,
        })[0]
      : undefined;

  const denied = perm === 'denied' ? (
    <View style={{ gap: Spacing.two }}>
      <ThemedText type="small" themeColor="warn">
        {t('reminders.denied')}
      </ThemedText>
      <Row>
        <Button kind="ghost" label={t('reminders.openSettings')} onPress={() => Linking.openSettings().catch(() => undefined)} />
      </Row>
    </View>
  ) : null;

  return (
    <Card>
      <Heading>{t('reminders.title')}</Heading>
      {current ? <CtLine vehicle={current} /> : null}
      {!remindersSupported ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('reminders.mobileOnly')}
        </ThemedText>
      ) : !settings.enabled ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {t('reminders.lede')}
          </ThemedText>
          <Row>
            <Button label={t('reminders.enable')} loading={busy} onPress={enable} />
          </Row>
          {denied}
        </>
      ) : (
        <>
          <Row>
            {KINDS.map(([kind, label]) => (
              <Chip
                key={kind}
                label={t(label)}
                selected={settings[kind]}
                onPress={() => setReminderSettings({ [kind]: !settings[kind] })}
              />
            ))}
          </Row>
          {denied}
          <ThemedText type="small" themeColor="textSecondary">
            {next ? t('reminders.next', { date: date(next.at), title: next.title }) : t('reminders.none')}
          </ThemedText>
          <Row>
            <Button kind="ghost" label={t('reminders.disable')} onPress={() => setReminderSettings({ enabled: false })} />
          </Row>
        </>
      )}
    </Card>
  );
}

/** Historique des diagnostics, filtrable par véhicule. */
function HistoryCard() {
  const theme = useTheme();
  const { t, date: fmtDate } = useT();
  const { state } = useStore();
  const [filter, setFilter] = useState<string | null>(null);
  const vehicle = state.vehicles.find((v) => v.id === filter);
  const history = vehicle ? state.history.filter((h) => recordMatchesVehicle(h, vehicle)) : state.history;

  return (
    <Card>
      <Heading>{t('garage.history.title')}</Heading>
      {state.vehicles.length > 1 && state.history.length ? (
        <Row accessibilityLabel={t('garage.history.filter')}>
          <Chip label={t('garage.history.all')} selected={!vehicle} onPress={() => setFilter(null)} />
          {state.vehicles.map((v) => (
            <Chip key={v.id} label={shortName(v)} selected={v.id === vehicle?.id} onPress={() => setFilter(v.id)} />
          ))}
        </Row>
      ) : null}
      {history.length ? (
        history.map((h) => (
          <Pressable key={h.id} accessibilityRole="button" onPress={() => router.push(`/result/${h.id}`)}>
            <View style={{ gap: 2, paddingVertical: Spacing.two, borderTopWidth: 1, borderTopColor: theme.line }}>
              <ThemedText type="small" themeColor="textSecondary">
                {fmtDate(h.date)} · {h.vehicleLabel}
              </ThemedText>
              <ThemedText type="smallBold">{h.symptoms || h.codes.join(', ')}</ThemedText>
            </View>
          </Pressable>
        ))
      ) : (
        <ThemedText themeColor="textSecondary">
          {state.history.length ? t('garage.history.noneForVehicle') : t('garage.history.empty')}
        </ThemedText>
      )}
    </Card>
  );
}

/** Choix de la langue de l'interface ; sans choix, l'app suit l'appareil. */
function LanguageCard() {
  const { t, lang, override, setLanguage } = useT();
  return (
    <Card>
      <Heading>{t('garage.language.title')}</Heading>
      <Row>
        {LANGUAGES.map((l) => (
          <Chip key={l.code} label={l.name} selected={l.code === lang} onPress={() => setLanguage(l.code)} />
        ))}
      </Row>
      <ThemedText type="small" themeColor="textSecondary">
        {t('garage.language.hint')}
      </ThemedText>
      {override ? (
        <Row>
          <Button kind="ghost" label={t('garage.language.useDevice')} onPress={() => setLanguage(null)} />
        </Row>
      ) : null}
    </Card>
  );
}

const LEGAL_KEYS: Record<(typeof LEGAL_PAGES)[number]['key'], TKey> = {
  privacy: 'privacy.link.privacy',
  deletion: 'privacy.link.deletion',
  terms: 'privacy.link.terms',
  legal: 'privacy.link.legal',
};

/**
 * Vie privée : pages légales et « Supprimer mes données » (serveur, rappels,
 * puis tout ce qui est sur le téléphone ; la langue choisie est gardée).
 * Confirmation sur place, sans Alert, pour marcher aussi sur le web.
 */
function PrivacyCard() {
  const theme = useTheme();
  const tr = useT();
  const { t } = tr;
  const { state, update } = useStore();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const links = LEGAL_PAGES.map((p) => ({ ...p, url: siteUrl(p.path) })).filter((p) => p.url);

  const erase = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await deleteMyData({ hasServerSession: !!state.session });
      update((s) => ({ ...freshState(), language: s.language }));
      setConfirming(false);
      setMessage({ ok: true, text: t('privacy.delete.done') });
    } catch (e) {
      setMessage({ ok: false, text: errorText(e, tr, t('privacy.delete.failed')) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Heading>{t('privacy.title')}</Heading>
      <ThemedText type="small" themeColor="textSecondary">
        {t('privacy.lede')}
      </ThemedText>
      {links.length ? (
        <Row>
          {links.map((p) => (
            <Button key={p.key} kind="ghost" label={t(LEGAL_KEYS[p.key])} onPress={() => Linking.openURL(p.url!)} />
          ))}
        </Row>
      ) : null}
      {confirming ? (
        <View
          accessibilityRole="alert"
          style={{ gap: Spacing.two, padding: Spacing.three, borderRadius: 10, backgroundColor: theme.stopBg }}>
          <ThemedText type="smallBold">{t('privacy.delete.confirm')}</ThemedText>
          <ThemedText type="small">{t('privacy.delete.subscription')}</ThemedText>
          <Row>
            <Button kind="signal" loading={busy} label={t('privacy.delete.yes')} onPress={erase} />
            <Button kind="ghost" label={t('garage.cancel')} disabled={busy} onPress={() => setConfirming(false)} />
          </Row>
        </View>
      ) : (
        <Row>
          <Button kind="ghost" label={t('privacy.delete.button')} onPress={() => setConfirming(true)} />
        </Row>
      )}
      {message ? (
        <ThemedText type="small" style={{ color: message.ok ? theme.ok : theme.stop }}>
          {message.text}
        </ThemedText>
      ) : null}
    </Card>
  );
}

const STATUS = {
  retard: { label: 'garage.status.retard', color: 'stop' },
  bientot: { label: 'garage.status.bientot', color: 'warn' },
  ok: { label: 'garage.status.ok', color: 'ok' },
  inconnu: { label: 'garage.status.inconnu', color: 'textSecondary' },
} as const satisfies Record<Due['status'], { label: string; color: 'stop' | 'warn' | 'ok' | 'textSecondary' }>;

function DueRow({ due, onDone }: { due: Due; onDone?: () => void }) {
  const theme = useTheme();
  const { t, tn, num } = useT();
  const date = useDay();
  const st = STATUS[due.status];
  const months = due.item.everyMonths;
  const or = t('garage.due.or');
  const interval = [
    due.item.everyKm ? t('garage.due.everyKm', { km: num(due.item.everyKm) }) : '',
    months ? (months % 12 === 0 ? tn('garage.due.years', months / 12) : tn('garage.due.months', months)) : '',
  ]
    .filter(Boolean)
    .join(or);
  const next = [
    due.nextKm ? t('garage.due.nextKm', { km: num(due.nextKm) }) : '',
    due.nextDate ? t('garage.due.nextDate', { date: date(due.nextDate) }) : '',
  ]
    .filter(Boolean)
    .join(or);
  return (
    <View style={{ gap: 2, borderTopWidth: 1, borderTopColor: theme.line, paddingTop: Spacing.two }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <ThemedText type="smallBold" style={{ flexShrink: 1 }}>
          {due.item.title}
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: theme[st.color] }}>
          {t(st.label)}
        </ThemedText>
      </Row>
      <ThemedText type="small" themeColor="textSecondary">
        {[
          interval,
          next ? t('garage.due.next', { next }) : '',
          due.last ? t('garage.due.last', { date: date(due.last.date) }) : '',
        ]
          .filter(Boolean)
          .join(' · ')}
      </ThemedText>
      {due.item.note ? (
        <ThemedText type="small" themeColor="textSecondary">
          {due.item.note}
        </ThemedText>
      ) : null}
      <Row>
        {due.item.guideId ? (
          <Button kind="ghost" label={t('garage.due.guide')} onPress={() => router.push(`/guides/${due.item.guideId}`)} />
        ) : null}
        {onDone && due.status !== 'ok' ? <Button kind="ghost" label={t('garage.due.doneToday')} onPress={onDone} /> : null}
        {!onDone && due.status === 'retard' ? <Tag label={t('garage.due.premiumReminder')} /> : null}
      </Row>
    </View>
  );
}
