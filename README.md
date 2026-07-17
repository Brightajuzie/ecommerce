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

### Hosting the database on Supabase

Supabase gives you a managed PostgreSQL instance — this project doesn't use any Supabase-specific
features (auth, storage, realtime), just the plain Postgres connection string, so it's a drop-in
replacement for the local/native Postgres setup described above.

1. Create a project at [supabase.com](https://supabase.com/dashboard) (free tier is enough to
   start). Pick a strong database password when prompted — you'll need it in the connection string.
2. In the project dashboard, go to **Project Settings → Database → Connection string** and copy
   **two** URIs:
   - The **Transaction pooler** (port `6543`) — most PaaS hosts (e.g. Render) are IPv4-only, and
     Supabase's *direct* connection is IPv6-only, so the pooler is what the running app should
     actually connect through day to day.
   - The **Direct connection** (port `5432`) — needed only for running migrations, since the
     pooler's transaction mode doesn't support the advisory locks `prisma migrate` takes.
3. Set the pooler URL as `DATABASE_URL` and the direct URL as `DIRECT_URL` wherever the API runs
   (`apps/api/prisma/schema.prisma` already declares both — `directUrl` falls back to being unused
   for any non-pooled setup, e.g. local dev, where both vars can just be identical):
   ```
   DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
   DIRECT_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
   ```
4. Run migrations against it once, from your machine or a one-off CI/deploy step (both vars need
   to be set, since `migrate deploy` reads `DIRECT_URL` per the schema):
   ```bash
   DATABASE_URL="<pooler URL>" DIRECT_URL="<direct URL>" pnpm --filter api exec prisma migrate deploy
   ```
5. Optionally seed it the same way — only against a fresh project; the seed script upserts fixed
   sample data, which is fine to re-run but not something you want against a database with real
   customer data:
   ```bash
   DATABASE_URL="<pooler URL>" DIRECT_URL="<direct URL>" pnpm --filter api exec prisma db seed
   ```

### Hosting the API on Render

A `render.yaml` [Blueprint](https://render.com/docs/blueprint-spec) is already set up at the repo
root, so Render can create and configure the service from the repo directly:

```yaml
services:
  - type: web
    name: ikstore-api
    runtime: node
    buildCommand: pnpm install --frozen-lockfile && pnpm --filter @ikstore/shared build && pnpm --filter api build
    startCommand: node apps/api/dist/main.js
    healthCheckPath: /api/v1/health
```

**Steps:**
1. Push this repo to GitHub (already done if you're reading this from the hosted repo).
2. In the Render dashboard: **New → Blueprint**, connect the repo, and Render will detect
   `render.yaml` and propose the `ikstore-api` service automatically.
3. Before the first deploy, Render will prompt for the env vars marked `sync: false` in
   `render.yaml` — at minimum you need `DATABASE_URL` (your Supabase connection string from
   above). The rest (`CORS_ORIGIN`, payment/Cloudinary/Smile ID keys) can be left blank and filled
   in later; those integrations return a clear `502` when unconfigured rather than crashing, per
   the existing pattern in this README.
4. `JWT_SECRET` and `JWT_REFRESH_SECRET` are marked `generateValue: true`, so Render generates
   strong random secrets for you automatically — you don't need to supply these.
5. Deploy. Render builds and runs `apps/api/dist/main.js` directly (no Docker needed) and exposes
   it at `https://ikstore-api.onrender.com` (or whatever you rename the service to — if you
   rename it, update the `APP_URL` env var to match, since Render doesn't know that URL until
   after the first deploy assigns it).
6. Once live, come back to `CORS_ORIGIN` and set it to your web app's domain (see the Vercel
   section below) so browser requests aren't blocked, and redeploy.

**Free-tier note**: Render's free web services spin down after 15 minutes of inactivity and take
~30-60s to cold-start on the next request — fine for testing, not for a production launch. Upgrade
to a paid plan (or switch `plan: free` to `plan: starter` in `render.yaml`) once you're past
testing.

### Deploying the web app to Vercel

Vercel hosts static sites, not long-running stateful servers — so what goes there is the mobile
app's **web export** (`expo export -p web`), not the NestJS API. Deploy the API separately first
(see above) on a platform that runs a persistent Node process, then point the web build at it.

A root-level `vercel.json` is already set up for this pnpm workspace:

```json
{
  "buildCommand": "pnpm --filter @ikstore/shared build && pnpm --filter mobile build:web",
  "outputDirectory": "apps/mobile/dist",
  "installCommand": "pnpm install"
}
```

**Steps:**
1. Import the repo into Vercel (dashboard → Add New → Project). Leave the project's Root Directory
   as the repo root — `vercel.json` already handles building from there, including the
   `@ikstore/shared` workspace package, which Expo's bundler needs pre-compiled (see the
   `eas-build-post-install` note above — the same requirement applies here).
2. In the Vercel project's Environment Variables, set `EXPO_PUBLIC_API_URL` to your **deployed**
   API's URL (e.g. `https://your-api.example.com/api/v1`) — not `localhost`. This is baked into
   the JS bundle at build time (Expo's `EXPO_PUBLIC_*` convention), so redeploy on Vercel any time
   the API's URL changes.
3. Deploy. Vercel auto-detects pushes to your configured branch.
4. Once you have the Vercel domain, set `CORS_ORIGIN` on the **API** deployment to that domain
   (comma-separated if you also keep a preview domain) and redeploy the API — without this,
   the browser will block API requests from the Vercel-hosted site.

**Known limitations of the web build** (pre-existing, not Vercel-specific): biometric login and
the native selfie-capture KYC flow have no web equivalent — `expo-local-authentication` and the
camera/selfie step simply aren't available in a browser. Guest cart and auth session storage both
already fall back to `localStorage` on web (via the app's `secureStorage` wrapper), so those work
identically to native.

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
