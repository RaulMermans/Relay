# Relay

> Marketing reporting workflow automation.

## Current status

Sprint 12 adds a real Google Ads API v25 read-only adapter and canonical advertising normalizer alongside the permanent fixture-backed CSV pipeline, Shopify adapter, and Meta adapter. Labelled synthetic fixtures prove direct/manager customer discovery, server-validated reporting-customer selection, manager login context, daily ad-group GAQL Search, bounded page-token pagination/retry, safe provider errors, cost-micros conversion, primary conversions/value semantics, API provenance, and Google CSV/API semantic equivalence without contacting Google. All three provider adapters are implemented, but live authorization remains unavailable because Relay has no durable ownership-aware credential store; Google additionally needs approved developer-token access.

Relay computes deterministic fixture-backed marketing KPIs and Change Intelligence from normalized, Data-Health-gated canonical data. The focused UI still evaluates one CSV at a time and accepts optional current-period dates plus transient MER/CPA targets. Shopify gross revenue remains commerce truth for Revenue/MER/AOV, while Meta/Google attributed revenue remains provider advertising data for same-source ROAS. Analytics has no CSV/API transport branch.

Relay does not yet provide live OAuth, production provider account discovery/fetch, durable connections, a database, causal attribution, statistical anomaly detection, recommendations, AI, dashboards, reports, or PDFs. Shopify, Meta, and Google network behavior is production-shaped code tested through injected request-scoped credentials and fetch responses; none is wired to a route or live registry instance or survives serverless invocations/deployments.

## Requirements

- Node.js 24 LTS (the project pins 24.14.0)
- npm 11.9.0

## Local development

```text
npm ci
npm run dev
```

Open `http://localhost:3000`. The health endpoint is available at `http://localhost:3000/api/health`.

At `/`, the Shopify, Meta Ads, and Google Ads API statuses are shown truthfully as not connected, with no inert connect controls. Choose or drop one `.csv` file (up to 5 MiB, 50,000 data rows, 256 columns, and 32,768 characters per field). Review the detected provider's field proposal, optionally select the current period and enter transient MER/CPA targets, normalize the re-upload, review Data Health, then inspect the KPI summary and What Changed facts when execution is allowed. The server owns period filtering, calculation, target evaluation, and interpretation and retains neither raw content, targets, nor mapping state. Warning acknowledgement is local; blocking errors cannot be acknowledged into KPI or Change Intelligence execution.

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

Relay deploys as one Next.js project on Vercel. Its server-side Next.js boundaries deploy with the same project. No database, Prisma schema, migration, provider SDK, OAuth framework, credential store, or production provider configuration is present. Shopify, Meta, and Google use native server `fetch`, so the connector sprints add no dependency. Live persisted connectors remain blocked until a secure durable server-side persistence and ownership boundary is selected.

## Repository navigation

- Current work: `plan.md`; agent protocol: `CLAUDE.md`
- Product scope: `docs/product/`; architecture: `docs/architecture/`
- Data rules: `docs/data/`; connectors: `docs/integrations/`
- Roadmap: `docs/roadmap/SPRINTS.md`; quality: `docs/qa/`
