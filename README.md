# Clé de 12

*[Version française](README.fr.md)*

Clé de 12 is a mobile app for AI-assisted car diagnosis and repair. It is built for amateur mechanics and for anyone who wants to understand their car before going to a garage. It runs on iOS, Android and the web. It targets the French car market, and the interface is available in French, English, Spanish, German, Italian and Portuguese. The AI answers in the language the user picks.

## What the app does

- **AI diagnosis**: you give the vehicle, symptoms (free text or quick buttons), fault codes and a photo (Premium). Claude returns:
  - a safety verdict: OK to drive, drive with care, or do not drive;
  - likely causes ranked by probability, with difficulty and parts and garage costs;
  - checks to do, in order.

  When offline or without the AI server, a built-in base of 26 codes and 12 symptoms takes over.
- **OBD2 code reading over Bluetooth** with any ELM327 Bluetooth Low Energy dongle costing €15–30 (Vgate iCar Pro BLE, Veepeak BLE…). It reads confirmed and pending codes, the warning-light state and the VIN, and can clear codes.
- **Live engine data** (Premium):
  - engine speed, road speed, coolant and oil temperature, battery voltage;
  - engine load, fuel trims and mass airflow.

  Out-of-range values are flagged with a plain-language explanation.
- **Free catalog of makes and models**: 101 makes and 1,848 models, built from the open vehicle registries of the EU (EEA), the Netherlands (RDW) and the UK (see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)). Models are filtered by year, and common engines are listed for the most-repaired models. Free-text entry still works.
- **Plate from a photo**: take a picture of the plate or the registration certificate, or pick an image. The AI reads the plate and the app looks the vehicle up.
- **Known issues by engine**, for example the PureTech wet timing belt, the 1.6 HDi turbo, 1.5 dCi bearings and the THP timing chain. They are shown as soon as the vehicle is added and are fed into the diagnosis.
- **Noise finder**: answer two questions (when the noise happens, what it sounds like) to get likely causes. A "do not drive" warning appears when needed.
- **French MOT (contrôle technique)**:
  - a 35-point checklist to run at home before the inspection;
  - photo analysis of the inspection report, defect by defect, with whether you can fix it yourself and what it costs.
- **"Is my quote fair?"**: photograph a garage quote and the app compares each line to market prices.
- **Upcoming maintenance**: a maintenance plan adapted to the engine and matched against the logbook. It handles timing belt or chain, diesel or petrol, and electric cars.
- **Step-by-step guides**: 52 original guides in 12 categories (brakes, cooling, electrics, suspension…), with tools, checkable steps and torque values. Part-replacement guides are Premium, and "Adapt to my car" turns any guide into a repair plan for the user's vehicle.
- **Parts price links** (Oscaro, Mister-Auto, Autodoc) and **garage quote links** (Vroomly, iDGARAGE) for repairs rated 4 or 5 in difficulty. These links are ready for affiliate IDs.
- **"Did it fix the problem?" feedback**, saved with each diagnosis.
- **My garage**: vehicles, a maintenance logbook with PDF export (Premium), and history.

## Plans

| | Free | Premium (€6.99/month or €49/year) |
|---|---|---|
| OBD2 reading, safety verdict, costs | ✓ | ✓ |
| Make and model catalog, known issues | ✓ | ✓ |
| Noise finder, upcoming maintenance, MOT checklist | ✓ | ✓ |
| AI diagnoses | 3 per month | Unlimited |
| Quote analysis | 1 per month | Unlimited |
| MOT report analysis | 1 per month | Unlimited |
| Live engine data | | ✓ |
| Photo, tailored plan, follow-up questions | | ✓ |
| Advanced guides, several vehicles, logbook and PDF export | | ✓ |

A **one-off "single fault" offer at €2.99** gives one full AI diagnosis without a subscription once the free quota is used up.

Subscriptions go through RevenueCat (App Store, Google Play, web). The one-off diagnosis is the `diag_unit` package, a consumable product, in the current RevenueCat offering. Without a RevenueCat key the app runs in **demo mode**: Premium and one-off diagnoses unlock for free on the device.

## Architecture

