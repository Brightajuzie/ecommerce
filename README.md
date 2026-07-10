# IkStore — Multivendor E-commerce Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A cross-platform (iOS/Android) multivendor marketplace: buyers browse and buy from many
independent vendors in one app; vendors manage their own catalog and fulfillment; payments
run through Flutterwave and Opay. Built as an MVP scaffold — solid foundations, ready to grow.

## Stack

- **API**: NestJS + Prisma + PostgreSQL, JWT auth, Swagger docs, structured logging (pino),
  rate limiting, class-validator DTOs.
- **Mobile**: React Native (Expo, TypeScript), React Navigation, TanStack Query, Zustand,
  react-hook-form + zod.
- **Shared**: `@ikstore/shared` — TypeScript types + zod schemas used by both apps.
- **Payments**: Flutterwave (Standard Checkout, primary) and Opay (Cashier Checkout, secondary),
  both as hosted checkout links opened in an in-app WebView.
- **Images**: Cloudinary — uploads (product photos, logo, home-page slides) are enhanced
  automatically on upload (auto contrast/brightness via Cloudinary's `e_improve`, plus
  auto-format/quality and a 2000px size cap).
- **Biometric login**: `expo-local-authentication` — after one password login, Face ID/Touch
  ID/fingerprint can unlock the app on return instead of retyping credentials.
- **Vendor KYC**: Smile ID (`smile-identity-core`) — biometric identity verification (selfie
  matched against a national ID) for vendor onboarding, reviewed by an admin alongside the
  existing approval flow.

## Repo layout

```
ikstore/
  apps/
    api/       NestJS backend
    mobile/    Expo React Native app
  packages/
    shared/    @ikstore/shared — types + zod schemas
```

## Prerequisites

