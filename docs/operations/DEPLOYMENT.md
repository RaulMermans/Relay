# V1 deployment architecture

## Planned topology

```text
Railway project
  -> Relay Next.js application service
  -> Railway PostgreSQL service

External dependencies, introduced only when their features are built:
  Meta, Google, Shopify, and an LLM provider
```

V1 uses the minimum two services: one application service and one PostgreSQL service. The application service owns UI, server-side routes, ingestion orchestration, deterministic analytics, report composition, and future PDF rendering. PostgreSQL is private to the project and exposed to the application through a reference `DATABASE_URL`.

## Runtime and deployment expectations

- Node.js 24 LTS and npm are pinned during Sprint 03 scaffold.
- The Next.js production build uses standalone output and starts through the scaffolded `npm run start` command.
- Prisma migrations run as a Railway pre-deploy step after migrations exist; a failed migration prevents the new release from serving.
- `GET /health` provides a non-sensitive health/readiness response for deployment checks.
- Server environment validation fails closed for missing/invalid required keys and never echoes values.
- Production configuration includes `NODE_ENV`, `DATABASE_URL`, and feature-specific server-side keys only when the related feature exists. Real values never enter Git.

Railway documents deployment of a Next.js application with PostgreSQL, reference database variables, and pre-deploy migrations. [Railway Next.js + Postgres guide](https://docs.railway.com/guides/nextjs), [Railway PostgreSQL](https://docs.railway.com/databases/postgresql).

## Logging, rollback, and operations

Use structured, redacted application/deployment logs for ingestion, Data Health, report lifecycle, and render failures. Roll back to the last healthy application deployment when a health check, migration, or release validation fails; preserve database migration discipline so application rollback remains safe.

## Deferred services and triggers

Do not add Redis, queues, workers, cron, or object storage in V1. Revisit only when measured upload size, fetch duration/rate limits, scheduled sync, PDF duration, or retry behavior cannot meet reliability needs in the single application service. Any addition requires a documented workload, failure-mode, security, and operations decision.
