# Security

This document describes how Clé de 12 protects its server, its paid features and its users, which secrets it needs, and what it does not try to protect. The app interface is in French; this document is in English for contributors and security researchers.

## Reporting a vulnerability

Please do not open a public GitHub issue for security problems.

- Use GitHub's private vulnerability reporting: **Security** tab → **Report a vulnerability** on this repository.
- Include the affected route or screen, steps to reproduce and the impact you observed.
- We aim to acknowledge reports within 3 working days and to fix confirmed high-severity issues within 30 days. We will credit you in the fix unless you ask us not to.

Please test only against your own installation or a development build. Do not run load tests, attempt to access other users' data, or run up AI costs on the production server.

## Threat model

The assets worth protecting are:

1. **Server-side API keys**: Anthropic (Claude), RevenueCat secret key, Upstash and the plate-lookup provider. A leaked key costs money directly.
2. **Paid features**: Premium (subscription) and one-off diagnoses (`diag_unit` consumable). Bypassing them costs revenue and AI spend.
3. **AI spend**: every `/api` call that reaches Claude costs money, even for free users.
4. **User data**: vehicles, symptoms, photos of quotes and MOT reports. Today these stay on the device, except for what is sent to `/api` for a single analysis. The server does not store them.

The attackers we consider are an anonymous person calling `/api` directly (curl, scripts), a user who modifies their own app or its local storage, a malicious website calling `/api` from a browser, and text planted in a photo or a message to steer the AI (prompt injection).

## What is protected, and how

