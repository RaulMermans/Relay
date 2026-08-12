# Relay

> Marketing reporting workflow automation.

## Current status

Sprint 08 adds deterministic Change Intelligence after the fixture-backed KPI engine. Relay accepts one CSV through server-side Route Handlers, validates it, identifies representative Meta Ads, Google Ads, and Shopify export signatures, proposes deterministic provider-valid mappings, normalizes daily advertising or commerce observations, gates them with Data Health, and returns safe KPI and structured change facts. Unknown source or ambiguous mappings are never guessed. Vercel remains the frontend and backend deployment target. Durable persistence is deferred, so the application has no connected database. Production deployment remains independently blocked because this workspace has no Vercel CLI, authentication, or project linkage.

Relay computes deterministic fixture-backed marketing KPIs from normalized, Data-Health-gated data. It then deterministically identifies meaningful performance changes, efficiency movements, source-level shifts, additive spend contributions, explainable rule-based signals, and explicit target breaches from those validated KPI facts. The focused UI evaluates one CSV at a time and accepts optional current-period dates plus transient MER/CPA targets; multi-source contribution/MER and revenue semantics are covered at the integration boundary. Shopify gross revenue remains commerce truth for Revenue/MER/AOV, while Meta/Google attributed revenue remains provider advertising data for same-source ROAS. Relay does not provide causal attribution, statistical anomaly detection, recommendations, AI, persistence, connectors, dashboards, reports, or PDFs.

## Requirements

- Node.js 24 LTS (the project pins 24.14.0)
- npm 11.9.0

## Local development

```text
npm ci
npm run dev
```

Open `http://localhost:3000`. The health endpoint is available at `http://localhost:3000/api/health`.

At `/`, choose or drop one `.csv` file (up to 5 MiB, 50,000 data rows, 256 columns, and 32,768 characters per field). Review the detected provider's field proposal, optionally select the current period and enter transient MER/CPA targets, normalize the re-upload, review Data Health, then inspect the KPI summary and What Changed facts when execution is allowed. The server owns period filtering, calculation, target evaluation, and interpretation and retains neither raw content, targets, nor mapping state. Warning acknowledgement is local; blocking errors cannot be acknowledged into KPI or Change Intelligence execution.

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

Relay deploys as one Next.js project on Vercel. Its server-side Next.js boundaries deploy with the same project. No database, Prisma schema, migration, or production environment variable is currently configured; the application is database-ready, not database-dependent.

## Repository navigation

- Current work: `plan.md`; agent protocol: `CLAUDE.md`
- Product scope: `docs/product/`; architecture: `docs/architecture/`
- Data rules: `docs/data/`; connectors: `docs/integrations/`
- Roadmap: `docs/roadmap/SPRINTS.md`; quality: `docs/qa/`
