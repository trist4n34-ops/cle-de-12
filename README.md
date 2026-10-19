# Clé de 12

App mobile de diagnostic et de réparation automobile assistés par IA, pour les mécaniciens amateurs et tous ceux qui veulent comprendre leur voiture avant d'aller au garage. iOS, Android et web, en français, pensée pour le parc français.

## Ce que fait l'app

- **Diagnostic IA** : véhicule, symptômes (texte ou boutons rapides), codes défaut et photo (Premium). Claude rend un verdict de sécurité (rouler, prudence, arrêt), des causes classées avec probabilité, difficulté et coûts pièces et garage, et les contrôles à faire dans l'ordre. Sans réseau ou sans serveur IA, une base intégrée de 26 codes et 12 symptômes prend le relais.
- **Lecture des codes OBD2 en Bluetooth** avec n'importe quel dongle ELM327 Bluetooth Low Energy à 15–30 € (Vgate iCar Pro BLE, Veepeak BLE…) : codes confirmés, codes en attente, voyant, VIN, effacement.
- **Identification par la plaque** d'immatriculation (fournisseur SIV à brancher).
- **« Mon devis est-il normal ? »** : photo d'un devis de garage, comparée ligne par ligne aux prix du marché.
- **Guides pas à pas** avec outillage, étapes à cocher et couples de serrage, plan de réparation sur mesure (Premium).
- **Liens prix des pièces** (Oscaro, Mister-Auto, Autodoc) et **devis garage** (Vroomly, iDGARAGE) pour les réparations de difficulté 4 ou 5, prêts pour l'affiliation.
- **Retour « ça a réglé le problème ? »** enregistré avec chaque diagnostic.
- **Mon garage** : véhicules, carnet d'entretien (Premium), historique.

## Offres

| | Gratuit | Premium (6,99 €/mois ou 49 €/an) |
|---|---|---|
| Lecture OBD2, verdict de sécurité, coûts | ✓ | ✓ |
| Diagnostics IA | 3 par mois | Illimités |
| Analyse de devis | 1 par mois | Illimitée |
| Photo, plan sur mesure, questions de suivi | | ✓ |
| Guides avancés, plusieurs véhicules, carnet | | ✓ |

L'abonnement passe par RevenueCat (App Store, Google Play, web). Sans clé RevenueCat, l'app est en **mode démo** : Premium se débloque gratuitement sur l'appareil.

## Architecture

```
src/
  app/                 Écrans (Expo Router) et routes serveur /api
    (diag)/            Diagnostic, devis, résultat
    guides/            Liste et détail des guides
    api/*+api.ts       diagnose, repair-plan, chat, quote, vehicle
  components/          Interface (ui.tsx, diagnosis-view.tsx, vehicle-editor.tsx)
  data/                Codes OBD2, symptômes, guides intégrés
  features/obd/        Protocole ELM327 (pur, testé), session OBD, transport BLE
  lib/                 Types partagés, stockage local, achats, liens partenaires
  server/              Appels Claude, vérification Premium, plaque, validation
```

- **IA** : les routes `/api` appellent l'API Claude (`@anthropic-ai/sdk`, modèle `claude-opus-5-5` par défaut, réglable par `CLAUDE_MODEL`) avec des sorties structurées validées par Zod. La clé reste sur le serveur. Les refus des filtres de sécurité sont relancés automatiquement sur un modèle de repli (`fallbacks: "default"`).
- **Premium côté serveur** : les routes Premium vérifient l'abonnement auprès de RevenueCat avec l'identifiant envoyé par l'app.
- **Données techniques** : `src/lib/tech-data.ts` définit l'interface d'un fournisseur sous licence (HaynesPro, ETAI/RTA). En attendant, les couples sont affichés comme valeurs types.
- **Plaque** : `src/server/plate-lookup.ts` attend un fournisseur SIV (`PLATE_API_URL`, `PLATE_API_KEY`) ; adaptez `mapProvider` à sa réponse.

## Démarrer

```bash
npm install
cp .env.example .env.local   # renseignez au moins ANTHROPIC_API_KEY
npx expo start               # web : touche w
```

Le Bluetooth et RevenueCat sont des modules natifs : sur téléphone, utilisez un build de développement plutôt qu'Expo Go.

```bash
npx eas-cli@latest build --profile development --platform android   # ou ios
```

Déploiement du serveur et du site web sur EAS Hosting :

```bash
npx expo export -p web
npx eas-cli@latest deploy
```

Puis renseignez l'URL obtenue dans `app.json` (`plugins` → `expo-router` → `origin`) pour que l'app mobile appelle ce serveur.

## Vérifications

```bash
npm run typecheck
npm run lint
npm test
```

## Prochaines étapes

1. Comptes utilisateurs et synchronisation (carnet, historique), avec un quota gratuit appliqué côté serveur.
2. Contrat avec un fournisseur SIV (plaque) et un fournisseur de données techniques sous licence.
3. Catalogue de pièces compatibles avec prix réels (TecAlliance ou API vendeurs) et identifiants d'affiliation.
4. Préparation du contrôle technique et analyse du procès-verbal de contre-visite.
5. Diagnostic par le bruit, rappels constructeur et pannes connues par moteur.
6. Offre « une panne » à 2,99 € pour ceux qui ne réparent pas eux-mêmes.

Le diagnostic est indicatif et ne remplace pas l'avis d'un professionnel. Freins, direction et haute tension renvoient toujours vers un garage.