| Risk | Protection | Code |
|---|---|---|
| Impersonating a Premium user by sending their user ID | The server mints the user ID and signs it (HMAC-SHA256 with `SESSION_SECRET`). Every route requires `Authorization: Bearer <token>` and uses only the verified ID. Signatures are compared in constant time, and malformed tokens are rejected. | `src/server/session.ts`, `src/app/api/session+api.ts` |
| Premium checked on the client only | Premium routes (photo diagnosis, repair plan, chat) check the entitlement with the RevenueCat REST API, using the verified ID. | `src/server/entitlements.ts` |
| Free quotas bypassed by clearing app storage | Quotas are counted on the server, per verified user and per calendar month (UTC): 3 diagnoses, 1 quote analysis, 1 MOT report analysis. Units are reserved atomically before the AI call and given back if the call fails, so only successful calls count. Over quota, the server returns 402. | `src/server/limits.ts`, `src/server/usage-store.ts` |
| One-off diagnoses forged on the device | When `REVENUECAT_SECRET_API_KEY` is set, the server counts the user's consumable purchases (`non_subscriptions`) and subtracts the credits it has already consumed. | `src/server/entitlements.ts`, `src/server/limits.ts` |
| Minting new sessions to get fresh free quotas | Session creation is limited to 10 per hour per IP address. | `src/server/limits.ts` |
| Scripted abuse and cost attacks | Rate limits: 20 AI requests per 10 minutes per user and 60 per 10 minutes per IP, with 429 and `Retry-After`. Plate lookups have their own, lower limits. | `src/server/limits.ts`, `src/server/http.ts` |
| Oversized or malformed input | Bodies over 6 MiB get 413. Photos must be valid base64 of a JPEG or PNG (checked by magic bytes) and at most 5 MiB of base64 (about 3.75 MiB decoded, also Claude's per-image limit). Symptoms are capped at 2,000 characters, chat at 12 messages of 2,000 characters, and fault codes at 20 matching `^[PCBU][0-3][0-9A-F]{3}$`. | `src/server/requests.ts` |
| Prompt injection | The system prompt tells Claude that text in photos, quotes, MOT reports and user messages is data, never instructions, and never to reveal the system prompt. Outputs are also constrained by Zod schemas (structured outputs). | `src/server/claude.ts` (`PERSONA`) |
| Browser-based abuse (CSRF-style calls from another site) | CORS: browsers may call `/api` only from the server's own origin or from `ALLOWED_ORIGINS`. Other origins get 403. Native apps send no `Origin` header and are allowed. Requests also need a bearer token, which a third-party site does not have. | `src/server/http.ts` |
| Information leaks | Every API response carries `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`. Internal errors are logged on the server, and the client receives only a generic French message. | `src/server/http.ts` |
| Leaked server keys | Server secrets are read only in `src/server/*` and `+api.ts` files, which are never bundled into the app. Nothing secret uses the `EXPO_PUBLIC_` prefix. | `.env.example` |
| Vulnerable dependencies | CI runs `node scripts/audit.js`, which fails on any high or critical advisory in production dependencies except the IDs listed, with a reason, in its `ALLOWED` list. | `scripts/audit.js`, `.github/workflows/ci.yml` |

## Server secrets and configuration

Set these as EAS Hosting environment variables (`npx eas-cli@latest env:create`) or in `.env.local` for local development. Never commit them, and never prefix them with `EXPO_PUBLIC_`: anything with that prefix is compiled into the app and readable by anyone.

| Variable | Required in production | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude API. Without it, AI routes return 503. |
| `SESSION_SECRET` | Yes | Signs session tokens. Without it, every route returns 503 in production. In development a fixed, public dev secret is used and a warning is logged. Generate it with `openssl rand -base64 48`. |
| `SESSION_SECRET_PREVIOUS` | No | The previous secret during a rotation, still accepted for verification. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Yes | Counters for quotas, consumed credits and rate limits. Without them the server falls back to in-memory counters. Those are per instance and reset on restart, so they are **not reliable in production**. |
| `REVENUECAT_SECRET_API_KEY` | Yes | Server-side Premium and credit checks. Without it, development trusts the app's demo mode (everyone is Premium), and in production nobody is Premium and one-off credits cannot be verified. |
| `REVENUECAT_ENTITLEMENT` | No | Entitlement name. Defaults to `premium`. |
| `REVENUECAT_CREDIT_PRODUCT_IDS` | If credits are sold | Store product IDs of the one-off diagnosis (comma list). Defaults to `diag_unit`. RevenueCat groups consumables by product ID, not by package ID. |
| `ALLOWED_ORIGINS` | If the web app is served from another origin | Comma-separated browser origins allowed to call `/api`. |
| `PLATE_API_URL`, `PLATE_API_KEY` | For plate lookup | French vehicle registry (SIV) data provider. |

**Rotating `SESSION_SECRET`.** The token carries the user ID that is also the RevenueCat app user ID. If the secret changes with no transition, every device gets a new ID, and subscribers must tap "Restore purchases" to move their subscription. To rotate, move the old value to `SESSION_SECRET_PREVIOUS`, set the new one, and keep both until active users have refreshed. Today tokens never expire, so the old secret must stay as long as old tokens are in use. Plan token renewal before relying on rotation.

## What is not protected, or not feasible

- **Tamper-proofing the client.** Anything in the app can be read and modified by its owner: the JavaScript bundle, AsyncStorage (where the session token is stored), and the local usage and credit counters. The server enforces what matters (identity, Premium, quotas, credits and rate limits). Local counters are only for display. Ship only store-signed builds made with EAS Build (`npx eas-cli@latest build`), and let the App Store and Google Play handle code signing. Device attestation (App Attest, Play Integrity) is not implemented.
- **Free-tier farming.** A determined attacker can still mint sessions from many IP addresses, and each new session gets the monthly free quota. Per-IP limits make this slower and more expensive, but they do not stop it. Real accounts or device attestation would be needed.
- **IP-based limits behind other proxies.** On EAS Hosting (Cloudflare), `cf-connecting-ip` is set by the platform and cannot be spoofed. Behind another host, `X-Forwarded-For` may be client-controlled, so IP limits would be weaker there.
- **Consumable credits without RevenueCat.** Without `REVENUECAT_SECRET_API_KEY`, one-off diagnoses work only in the app's demo mode. Credits bought before the server-side check existed, or under an earlier user ID, are not counted on the server.
- **Upstash outages.** If the counter store is unreachable, AI routes fail closed (generic 500) instead of running without limits.
- **Prompt injection** is reduced, not eliminated. The model can still be steered within its schema, for example into a wrong price assessment. Diagnoses are for guidance only, and safety-critical systems always point the user to a garage.
- **Data at rest on the device** is not encrypted beyond what the OS provides.

## Known follow-ups

- Two high advisories have no fixed release as of October 2026 and are allowlisted in `scripts/audit.js`. Both come in through `expo` build tooling (Metro and the Expo CLI), not through code that runs in the app or on the server: `braces` <= 3.0.3 ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)) and `node-forge` <= 1.4.0 ([GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv)). The script reports an entry once it is no longer needed, so remove it when the fixes ship.
- Consumable verification counts all `non_subscriptions` entries for the credit product, including sandbox purchases. Refunded transactions depend on RevenueCat removing them. Revisit this when accounts arrive.
- Add token renewal (short-lived access tokens) so that `SESSION_SECRET` can be rotated without keeping old secrets indefinitely.
- Move the session token to `expo-secure-store` (Keychain and Keystore) instead of AsyncStorage.
