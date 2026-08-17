# Relay

> A focused performance dashboard with recurring reporting automation.

## Current status

Sprint 14 adds browser-local client and report-cycle memory to Relay's daily performance workspace. Meta Ads, Google Ads, and Shopify can be monitored together from manually supplied CSVs; returning users can restore the active client's latest dashboard, see explicit freshness, and reuse source expectations, safe mappings, targets, rules, notes, and reporting preferences. All three read-only API adapters are implemented, but live authorization and automatic synchronization remain unavailable because Relay has no durable ownership-aware credential store; Google additionally needs approved developer-token access.

Relay computes deterministic fixture-backed marketing KPIs and Change Intelligence from normalized, Data-Health-gated canonical data. Shopify gross revenue remains commerce truth for Revenue/MER/AOV, while Meta/Google attributed revenue remains provider advertising data for same-source ROAS. Analytics has no CSV/API transport branch.

Relay is not a real-time BI platform and does not yet provide live OAuth, production provider account discovery/fetch, automatic refresh, cloud/multi-device persistence, a database, authentication, causal attribution, statistical anomaly detection, recommendations, AI, generated reports, or PDFs. Browser memory belongs to one browser and may disappear when site data is cleared. Shopify, Meta, and Google network behavior is production-shaped code tested through injected request-scoped credentials and fetch responses; none is wired to a live product connection or survives serverless invocations/deployments.

## Requirements

- Node.js 24 LTS (the project pins 24.14.0)
- npm 11.9.0

## Local development

```text
npm ci
npm run dev
```

Open `http://localhost:3000`. The health endpoint is available at `http://localhost:3000/api/health`.

At `/`, create a named local client, choose a reporting period, and add up to one current CSV for Meta Ads, Google Ads, and Shopify. Relay revalidates every file at `POST /api/workspace/analyze`, prepares deterministic and compatible remembered mappings automatically, and reveals only unresolved fields. The server combines canonical observations in request memory, then runs Data Health, KPI, and Change Intelligence once. The dashboard presents formatted KPIs, a truthful Shopify-revenue/paid-spend trend, curated What Changed facts, channel summaries, Attention, progressive Data Health detail, explicit data-through/analysis time, and bounded recent-cycle summaries.

Relay stores one versioned, validated document under its own browser-storage key. It contains non-sensitive client configuration and compact derived dashboard/history state only. Raw CSVs, filenames, canonical rows, provider payloads, authorization headers, tokens, and credentials are never persisted. Client delete and Relay-only reset are available in the compact client settings.

The dashboard's source cards accurately state that CSV is available while live API authorization and automatic synchronization are unavailable. There are no inert Connect controls and no claim that uploaded data is live.

## Commands

```text
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Deployment and persistence

Relay deploys as one Next.js project on Vercel. Its server-side Next.js boundaries deploy with the same project. Browser-local memory needs no Vercel database, but it is not cloud persistence. No database, Prisma schema, database migration, provider SDK, OAuth framework, credential store, or production provider configuration is present. Live persisted connectors remain blocked until a secure durable server-side persistence and ownership boundary is selected.

## Repository navigation

- Current work: `plan.md`; agent protocol: `CLAUDE.md`
- Product scope: `docs/product/`; architecture: `docs/architecture/`
- Data rules: `docs/data/`; connectors: `docs/integrations/`
- Roadmap: `docs/roadmap/SPRINTS.md`; quality: `docs/qa/`
