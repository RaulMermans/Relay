# Relay

> Marketing reporting workflow automation.

## Current status

Sprint 10 adds a real Shopify GraphQL Admin API 2026-07 adapter and canonical commerce normalizer alongside the permanent fixture-backed CSV pipeline. Labelled synthetic fixtures prove installed-store discovery, store-local date filtering, bounded cursor pagination/retry, safe provider errors, API provenance, one-order grain, and Shopify CSV/API semantic equivalence without contacting a store. The adapter is implemented but live Shopify authorization remains unavailable because Relay has no durable ownership-aware credential store. Meta Ads and Google Ads provider connectors remain not built.

Relay computes deterministic fixture-backed marketing KPIs and Change Intelligence from normalized, Data-Health-gated canonical data. The focused UI still evaluates one CSV at a time and accepts optional current-period dates plus transient MER/CPA targets. Shopify gross revenue remains commerce truth for Revenue/MER/AOV, while Meta/Google attributed revenue remains provider advertising data for same-source ROAS. Analytics has no CSV/API transport branch.

Relay does not yet provide live OAuth, production provider account discovery/fetch, durable connections, a database, causal attribution, statistical anomaly detection, recommendations, AI, dashboards, reports, or PDFs. Shopify network behavior is production-shaped code tested through injected request-scoped credentials and fetch responses; it is not wired to a route or live registry instance and does not survive serverless invocations or deployments.

## Requirements

- Node.js 24 LTS (the project pins 24.14.0)
- npm 11.9.0

## Local development

```text
npm ci
npm run dev
```

Open `http://localhost:3000`. The health endpoint is available at `http://localhost:3000/api/health`.

At `/`, the Shopify API status is shown truthfully as not connected, with no inert connect control. Choose or drop one `.csv` file (up to 5 MiB, 50,000 data rows, 256 columns, and 32,768 characters per field). Review the detected provider's field proposal, optionally select the current period and enter transient MER/CPA targets, normalize the re-upload, review Data Health, then inspect the KPI summary and What Changed facts when execution is allowed. The server owns period filtering, calculation, target evaluation, and interpretation and retains neither raw content, targets, nor mapping state. Warning acknowledgement is local; blocking errors cannot be acknowledged into KPI or Change Intelligence execution.

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

Relay deploys as one Next.js project on Vercel. Its server-side Next.js boundaries deploy with the same project. No database, Prisma schema, migration, provider SDK, OAuth framework, credential store, or production provider configuration is present. Shopify uses native server `fetch`, so Sprint 10 adds no dependency. Live persisted connectors remain blocked until a secure durable server-side persistence and ownership boundary is selected.

## Repository navigation

- Current work: `plan.md`; agent protocol: `CLAUDE.md`
- Product scope: `docs/product/`; architecture: `docs/architecture/`
- Data rules: `docs/data/`; connectors: `docs/integrations/`
- Roadmap: `docs/roadmap/SPRINTS.md`; quality: `docs/qa/`
