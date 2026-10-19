# Clé de 12

*[English version](README.md)*

App mobile de diagnostic et de réparation automobile assistés par IA, pour les mécaniciens amateurs et pour tous ceux qui veulent comprendre leur voiture avant d'aller au garage. Elle tourne sur iOS, Android et le web et elle est pensée pour le parc français. L'interface existe en français, anglais, espagnol, allemand, italien et portugais, et l'IA répond dans la langue choisie.

## Ce que fait l'app

- **Diagnostic IA** : véhicule, symptômes (texte ou boutons rapides), codes défaut et photo (Premium). Claude rend un verdict de sécurité (rouler, prudence, arrêt), des causes classées avec probabilité, difficulté et coûts pièces et garage, et les contrôles à faire dans l'ordre. Sans réseau ou sans serveur IA, une base intégrée de 26 codes et 12 symptômes prend le relais.
- **Lecture des codes OBD2 en Bluetooth** avec n'importe quel dongle ELM327 Bluetooth Low Energy à 15–30 € (Vgate iCar Pro BLE, Veepeak BLE…) : codes confirmés, codes en attente, voyant, VIN, effacement.
- **Données moteur en direct** (Premium) : régime, vitesse, température d'eau et d'huile, tension batterie, charge, corrections de richesse, débitmètre. Les valeurs hors plage sont signalées avec une explication.
- **Catalogue gratuit des marques et modèles** : 101 marques et 1 848 modèles, issus des registres ouverts de l'UE (AEE), des Pays-Bas (RDW) et du Royaume-Uni (voir [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)), filtrés par année, avec les motorisations courantes des modèles les plus réparés. La saisie libre reste possible.
- **Plaque en photo** : photographiez la plaque ou la carte grise, ou choisissez une image. L'IA lit la plaque et l'app retrouve le véhicule.
- **Pannes connues par moteur** (courroie humide du PureTech, turbo du 1.6 HDi, coussinets du 1.5 dCi, chaîne du THP…), affichées dès l'ajout du véhicule et prises en compte par le diagnostic.
- **Identifier un bruit** en deux questions (quand, à quoi il ressemble), avec les causes probables et l'avis « ne roulez pas » quand il le faut.
- **Contrôle technique** : check-list de 35 points à faire chez soi avant le contrôle, et analyse du procès-verbal en photo, défaut par défaut, avec « faisable soi-même » ou non et le coût.
- **« Mon devis est-il normal ? »** : photo d'un devis de garage, comparée ligne par ligne aux prix du marché.
- **Entretien à prévoir** : plan d'entretien adapté au moteur (distribution par courroie ou chaîne, diesel ou essence, électrique), recalé sur le carnet.
- **Guides pas à pas** : 52 guides originaux en 12 catégories (freinage, refroidissement, électricité, suspension…), avec outillage, étapes à cocher et couples de serrage. Les guides de changement de pièces sont Premium, et « Adapter à ma voiture » transforme un guide en plan de réparation pour le véhicule de l'utilisateur.
- **Liens prix des pièces** (Oscaro, Mister-Auto, Autodoc) et **devis garage** (Vroomly, iDGARAGE) pour les réparations de difficulté 4 ou 5, prêts pour l'affiliation.
- **Retour « ça a réglé le problème ? »** enregistré avec chaque diagnostic.
- **Mon garage** : véhicules, carnet d'entretien avec export PDF (Premium), historique.

## Offres

| | Gratuit | Premium (6,99 €/mois ou 49 €/an) |
|---|---|---|
| Lecture OBD2, verdict de sécurité, coûts | ✓ | ✓ |
| Catalogue des marques et modèles, pannes connues | ✓ | ✓ |
| Identifier un bruit, entretien à prévoir, check-list du contrôle technique | ✓ | ✓ |
| Diagnostics IA | 3 par mois | Illimités |
| Analyse de devis | 1 par mois | Illimitée |
| Analyse du procès-verbal de contrôle technique | 1 par mois | Illimitée |
| Données moteur en direct | | ✓ |
| Photo, plan sur mesure, questions de suivi | | ✓ |
| Guides avancés, plusieurs véhicules, carnet et export PDF | | ✓ |

Une offre **« une panne » à 2,99 €** donne un diagnostic IA complet sans abonnement, une fois le quota gratuit épuisé.

L'abonnement passe par RevenueCat (App Store, Google Play, web). Le diagnostic à l'unité est le paquet `diag_unit` (produit consommable) de l'offre RevenueCat courante. Sans clé RevenueCat, l'app est en **mode démo** : Premium et les diagnostics à l'unité se débloquent gratuitement sur l'appareil.

## Architecture

```
src/
  app/                 Écrans (Expo Router) et routes serveur /api
    (diag)/            Diagnostic, devis, contrôle technique, résultat
    guides/            Liste et détail des guides
    api/*+api.ts       session, diagnose, repair-plan, chat, quote, ct, vehicle, plate-photo
  components/          Interface (ui, diagnostic, véhicule, données en direct, bruits, pannes connues)
  data/                Codes OBD2, symptômes, guides, catalogue véhicules, pannes connues,
                       entretien, bruits, check-list du contrôle technique
  features/obd/        Protocole ELM327 (pur, testé), session OBD, transport BLE
  lib/                 Types partagés, stockage local, achats, liens partenaires, export PDF
  i18n/                Traductions (fr, en, es, de, it, pt) et le hook useT
  server/              Appels Claude, sessions, vérification Premium et quotas, limites de débit, plaque, validation
```

