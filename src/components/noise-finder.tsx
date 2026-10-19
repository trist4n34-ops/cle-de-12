import { useState } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, Eyebrow, Row, Tag } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { NOISE_KIND, NOISE_WHEN, noiseCauses, NoiseKind, noiseSentence, NoiseWhen } from '@/data/noises';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

/** Identifier un bruit en deux questions, puis l'ajouter à la description. */
export function NoiseFinder({ onAdd }: { onAdd: (sentence: string) => void }) {
  const theme = useTheme();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState<NoiseWhen[]>([]);
  const [kind, setKind] = useState<NoiseKind[]>([]);
  const causes = when.length && kind.length ? noiseCauses(when, kind) : [];

  const toggle = <T,>(list: T[], set: (v: T[]) => void, v: T) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  if (!open)
    return (
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, minWidth: 200, gap: Spacing.one }}>
            <ThemedText type="smallBold">{t('noise.teaser.title')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('noise.teaser.body')}
            </ThemedText>
          </View>
          <Button kind="ghost" label={t('noise.open')} onPress={() => setOpen(true)} />
        </Row>
      </Card>
    );

  return (
    <Card>
      <Eyebrow>{t('noise.open')}</Eyebrow>
      <ThemedText type="smallBold">{t('noise.when')}</ThemedText>
      <Row>
        {NOISE_WHEN.map((w) => (
          <Chip key={w.id} label={w.label} selected={when.includes(w.id)} onPress={() => toggle(when, setWhen, w.id)} />
        ))}
      </Row>
      <ThemedText type="smallBold">{t('noise.kind')}</ThemedText>
      <Row>
        {NOISE_KIND.map((k) => (
          <Chip key={k.id} label={k.label} selected={kind.includes(k.id)} onPress={() => toggle(kind, setKind, k.id)} />
        ))}
      </Row>
      {when.length && kind.length ? (
        causes.length ? (
          <View style={{ gap: Spacing.two }}>
            {causes.map((c) => (
              <View key={c.title} style={{ gap: 2, borderLeftWidth: 4, borderLeftColor: c.stop ? theme.stop : theme.line, paddingLeft: Spacing.two }}>
                <Row>
                  <ThemedText type="smallBold" style={{ flexShrink: 1 }}>
                    {c.title}
                  </ThemedText>
                  {c.stop ? <Tag label={t('verdict.stop')} /> : null}
                </Row>
                <ThemedText type="small" themeColor="textSecondary">
                  {c.detail}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {t('noise.none')}
          </ThemedText>
        )
      ) : null}
      <Row>
        <Button
          label={t('noise.add')}
          disabled={!when.length || !kind.length}
          onPress={() => {
            onAdd(noiseSentence(when, kind));
            setOpen(false);
          }}
        />
        <Button kind="ghost" label={t('common.close')} onPress={() => setOpen(false)} />
      </Row>
    </Card>
  );
}
