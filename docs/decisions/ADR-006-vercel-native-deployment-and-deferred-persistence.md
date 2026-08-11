# ADR-006: Vercel-native deployment and deferred persistence

## Status

Accepted for Sprint 03 and V1 deployment planning.

## Context

ADR-005 selected a single Next.js application, but its Railway and PostgreSQL/Prisma deployment assumptions no longer meet Relay's infrastructure constraint. Relay must ship a truthful public/demo application without paid infrastructure while remaining ready to adopt durable, Postgres-compatible persistence when a real product capability requires it.

## Decision

### Hosting and application

Use Vercel as the single V1 deployment platform. Deploy one Next.js App Router application that contains both the frontend and backend execution boundaries.

Relay backend behavior lives in server-side Next.js boundaries and deploys with the same Vercel project. Route Handlers, server-side Next.js execution, and Vercel Functions when deployed are the allowed baseline; Relay does not have a separate backend service.

### Database and current persistence posture

Do not connect a production database in Sprint 03. The public/demo build must work without PostgreSQL or any other durable server-side store.

Deterministic repository fixtures may exist. Request processing may remain transient. Browser-local/demo state may be introduced only alongside a real product feature. Server memory must never be represented as durable persistence.

### Future durable persistence

Relay remains database-ready. When durable persistence becomes necessary, use a Postgres-compatible durable database behind a feature-driven persistence boundary. This ADR deliberately does not select a provider or ORM.

The boundary is:

```text
UI / Server Logic
      ->
Persistence Boundary
      ->
Demo/local implementation OR future durable database
```

Do not create a generic repository abstraction or unused application interface before a feature needs state.

## Supersedes

This ADR supersedes only ADR-005's deployment and immediate persistence decisions: Railway, a Railway PostgreSQL service, Prisma, migrations, and a required `DATABASE_URL`. ADR-005's decision to use one Next.js App Router application, TypeScript, Node.js 24 LTS, npm, Zod, Vitest, and Playwright remains in force.

## Consequences

The initial deployed application has no persistence claims, database checks, migrations, or production database secrets. Product features that need shared state must explicitly introduce a real persistence implementation and its test/operations contract.

## Revisit triggers

Durable server-side persistence becomes required when Relay needs real multi-user accounts, shared client/report state across devices, durable report history, persisted OAuth or connector credentials, external beta users with server-side accounts, scheduled reporting, or shared agency workspaces.

## Validation path

Sprint 03 verifies a Node 24/npm Next.js application, `GET /api/health`, server-only environment validation, unit tests, Playwright smoke tests, CI, and a Vercel deployment when authentication/project linking is available. It must not require a database or external service.
