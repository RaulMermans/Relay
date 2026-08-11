# ADR-005: V1 application stack

## Status

Accepted for V1 architecture.

## Context

Relay needs one web application that can support client/report workflows, CSV ingestion, future OAuth connectors, deterministic analysis, PDF rendering, and staged Railway deployment. V1 does not need background sync, autonomous reporting, or a distributed service topology.

## Options considered

### Option A: Single Next.js application

Next.js App Router with TypeScript, Node.js 24 LTS, PostgreSQL, Prisma ORM, Zod, Vitest, and Playwright. It runs as one deployable web/application service and owns UI plus server-side route handlers.

### Option B: Next.js frontend plus separate API and background worker

Separates concerns early, but adds service boundaries, deployment coordination, authentication/contract duplication, and worker/queue operations before V1 has a scheduled or long-running workload requirement.

## Evaluation

| Need | Option A: single Next.js application | Option B: frontend + API + worker |
| --- | --- | --- |
| Implementation speed and solo maintenance | One codebase and deployable; fewer contracts to coordinate. | More deployment, API, and worker contracts from day one. |
| Connector/OAuth and CSV processing | Server-side routes can own bounded connector/CSV operations. | Separates long-running work earlier, but V1 has no evidence it needs that capacity. |
| PDF generation | One server process can render the structured report model when that feature is built. | A worker could render later, but adds a service before PDF workload is measured. |
| Testing | Pure domain modules plus one app boundary simplify unit/integration/E2E layers. | Adds API and worker integration contracts and test environments. |
| Railway deployment and operations | One application service plus PostgreSQL matches the minimum topology. | Adds at least an API/worker service and likely queue infrastructure. |
| Future connectors/background sync | Revisit when measured duration, retries, or scheduling demand it. | Supports future asynchronous work, but prematurely commits V1 to it. |

## Decision

Adopt Option A for V1:

- Framework/runtime: Next.js App Router, TypeScript, and Node.js 24 LTS.
- Persistence: PostgreSQL with Prisma ORM; use PostgreSQL decimal/numeric semantics for persisted ratios and integer minor units for canonical money.
- Validation: Zod at untrusted application boundaries.
- Testing: Vitest for unit/integration tests and Playwright Test for browser E2E.
- Package manager: npm.
- Deployment: one Railway Next.js service plus Railway PostgreSQL. No Redis, queue, worker, object storage, cron, microservice, event bus, vector database, agent framework, or workflow orchestrator for V1.

Next.js provides App Router conventions and route handlers for a single full-stack application. Prisma supports PostgreSQL connections and decimal data. Railway documents a Next.js-plus-Postgres deployment path with a reference `DATABASE_URL`. Next.js documents Vitest and Playwright testing options, and Playwright Test supplies a browser E2E runner. [Next.js App Router](https://nextjs.org/docs/app/getting-started), [route handlers](https://nextjs.org/docs/14/app/building-your-application/routing/route-handlers), [Prisma PostgreSQL](https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql), [Railway Next.js + Postgres](https://docs.railway.com/guides/nextjs), [Next.js testing](https://nextjs.org/docs/app/guides/testing), [Playwright Test](https://playwright.dev/docs/intro), [Node LTS releases](https://nodejs.org/en/about/previous-releases).

## Consequences

V1 has one codebase, one application deployable, and one database service. CSV processing and interactive connector fetches run inside bounded application requests. Long-running or scheduled sync is not a V1 commitment. PDF library selection is deferred until report rendering is implemented, as long as it consumes the structured report model.

## Revisit triggers

Revisit when measured request duration, provider rate limits, scheduled sync, upload size, PDF rendering duration, or retry requirements show that a bounded in-process request cannot meet reliability needs. Add a worker/queue/object store only with a documented workload and failure-mode requirement.

## Validation path

Sprint 03 scaffolds the selected stack, creates `/health`, validates required server environment at startup, and establishes lint, typecheck, unit, E2E, build, migration, and Railway smoke-deploy checks. Pin the current Node 24 LTS patch in project tooling at scaffold time.
