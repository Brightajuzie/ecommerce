# IkStore — Multivendor E-commerce Platform

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

## Setup

```bash
pnpm install
pnpm --filter @ikstore/shared build   # shared package compiles to dist/, rebuild after editing it

cp apps/api/.env.example apps/api/.env       # fill in JWT secrets + gateway keys
cp apps/mobile/.env.example apps/mobile/.env

pnpm db:up            # if using Docker; skip if you set up Postgres natively
pnpm db:migrate        # applies prisma/migrations against DATABASE_URL
pnpm db:seed           # creates an admin, a sample vendor + 3 products, and a buyer account
```

Seeded accounts (password shown next to each):
| Role   | Email               | Password    |
|--------|---------------------|-------------|
| Admin  | admin@ikstore.dev   | Admin123!   |
| Vendor | vendor@ikstore.dev  | Vendor123!  |
| Buyer  | buyer@ikstore.dev   | Buyer123!   |

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

## What's deliberately out of scope for this MVP

These are natural next phases, not oversights:
- **Automated vendor payouts.** The schema tracks each vendor's owed amount
  (`VendorOrder.vendorPayoutAmount`) as a ledger, but settlement to vendor bank accounts is
  manual for now. Flutterwave Subaccounts is the documented upgrade path for automatic splits.
- **Reviews & ratings, push notifications, full-text search** (currently basic `ILIKE` search).
- **Image upload/CDN pipeline** — product images are plain URLs today (paste a hosted image URL).
- **Dedicated web dashboards** for vendors/admins — the mobile app currently covers all three
  roles (buyer/vendor/admin) with role-based views in one codebase.

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
  products. The mobile app shows a "pending approval" screen until then.