```
src/
  app/                 Screens (Expo Router) and /api server routes
    (diag)/            Diagnosis, quote, MOT, result
    guides/            Guide list and detail
    api/*+api.ts       session, diagnose, repair-plan, chat, quote, ct, vehicle, plate-photo
  components/          UI (base kit, diagnosis, vehicle, live data, noises, known issues)
  data/                OBD2 codes, symptoms, guides, vehicle catalog, known issues,
                       maintenance, noises, MOT checklist
  features/obd/        ELM327 protocol (pure, tested), OBD session, BLE transport
  lib/                 Shared types, local storage, purchases, partner links, PDF export
  i18n/                Translations (fr, en, es, de, it, pt) and the useT hook
  server/              Claude calls, sessions, Premium and quota checks, rate limits, plate lookup, validation
```

- **AI**:
  - The `/api` routes call the Claude API (`@anthropic-ai/sdk`) with structured outputs validated by Zod. The API key stays on the server.
  - Analysis (diagnosis, photos, quotes, MOT reports, repair plans) uses `claude-sonnet-5-5`. The follow-up chat uses `claude-haiku-5-5`. That costs about half as much as running everything on Opus. You can change both with `CLAUDE_MODEL_ANALYSIS` and `CLAUDE_MODEL_CHAT`.
  - When Claude's safety filters refuse a request, it is retried automatically on a fallback model (`fallbacks: "default"`).
- **Server-side Premium and quotas**: the server issues each install a signed session. Premium routes check the subscription with RevenueCat using the verified ID, and free quotas, one-off diagnoses and rate limits are enforced on the server. See [Security](#security).
- **Technical data**: `src/lib/tech-data.ts` defines the interface for a licensed provider (HaynesPro, ETAI/RTA). Until one is connected, torque values are shown as typical values.
- **Plate lookup**: `src/server/plate-lookup.ts` expects a French vehicle registry (SIV) data provider, set with `PLATE_API_URL` and `PLATE_API_KEY`. Adapt `mapProvider` to its response.

## Getting started

```bash
npm install
cp .env.example .env.local   # set at least ANTHROPIC_API_KEY
npx expo start               # web: press w, then open http://localhost:8081
```

Bluetooth, PDF export and RevenueCat are native modules. On a phone, use a development build rather than Expo Go.

```bash
npx eas-cli@latest build --profile development --platform android   # or ios
```

To deploy the server and website to EAS Hosting:

```bash
npx expo export -p web
npx eas-cli@latest deploy
```

Then put the resulting URL in `app.json` (`plugins` → `expo-router` → `origin`) so the mobile app calls that server.

## Security

- **Sessions**: on first launch the app calls `POST /api/session`. The server picks the user ID and returns it with a token signed with `SESSION_SECRET` (HMAC-SHA256). Every other call sends `Authorization: Bearer <token>`, and the server trusts only the verified ID, which is also the RevenueCat app user ID. Without a valid token, routes return 401. The app then gets a new session and retries once.
- **Server-side limits**: free quotas (3 diagnoses, 1 quote, 1 MOT report per month) are counted per user in Upstash Redis, and only successful AI calls count. Over quota, the server returns 402. Rate limits are 20 AI requests per 10 minutes per user and 60 per IP, with 429 and `Retry-After`. Session creation is limited per IP.
- **One-off diagnoses**: with `REVENUECAT_SECRET_API_KEY` set, the server counts the user's consumable purchases (`non_subscriptions` for `REVENUECAT_CREDIT_PRODUCT_IDS`) minus the credits already used. Without that key, credits work only in the app's demo mode.
- **Input and output**: request bodies, photos (JPEG or PNG only), symptoms, chat and fault codes have size limits. Responses use `no-store`, `nosniff` and `no-referrer`. CORS allows only `ALLOWED_ORIGINS`, and internal errors are never sent to the client.
- **Secrets**: set `SESSION_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` and `REVENUECAT_SECRET_API_KEY` in production (see `.env.example`). Never put a secret in an `EXPO_PUBLIC_*` variable.

Read [SECURITY.md](SECURITY.md) for the threat model, the known limits, and how to report a vulnerability.

## Checks

```bash
npm run typecheck
npm run lint
npm test
```

## Next steps

1. User accounts and sync (logbook, history, credits), with device attestation to stop free-tier farming.
2. Contracts with a SIV plate data provider and a licensed technical data provider.
3. Compatible parts catalog with real prices (TecAlliance or seller APIs) and affiliate IDs.
4. Manufacturer recalls by VIN, and maintenance notifications.
5. Diagnosis from a noise recording, once an audio model has been validated.

Diagnoses are for guidance only and do not replace a professional's opinion. Brakes, steering and high-voltage systems always point the user to a garage.
