# V1 deployment architecture

## Planned topology

```text
Vercel project
  -> Relay Next.js application
     -> frontend UI
     -> Route Handlers / server-side execution / Vercel Functions
```

One Vercel project deploys Relay's frontend and backend execution together. There is no separate backend service and no database currently connected. External dependencies (Meta, Google, Shopify, or an LLM provider) remain deferred until their product features are built.

## Runtime and deployment expectations

- Node.js 24 LTS and npm are pinned by the Sprint 03 application contract.
- The Next.js production build starts through `npm run start`.
- `GET /api/health` provides a fast, deterministic, non-sensitive deployment check.
- Sprint 03 requires no runtime secrets. Server environment validation remains the future single access boundary and never exposes values to browser code.
- There is no `DATABASE_URL`, database migration, Prisma schema, or production persistence configuration.

## Deployment checklist

Before a deployment, run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`. Deploy only the Next.js application to Vercel. Verify `/` and `/api/health` in production when Vercel authentication and project linking are available.

## Deployment status

Sprint 03 deployment is pending local verification and Vercel authentication/project-linking availability. If either is unavailable, the deployment is recorded as blocked without inventing a production URL.

## Logging, rollback, and operations

Use structured, redacted application/deployment logs once product behavior exists. Roll back to the last healthy Vercel deployment if health or release validation fails. No migration rollback policy exists yet because no database is connected.

## Deferred services and triggers

Do not add a database, Redis, queues, workers, cron, object storage, or external connectors in Sprint 03. Revisit durable persistence under the triggers in [ADR-006](../decisions/ADR-006-vercel-native-deployment-and-deferred-persistence.md). Any future service requires a documented workload, failure-mode, security, and operations decision.
