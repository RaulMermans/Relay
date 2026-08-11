# Relay

> Marketing reporting workflow automation.

## Current status

Sprint 04 adds a transient CSV intake boundary to the single Next.js application. Relay accepts one CSV through a server-side Route Handler, validates it, and identifies fixture-backed header signatures for representative Meta Ads, Google Ads, and Shopify exports. Unknown or ambiguous inputs remain `unknown` and require review. Vercel remains the frontend and backend deployment target. Durable persistence is deferred, so the application has no connected database. Production deployment is currently blocked because this workspace has no Vercel CLI, authentication, or project linkage.

The current capability is intake and source detection only. It does not map or normalize provider fields, calculate KPIs, reconcile data, connect providers, use AI, generate reports/PDFs, or persist client/report/upload state. Supported signatures are synthetic-fixture-backed and will expand only through real-world validation.

## Requirements

- Node.js 24 LTS (the project pins 24.14.0)
- npm 11.9.0

## Local development

```text
npm ci
npm run dev
```

Open `http://localhost:3000`. The health endpoint is available at `http://localhost:3000/api/health`.

At `/`, choose or drop one `.csv` file (up to 5 MiB and 50,000 data rows). Relay processes the file transiently and does not retain raw content. Server-side checks remain authoritative even when the UI provides selection feedback.

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
