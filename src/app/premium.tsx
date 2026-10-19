import { useState } from 'react';
import { View } from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Eyebrow, Row, Screen, Tag, Title } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePremium } from '@/lib/purchases';
import { FREE_CT_REPORTS_PER_MONTH, FREE_DIAGNOSES_PER_MONTH, FREE_QUOTES_PER_MONTH, useStore } from '@/lib/store';

type Feature = [label: string, free: boolean | string, premium: boolean | string];

const FEATURES: Feature[] = [
  ['Lecture des codes par dongle OBD2 Bluetooth', true, true],
  ['Verdict de sécurité : rouler, prudence ou arrêt', true, true],
  ['Causes probables avec coûts pièces et garage', true, true],
  ['Catalogue de toutes les marques et modèles', true, true],
  ['Pannes connues de votre moteur', true, true],
  ['Identifier un bruit, plan d’entretien, check-list du contrôle technique', true, true],
  ['Diagnostics IA par mois', String(FREE_DIAGNOSES_PER_MONTH), 'Illimités'],
  ['Analyse de devis de garage', `${FREE_QUOTES_PER_MONTH} par mois`, 'Illimitée'],
  ['Analyse du procès-verbal de contrôle technique', `${FREE_CT_REPORTS_PER_MONTH} par mois`, 'Illimitée'],
  ['Données moteur en direct (régime, température, batterie)', false, true],
  ['Guides pas à pas essentiels', true, true],
  ['Analyse de photo (voyant, fuite, pièce usée)', false, true],
  ['Plan de réparation sur mesure pour votre modèle', false, true],
  ['Questions de suivi pendant la réparation', false, true],
  ['Guides avancés avec couples de serrage', false, true],
  ['Plusieurs véhicules, carnet d’entretien et export PDF', false, true],
];

const DEMO_PRICES = { monthly: '6,99 €/mois', annual: '49 €/an, soit 4,08 €/mois' };

export default function PremiumScreen() {
  const theme = useTheme();
  const { isPremium, demo, packages, purchase, restore, setDemo, buyCredit, creditPrice } = usePremium();
  const { state } = useStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const buy = async (pkg: PurchasesPackage) => {
    setBusy(true);
    setMessage('');
    try {
      if (await purchase(pkg)) setMessage('Premium activé. Merci !');
    } catch {
      setMessage("Le paiement n'a pas abouti. Aucun montant n'a été débité.");
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async () => {
    setBusy(true);
    try {
      setMessage((await restore()) ? 'Abonnement restauré.' : 'Aucun abonnement trouvé sur ce compte.');
    } catch {
      setMessage('Restauration impossible pour le moment.');
    } finally {
      setBusy(false);
    }
  };

  const column = (premium: boolean) =>
    FEATURES.map(([label, free, pro]) => {
      const v = premium ? pro : free;
      return (
        <Row key={label} style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <ThemedText style={{ width: 20, color: v ? theme.ok : theme.textSecondary, fontWeight: 700 }}>{v ? '✓' : '–'}</ThemedText>
          <ThemedText type="small" themeColor={v ? 'text' : 'textSecondary'} style={{ flex: 1 }}>
            {label}
            {typeof v === 'string' ? ` : ${v}` : ''}
          </ThemedText>
        </Row>
      );
    });

  return (
    <Screen>
      <Title lede="La version gratuite suffit pour un diagnostic ponctuel. Premium s'adresse à ceux qui entretiennent eux-mêmes leurs voitures toute l'année. Aucun boîtier propriétaire : n'importe quel dongle ELM327 Bluetooth à 15–30 € fonctionne.">
        Gratuit ou Premium
      </Title>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }}>
        <Card style={{ flexGrow: 1, flexBasis: 260 }}>
          <Eyebrow>Gratuit</Eyebrow>
          <ThemedText style={{ fontSize: 36, fontWeight: 800 }}>0 €</ThemedText>
          {column(false)}
        </Card>
        <Card style={{ flexGrow: 1, flexBasis: 260, borderColor: theme.signal, borderWidth: 2 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Eyebrow>Premium</Eyebrow>
            <Tag label="7 jours offerts" premium />
          </Row>
          {demo ? (
            <>
              <ThemedText style={{ fontSize: 36, fontWeight: 800 }}>49 €<ThemedText themeColor="textSecondary"> /an</ThemedText></ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                ou {DEMO_PRICES.monthly}
              </ThemedText>
            </>
          ) : null}
          {column(true)}
          {isPremium ? (
            <Tag label="Premium actif" premium />
          ) : demo ? (
            <Button kind="signal" label="Essayer Premium (démo)" onPress={() => setDemo(true)} />
          ) : (
            packages.map((pkg) => (
              <Button
                key={pkg.identifier}
                kind="signal"
                loading={busy}
                label={`${pkg.product.title || 'Premium'} · ${pkg.product.priceString}`}
                onPress={() => buy(pkg)}
              />
            ))
          )}
          {!demo ? <Button kind="ghost" label="Restaurer mes achats" onPress={doRestore} disabled={busy} /> : null}
          {demo && isPremium ? <Button kind="ghost" label="Revenir au gratuit" onPress={() => setDemo(false)} /> : null}
          {message ? <ThemedText type="small">{message}</ThemedText> : null}
        </Card>
      </View>
      {!isPremium ? (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, minWidth: 200, gap: Spacing.one }}>
              <Eyebrow>Une seule panne</Eyebrow>
              <ThemedText type="smallBold">{`Un diagnostic IA complet pour ${creditPrice}, sans abonnement`}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Pour ceux qui ne réparent pas eux-mêmes : verdict, causes, coûts et liens garage.
                {state.credits ? ` Vous avez ${state.credits} diagnostic${state.credits > 1 ? 's' : ''} d’avance.` : ''}
              </ThemedText>
            </View>
            <Button
              kind="ghost"
              label="Acheter un diagnostic"
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  setMessage((await buyCredit()) ? 'Diagnostic ajouté.' : 'Achat annulé.');
                } catch {
                  setMessage('Le paiement n’a pas abouti. Aucun montant n’a été débité.');
                } finally {
                  setBusy(false);
                }
              }}
            />
          </Row>
        </Card>
      ) : null}
      {demo ? (
        <ThemedText type="small" themeColor="textSecondary">
          Mode démo : aucun paiement n’est configuré sur cette version, Premium se débloque gratuitement pour le tester.
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Abonnement renouvelé automatiquement, résiliable à tout moment depuis les réglages de votre store.
        </ThemedText>
      )}
      <ThemedText type="small" themeColor="textSecondary">
        Les diagnostics sont indicatifs et ne remplacent pas l’avis d’un professionnel. Les photos et plaques
        d’immatriculation servent uniquement à l’analyse demandée.
      </ThemedText>
    </Screen>
  );
}