- Node.js 18+, [pnpm](https://pnpm.io) (`npm install -g pnpm`)
- PostgreSQL 14+, reachable locally. Either:
  - **Docker**: `pnpm db:up` starts Postgres via `docker-compose.yml` (user/pass/db: `ikstore`), or
  - **Native install**: create a database and a role with `CREATEDB` (needed for Prisma's shadow
    database during `migrate dev`):
    ```sql
    CREATE ROLE ikstore LOGIN PASSWORD 'ikstore' CREATEDB;
    CREATE DATABASE ikstore OWNER ikstore;
    ```
- Expo Go app (iOS/Android) or a simulator, for running the mobile app.
- Flutterwave and Opay **sandbox/test** API keys, for exercising payments (see below).
- A free [Cloudinary](https://cloudinary.com) account, for exercising image uploads (logo,
  slides, product photos) — see below.
- A [Smile ID](https://usesmileid.com) partner account, for exercising vendor identity
  verification — see below.

## Setup

```bash
pnpm install
pnpm --filter @ikstore/shared build   # shared package compiles to dist/, rebuild after editing it

cp apps/api/.env.example apps/api/.env       # fill in JWT secrets + gateway keys
cp apps/mobile/.env.example apps/mobile/.env

pnpm db:up            # if using Docker; skip if you set up Postgres natively
pnpm db:migrate        # applies prisma/migrations against DATABASE_URL
pnpm db:seed           # creates an admin, two vendors (electronics/fashion + groceries/food)
                       # with 18 sample products across 5 categories, and a buyer account
```

Seeded accounts (password shown next to each):
| Role   | Email                  | Password    |
|--------|------------------------|-------------|
| Admin  | admin@test.com         | 12345       |
| Vendor | vendor@ikstore.dev     | 12345       |
| Vendor | freshmart@ikstore.dev  | 12345       |
| Buyer  | buyer@ikstore.dev      | 12345       |

## Running

```bash
pnpm dev:api      # Nest API on http://localhost:3000, Swagger UI at /docs
pnpm dev:mobile   # Expo dev server — scan the QR code with Expo Go, or press i/a for a simulator
```

The mobile app reads its API base URL from `EXPO_PUBLIC_API_URL` (`apps/mobile/.env`).
Adjust it per platform since "localhost" means different things on each:
- iOS simulator: `http://localhost:3000/api/v1`
- Android emulator: `http://10.0.2.2:3000/api/v1`
- Physical device: `http://<your-computer's-LAN-IP>:3000/api/v1`

## Testing

```bash
pnpm test:api                                  # unit tests
pnpm --filter api test:e2e                     # e2e smoke test (hits the real DB — register/login/browse)
```

## Payments

Both gateways are integrated as **hosted checkout redirects**: the API asks the gateway for a
checkout URL, the mobile app opens it in a WebView, and the gateway's server-to-server webhook
(not the browser redirect) is the source of truth for marking an order paid.

- **Flutterwave** — uses the Standard Checkout v3 API (`/v3/payments`, secret-key Bearer auth).
  Webhook signature is verified per Flutterwave's currently documented scheme: HMAC-SHA256 over
  the raw request body, base64-encoded, compared against the `flutterwave-signature` header. Set
  `FLW_SECRET_KEY`, `FLW_PUBLIC_KEY`, and `FLW_WEBHOOK_HASH` (the secret hash you configure as
  your webhook secret in the Flutterwave dashboard) in `apps/api/.env`.
- **Opay** — uses the Cashier Checkout "create order" API. Webhook signature is verified via
  HMAC-SHA3-512 over a fixed template built from the callback payload, keyed with your Opay
  secret key. Set `OPAY_MERCHANT_ID`, `OPAY_PUBLIC_KEY`, `OPAY_SECRET_KEY`.

  **Before going live**, re-verify the exact request/response fields and signing details for
  both gateways against your own sandbox dashboard and a real test webhook event — payment
  provider APIs change over time, and Opay in particular has multiple product lines with
  slightly different contracts. The integration code lives in
  `apps/api/src/payments/flutterwave/` and `apps/api/src/payments/opay/` if you need to adjust it.

Without gateway keys configured, `/payments/initiate` returns a clear `502` instead of a
misleading crash — useful for developing the rest of the app before you have sandbox credentials.

## Image uploads & storefront customization

`POST /uploads/image` (any authenticated user, ~5MB limit, JPEG/PNG/WEBP/GIF only) proxies
through Cloudinary and applies an enhancement + optimization transform on every upload — this is
shared by three flows: vendors adding product photos, and admins uploading a store logo or
home-page slide images. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
in `apps/api/.env` (from your Cloudinary console) to exercise it; without them the endpoint
returns a clear `502`, same pattern as the payment gateways.

Admins manage the storefront from the **Store Settings** and **Slides** tabs (mobile app, admin
role): brand colors (preset swatches + hex input) and logo apply live via `GET/PATCH /settings`;
home-page banners are managed via `GET/POST/PATCH/DELETE /slides` plus a `PATCH /slides/reorder`
for drag-free up/down reordering. Buyers see the configured colors (buttons, active tabs/chips)
and slides without needing to be logged in — `/settings` and `/slides` are public reads.

## Guest browsing & cart

Anyone can browse products, view details, and build a cart without an account — `/products`,
`/categories`, `/settings`, and `/slides` are public reads, and guest cart items live entirely
client-side (`apps/mobile/src/store/guestCartStore.ts`, persisted the same way the auth session
is). Sign-in/registration is only required at checkout: tapping "Checkout" on a guest cart routes
to Login/Register first, and on success the local cart is pushed to the now-authenticated user's
server-side cart (`syncGuestCartToServer`) before continuing straight to Checkout.

## Vendor identity verification (Smile ID)

Vendors can submit a selfie + government ID number for biometric verification from the "pending
approval" screen (`POST /kyc/verify`, multipart: selfie file + `idType`/`idNumber`/`country`).
This uses Smile ID's Biometric KYC job type via their official `smile-identity-core` SDK — the
real submission protocol (a signed, multi-image ZIP upload to a pre-signed URL) isn't something
to hand-roll, so the SDK's `WebApi.submit_job` is used directly rather than reimplementing it.
Set `SMILE_ID_PARTNER_ID`, `SMILE_ID_API_KEY`, `SMILE_ID_ENVIRONMENT` (`sandbox`/`production`) in
`apps/api/.env` (from your Smile ID partner portal) to exercise it; without them `/kyc/verify`
returns a clear `502`, same pattern as the other third-party integrations.

The job result arrives asynchronously via `POST /kyc/webhook` (signature-verified using the SDK's
`Signature.confirm_signature`, the same HMAC scheme Smile ID uses for outbound request signing).
Verification is **informational, not a hard gate** — admins still approve/reject vendors manually
via the existing `PATCH /vendors/:id/approve` flow, now with a color-coded verification badge
(not started / pending / verified / failed) next to each pending application. This keeps a human
in the loop, since automated KYC can false-negative.

**Before going live**, confirm the webhook payload shape (`job_id`/`job_success` field names and
nesting) against a real Smile ID sandbox event — their docs site blocks automated fetching, so
this was built from the SDK's public TypeScript source (`smile-identity-core-js` on GitHub) and a
web search summary of the job-status response fields, not a live test. The code defensively
checks a couple of likely field locations, but that's not a substitute for testing against a real
callback. Selfie capture currently uses the photo library picker (`expo-image-picker`), not a
live camera prompt — a live-camera capture would be a stronger anti-spoofing measure worth adding
before production use.

## Biometric login

Opt in from the Profile tab (any role). It's a saved-session unlock, not a second auth factor
server-side: the JWT refresh token already sits in secure storage after a normal login, and
enabling the toggle just gates the next app open behind a biometric prompt
(`expo-local-authentication`) before revealing that session. Disabling it removes the gate.
Web preview can't exercise real Face ID/Touch ID/fingerprint prompts — verify on a physical
device or simulator.

## What's deliberately out of scope for this MVP

These are natural next phases, not oversights:
- **Automated vendor payouts.** The schema tracks each vendor's owed amount
  (`VendorOrder.vendorPayoutAmount`) as a ledger, but settlement to vendor bank accounts is
  manual for now. Flutterwave Subaccounts is the documented upgrade path for automatic splits.
- **Reviews & ratings, push notifications, full-text search** (currently basic `ILIKE` search).
- **Dedicated web dashboards** for vendors/admins — the mobile app currently covers all three
  roles (buyer/vendor/admin) with role-based views in one codebase.
- **Custom color-wheel picker** — Store Settings uses preset swatches + a hex input rather than
  pulling in a third-party color-wheel component for marginal gain.
- **Live-camera selfie capture for KYC** — currently a photo library pick; a real camera prompt
  is a meaningful anti-spoofing improvement worth adding before production use.

## Deploying to production

```bash
pnpm --filter api build       # compiles apps/api to apps/api/dist
pnpm --filter api exec prisma migrate deploy   # applies migrations without prompting or diffing schema
node apps/api/dist/main.js    # or: pnpm --filter api start:prod
```

Beyond the gateway/Cloudinary/Smile ID keys already covered above, set these before running in
production:

| Var              | Purpose                                                                 |
|-------------------|--------------------------------------------------------------------------|
| `CORS_ORIGIN`     | Comma-separated list of allowed browser origins. Leave unset in dev (any origin allowed); set explicitly for any browser-based client (e.g. a future admin web dashboard) — the mobile app isn't a browser origin and is unaffected either way. |
| `TRUST_PROXY`     | Set to `true` only when the API sits behind a reverse proxy/load balancer that sets `X-Forwarded-*` headers. Affects client IP detection used by rate limiting and request logging. |
| `SWAGGER_ENABLED` | Set to `false` to unmount `/docs` in production if you don't want the API surface publicly documented. |

Also worth knowing:
- `GET /health` pings the database (`SELECT 1`) and returns `503` if it's unreachable, rather than
  just confirming the process is alive — point an orchestrator's readiness probe at it so traffic
  isn't routed to an instance that's up but can't serve requests.
- `/auth/register`, `/auth/login`, and `/auth/refresh` are throttled tighter than the rest of the
  API (10 req/min vs the global 100 req/min) to slow down credential-stuffing attempts.
- The process exits with a logged error on startup failure (e.g. bad `DATABASE_URL`) instead of
  hanging or silently swallowing an unhandled rejection — check process logs/exit code in your
  deployment platform if the API doesn't come up.
- `app.enableShutdownHooks()` is on, so `SIGTERM`/`SIGINT` (container stop, rolling deploy) let
  Nest run its shutdown lifecycle, including Prisma's `$disconnect()`, instead of dropping
  connections mid-request.

## Architecture notes

- **Multivendor checkout**: a buyer's cart can span several vendors. Checkout
  (`POST /orders/checkout`) groups cart items by vendor into one `Order` plus one `VendorOrder`
  per vendor, computing each vendor's commission from their `VendorProfile.commissionRate`
  (defaults to 10%). See `apps/api/src/orders/orders.service.ts`.
- **Auth**: JWT access + refresh tokens (bcryptjs for hashing — chosen over native `bcrypt` to
  avoid requiring a C++ build toolchain on every dev machine). Role-based guards
  (`BUYER`/`VENDOR`/`ADMIN`) via `RolesGuard` + `@Roles()`.
- **Vendor onboarding**: registering with `role: VENDOR` creates a `VendorProfile` in `PENDING`
  status; an admin must approve it (`PATCH /vendors/:id/approve`) before the vendor can list
  products. The mobile app shows a "pending approval" screen until then, where the vendor can
  also submit identity verification (see Vendor identity verification above).