- **IA** : les routes `/api` appellent l'API Claude (`@anthropic-ai/sdk`) avec des sorties structurées validées par Zod. L'analyse (diagnostic, photos, devis, contrôle technique, plans) utilise `claude-sonnet-5-5` et le chat de suivi `claude-haiku-5-5`, soit environ deux fois moins cher que de tout faire avec Opus. Ces choix se règlent par `CLAUDE_MODEL_ANALYSIS` et `CLAUDE_MODEL_CHAT`. La clé reste sur le serveur. Les refus des filtres de sécurité sont relancés automatiquement sur un modèle de repli (`fallbacks: "default"`).
- **Premium et quotas côté serveur** : le serveur attribue à chaque installation une session signée. Les routes Premium vérifient l'abonnement auprès de RevenueCat avec l'identifiant vérifié, et le serveur applique les quotas gratuits, les diagnostics à l'unité et les limites de débit. Voir [Sécurité](#sécurité).
- **Données techniques** : `src/lib/tech-data.ts` définit l'interface d'un fournisseur sous licence (HaynesPro, ETAI/RTA). En attendant, les couples sont affichés comme valeurs types.
- **Plaque** : `src/server/plate-lookup.ts` attend un fournisseur SIV (`PLATE_API_URL`, `PLATE_API_KEY`) ; adaptez `mapProvider` à sa réponse.

## Démarrer

```bash
npm install
cp .env.example .env.local   # renseignez au moins ANTHROPIC_API_KEY
npx expo start               # web : touche w, puis http://localhost:8081
```

Le Bluetooth, l'export PDF et RevenueCat sont des modules natifs : sur téléphone, utilisez un build de développement plutôt qu'Expo Go.

```bash
npx eas-cli@latest build --profile development --platform android   # ou ios
```

Déploiement du serveur et du site web sur EAS Hosting :

```bash
npx expo export -p web
npx eas-cli@latest deploy
```

Puis renseignez l'URL obtenue dans `app.json` (`plugins` → `expo-router` → `origin`) pour que l'app mobile appelle ce serveur.

## Sécurité

- **Sessions** : au premier lancement, l'app appelle `POST /api/session`. Le serveur choisit l'identifiant utilisateur et le renvoie avec un jeton signé par `SESSION_SECRET` (HMAC-SHA256). Chaque appel suivant envoie `Authorization: Bearer <jeton>`, et le serveur ne se fie qu'à l'identifiant vérifié, qui est aussi l'identifiant RevenueCat. Sans jeton valide, les routes répondent 401 ; l'app crée alors une nouvelle session et réessaie une fois.
- **Limites côté serveur** : les quotas gratuits (3 diagnostics, 1 devis et 1 procès-verbal de contrôle technique par mois) sont comptés par utilisateur dans Upstash Redis, et seuls les appels IA réussis comptent. Au-delà, le serveur répond 402. Les limites de débit sont de 20 requêtes IA par 10 minutes par utilisateur et de 60 par adresse IP, avec une réponse 429 et `Retry-After`. La création de sessions est limitée par adresse IP.
- **Diagnostics à l'unité** : avec `REVENUECAT_SECRET_API_KEY`, le serveur compte les achats consommables de l'utilisateur (`non_subscriptions` des produits `REVENUECAT_CREDIT_PRODUCT_IDS`) moins les crédits déjà utilisés. Sans cette clé, les crédits ne fonctionnent qu'en mode démo.
- **Entrées et réponses** : la taille du corps, des photos (JPEG ou PNG uniquement), des symptômes, du chat et des codes défaut est limitée. Les réponses portent `no-store`, `nosniff` et `no-referrer`. Le CORS n'accepte que les origines de `ALLOWED_ORIGINS`, et les erreurs internes ne sont jamais renvoyées au client.
- **Secrets** : en production, renseignez `SESSION_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` et `REVENUECAT_SECRET_API_KEY` (voir `.env.example`). Aucun secret ne doit être dans une variable `EXPO_PUBLIC_*`.

[SECURITY.md](SECURITY.md) (en anglais) décrit le modèle de menace, les limites connues et la marche à suivre pour signaler une vulnérabilité.

## Vérifications

```bash
npm run typecheck
npm run lint
npm test
```

## Prochaines étapes

1. Comptes utilisateurs et synchronisation (carnet, historique, crédits), avec attestation de l'appareil contre la multiplication des comptes gratuits.
2. Contrat avec un fournisseur SIV (plaque) et un fournisseur de données techniques sous licence.
3. Catalogue de pièces compatibles avec prix réels (TecAlliance ou API vendeurs) et identifiants d'affiliation.
4. Rappels constructeur par VIN et notifications d'entretien.
5. Diagnostic par enregistrement du bruit, une fois un modèle audio validé.

Le diagnostic est indicatif et ne remplace pas l'avis d'un professionnel. Freins, direction et haute tension renvoient toujours vers un garage.
