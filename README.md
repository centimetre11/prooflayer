# InsightElk — Vibe App Governance Suite

> Provides "proof of continuous due diligence" for apps that grew out of vibe coding into real businesses — entering through a free security check, with governance subscriptions and Compliance Dossiers as the revenue core.

InsightElk is the "Compliance Dossier + insurance" for AI-generated apps (Lovable / Bolt / v0 / Cursor, and more). It runs real external security checks on Supabase-ecosystem apps, deep RLS audits, and daily drift monitoring, distilling every result into a tamper-proof evidence chain — so when an incident happens or a customer runs due diligence, you can prove you're in the clear with one click.

This repository is a complete MVP: **a real, runnable scan engine + deep audits + continuous monitoring alerts + Compliance Dossier + a panic-moment paywall**, built as a full-stack Next.js app.

## Tech Stack

- **Next.js 16 (App Router) + TypeScript + Tailwind v4** — pages + API Route Handlers in one
- **Prisma + PostgreSQL** — first-party data storage (scans / findings / alerts / evidence chain / subscriptions)
- **Playwright (Chromium headless)** — renders real SPAs and intercepts runtime requests to detect leaked secrets
- **Auth.js (next-auth v5) + Resend** — email magic-link sign-in & alert emails (falls back to the console when no key is set)
- **node-cron worker** — a standalone process for daily drift detection and alerting

## Directory Structure

```
app/                      pages + API routes
  page.tsx                entry page / landing (paste a URL for a zero-signup check)
  scan/[id]/              scan progress page (polling + plain-language narration)
  report/[id]/            check report (three numbers / risk cards / re-scan comparison / sharing)
  share/[token]/          read-only shared report
  audit/                  deep RLS audit form
  dashboard/              console + app details (timeline / alerts / dossier / panic panel)
  pricing/                pricing
  login/                  magic-link sign-in
  api/                    scan / audit / share / alerts / compliance / export / cron
lib/
  rules/                  rule engine (regex/entropy/jwt_decode/http_probe) + rulesets
  scanner/                external scan pipeline (Playwright render + extract + score + persist)
  auditor/                deep RLS audit (pg read-only / Management API) + credential envelope encryption
  evidence/               tamper-proof evidence hash chain
  alerts/                 alert state machine (open→ack→resolved) + dedup + fatigue prevention
  monitor/                monitoring loop (shared by the worker and the cron API)
  compliance/             due-diligence response pack generation
worker/monitor.ts         standalone cron worker
prisma/                   schema + seed
```

## Quick Start

### 1. Install dependencies + Chromium

```bash
npm install
npx playwright install chromium
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Generate secrets
npx auth secret            # writes AUTH_SECRET
openssl rand -base64 32    # writes CREDENTIAL_MASTER_KEY
```

(During `npm install`, `postinstall` already generated a `.env` once with random secrets, which you can use directly.)

### 3. Start the database

With Docker:

```bash
docker compose up -d
```

Without Docker: point `DATABASE_URL` in `.env` at any Postgres (e.g. a free Supabase / Neon instance).

### 4. Create tables + seed

```bash
npm run db:push     # or npm run db:migrate
npm run db:seed     # seeds the ruleset (so historical reports stay reproducible) + demo@insightelk.com
```

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000 and paste any Supabase app URL to run a **real** check.

## Real Scan Example

Paste the URL of a public app that uses Supabase on the entry page, and InsightElk will:

1. Render the page with a real browser, capturing the frontend bundle and runtime XHR/fetch;
2. Extract the Supabase project URL and decode the JWT to determine anon / **service_role** (the latter appearing in the frontend is a severe incident);
3. Match various leaked secrets with regex (Stripe / OpenAI / AWS / GitHub / private keys, etc.);
4. Anonymously probe `/auth/v1/settings` to determine whether self-service signup and email confirmation are disabled;
5. Output a plain-language report: **total risk count / the single highest-severity item / estimated minutes to fix**.

### Deep RLS Audit (optional, real)

On the report page, click "Deep RLS Audit" and paste a **read-only connection string** or a **Supabase Management API Token (+ Project Ref)**:

- Read-only connection: enforces `SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY`, querying `pg_class` / `pg_policies` / `pg_proc`;
- Management API: calls `POST /v1/projects/{ref}/database/query` (`read_only: true`);
- Grading: RLS not enabled = High, `USING(true)` = High, `grant to anon` with no policy = Critical, `SECURITY DEFINER` without a fixed search_path = Medium;
- Credentials are used only in memory, never echoed by the API, and **burned after use by default** (envelope-encrypted storage only when you opt to retain them).

## Continuous Monitoring (cron worker)

```bash
# Run one round immediately (forced, handy for testing)
npm run monitor:once

# Resident: runs automatically every day at 03:00, re-scanning monitored apps + alerting only on security regressions
npm run worker
```

Or hit the API with an external scheduler:

```bash
curl -X POST "http://localhost:3000/api/cron/monitor?force=1" -H "x-cron-secret: $CRON_SECRET"
```

Monitoring will: re-scan → write a baseline snapshot + monitoring heartbeat (proof of continuity) → reconcile alerts (open→ack→resolved, fingerprint dedup, ≤2 high-priority notifications per app per 30 days) → send email notifications.

## Compliance Dossier and Panic Moments

- Every scan/monitoring run is appended to the app's **evidence hash chain**: `chain_hash = sha256(prev_hash ‖ payload_hash ‖ created_at)`;
- The app details page lets you "verify evidence chain integrity" — any tampering will be detected;
- The "panic moment" panel uses this to generate a **due-diligence response pack** with one click (a streamlined SIG-Lite questionnaire + an evidence timeline);
- The paywall gates **export/sharing** rather than viewing: viewing is free, exporting requires Indie or above (`GET /api/export/[appId]` returns 402 for the free tier).

## Positioning and Red Lines

- What we sell is "proof of continuous due diligence": monitoring is the hook, the dossier is the asset, governance is the business;
- **We provide detection tooling only, not a security guarantor**; the default is **alert-only, never block**; marketing avoids absolute claims.

## Out of Scope for This MVP (aligned with plan P1/P2)

RUM SDK, ClickHouse event pipeline, anomalous traffic, full SOC2 mapping, enterprise governance panel / SSO, Slack/SMS alerts, payment gateway integration.
