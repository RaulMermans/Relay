# Relay

> Marketing reporting workflow automation.

## Current status

Sprint 06 adds fixture-backed Data Health and reconciliation after canonical normalization. Relay accepts one CSV through server-side Route Handlers, validates it, identifies representative Meta Ads, Google Ads, and Shopify export signatures, proposes deterministic provider-valid mappings, accepts transient manual overrides, normalizes the data into daily advertising or commerce observations, and returns a safe Data Health summary. Unknown source or ambiguous mappings are never guessed. Vercel remains the frontend and backend deployment target. Durable persistence is deferred, so the application has no connected database. Production deployment is currently blocked because this workspace has no Vercel CLI, authentication, or project linkage.

Relay can validate normalized marketing data for date coverage, source compatibility, currency consistency, mapping, provenance, duplicate candidates, and advertising-versus-commerce revenue semantics. The current focused UI evaluates one CSV at a time; multi-source compatibility is covered by the server-independent Data Health engine and its integration tests. It does not calculate KPIs, connect providers, use AI, generate reports/PDFs, or persist client/report/upload state. Money remains fixed decimal text with explicit currency; Meta/Google attributed revenue remains advertising data and Shopify revenue remains commerce data, never a combined revenue figure. Supported aliases are synthetic-fixture-backed and will expand only through explicit evidence and regression fixtures.

## Requirements

- Node.js 24 LTS (the project pins 24.14.0)
- npm 11.9.0

## Local development

```text
npm ci
npm run dev
```

Open `http://localhost:3000`. The health endpoint is available at `http://localhost:3000/api/health`.

At `/`, choose or drop one `.csv` file (up to 5 MiB, 50,000 data rows, 256 columns, and 32,768 characters per field). Review the detected provider's field proposal, make any valid manual mapping override, normalize the same selected file transiently, then review Data Health. The server revalidates and reparses the file, derives a request-local reporting period, and retains neither raw content nor mapping state. Warning acknowledgement is local to the open page; blocking errors cannot be acknowledged into readiness. Server-side checks remain authoritative even when the UI provides selection feedback.

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
