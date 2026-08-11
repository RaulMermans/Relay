# Relay

> Marketing reporting workflow automation.

## Current status

Sprint 03 establishes the Relay application foundation: a single Next.js application with a minimal root page and a deterministic `GET /api/health` endpoint. Vercel is the frontend and backend deployment target. Durable persistence is deferred, so the application has no connected database. Production deployment is currently blocked because this workspace has no Vercel CLI, authentication, or project linkage.

No product workflows are implemented yet: there is no CSV ingestion, provider connector, analytics/KPI logic, AI behavior, PDF generation, or persisted client/report state.

## Requirements

- Node.js 24 LTS (the project pins 24.14.0)
- npm 11.9.0

## Local development

```text
npm ci
npm run dev
```

Open `http://localhost:3000`. The health endpoint is available at `http://localhost:3000/api/health`.

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
