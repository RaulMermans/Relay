# Sprint 03 - Vercel-Native Application Foundation

### T-036 Architecture Amendment

**Outcome:** Record the Vercel-native, deferred-persistence decision.

**Relevant docs/files:** `docs/decisions/ADR-006-vercel-native-deployment-and-deferred-persistence.md`, `docs/decisions/ADR-005-v1-application-stack.md`.

**AC:** ADR-006 preserves the application stack while superseding Railway, immediate Postgres/Prisma, migrations, and `DATABASE_URL`.

**Status:** Complete.

### T-037 Architecture Contract Updates

**Outcome:** Align active architecture, data-flow, deployment, QA, ADR index, and roadmap contracts.

**Relevant docs/files:** `docs/architecture/ARCHITECTURE.md`, `docs/architecture/DATA_FLOW.md`, `docs/operations/DEPLOYMENT.md`, `docs/qa/TEST_STRATEGY.md`, `docs/decisions/README.md`, `docs/roadmap/SPRINTS.md`.

**AC:** Vercel is the single application platform; persistence is deferred without changing product semantics.

**Status:** Complete.

### T-038 Application Scaffold

**Outcome:** Create a minimal Next.js App Router application in the existing repository.

**Relevant docs/files:** `app/`, `lib/`, `tests/`, `package.json`.

**AC:** The application contains only the foundation routes, environment boundary, and tests.

**Status:** Complete.

### T-039 Root Page

**Outcome:** Render the intentional Relay foundation page at `/`.

**Relevant docs/files:** `app/page.tsx`, `app/globals.css`.

**AC:** The page identifies Relay without dashboards, metrics, navigation, or product flows.

**Status:** Complete.

### T-040 Runtime Contract

**Outcome:** Pin Node 24.14.0 and npm 11.9.0 with the required scripts.

**Relevant docs/files:** `.nvmrc`, `package.json`, `package-lock.json`.

**AC:** Node/npm engines and all required development, build, test, and start scripts are present.

**Status:** Complete.

### T-041 Dependency Discipline

**Outcome:** Install only the application, validation, linting, and test dependencies required by Sprint 03.

**Relevant docs/files:** `package.json`, `package-lock.json`.

**AC:** No database, ORM, connector, AI, PDF, or feature-library dependency is present.

**Status:** Complete.

### T-042 Environment Contract

**Outcome:** Establish a server-only environment validation boundary with no required secrets.

**Relevant docs/files:** `lib/env/server.ts`, `.env.example`.

**AC:** Invalid `NODE_ENV` is rejected without exposing values; no database or provider configuration exists.

**Status:** Complete.

### T-043 Health Endpoint

**Outcome:** Serve a deterministic `GET /api/health` response.

**Relevant docs/files:** `app/api/health/route.ts`, `lib/health.ts`.

**AC:** The endpoint returns only `{ "status": "ok", "service": "relay" }` without environment or host details.

**Status:** Complete.

### T-044 Server Function Baseline

**Outcome:** Prove backend execution inside the same Next.js/Vercel application.

**Relevant docs/files:** `app/api/health/route.ts`, `docs/decisions/ADR-006-vercel-native-deployment-and-deferred-persistence.md`.

**AC:** The health Route Handler is the sole backend baseline; no separate service exists.

**Status:** Complete.

### T-045 Persistence Boundary

**Outcome:** Document a future, feature-driven persistence boundary without implementing it.

**Relevant docs/files:** `docs/architecture/ARCHITECTURE.md`, `docs/architecture/DATA_FLOW.md`, `docs/decisions/ADR-006-vercel-native-deployment-and-deferred-persistence.md`.

**AC:** No database, fake ORM, generic repository abstraction, schema, or `DATABASE_URL` exists.

**Status:** Complete.

### T-046 Vitest

**Outcome:** Configure meaningful deterministic foundation tests.

**Relevant docs/files:** `vitest.config.ts`, `tests/unit/health.test.ts`, `tests/unit/server-env.test.ts`.

**AC:** Unit tests cover health payload creation and valid/invalid server-environment behavior without external services.

**Status:** Complete.

### T-047 Playwright

**Outcome:** Configure root-page and health-endpoint smoke tests.

**Relevant docs/files:** `playwright.config.ts`, `tests/e2e/foundation.spec.ts`.

**AC:** Playwright starts Relay and verifies `/` plus `/api/health`.

**Status:** Complete.

### T-048 Verification Scripts

**Outcome:** Establish lint, typecheck, test, build, and E2E scripts.

**Relevant docs/files:** `package.json`.

**AC:** The required commands are configured for local and CI use.

**Status:** Complete.

### T-049 Vercel Deployment Contract

**Outcome:** Document the actual one-project Vercel deployment target.

**Relevant docs/files:** `docs/operations/DEPLOYMENT.md`.

**AC:** Deployment requires no database, runtime secret, or external connector.

**Status:** Complete.

### T-050 CI

**Outcome:** Add the base GitHub Actions verification pipeline.

**Relevant docs/files:** `.github/workflows/ci.yml`, `docs/qa/TEST_STRATEGY.md`.

**AC:** CI runs npm ci, lint, typecheck, test, and build with Node 24; Playwright remains local by documented choice.

**Status:** Complete.

### T-051 README

**Outcome:** Describe the actual application, runtime, commands, deployment target, and exclusions.

**Relevant docs/files:** `README.md`.

**AC:** README claims no unimplemented product capability or persistence.

**Status:** Complete.

### T-052 Security Sanity

**Outcome:** Review foundation boundaries, secrets, dependencies, and endpoint exposure.

**Relevant docs/files:** `SECURITY.md`, `.gitignore`, `app/api/health/route.ts`, `lib/env/server.ts`, `package.json`.

**AC:** P0/P1 findings are resolved before closure.

**Status:** Complete — no P0/P1 findings.

### T-053 Cleanup

**Outcome:** Confirm the scaffold contains no starter assets, default content, or speculative feature code.

**Relevant docs/files:** `app/`, `lib/`, `public/`, `package.json`.

**AC:** The repository contains only intentional foundation files and required dependencies.

**Status:** Complete.

### T-054 Vercel Deploy

**Outcome:** Deploy only when local Vercel tooling, authentication, and project linkage are available.

**Relevant docs/files:** `docs/operations/DEPLOYMENT.md`, `CHANGELOG.md`.

**AC:** Deployment is verified at `/` and `/api/health`, or honestly recorded as blocked.

**Status:** Blocked — no local Vercel CLI, authentication, or project linkage is available.

### T-055 Full Verification

**Outcome:** Run the complete reproducible verification ladder and inspect scope/dependencies.

**Relevant docs/files:** `package-lock.json`, `package.json`, tests, application files.

**AC:** Locked install, lint, typecheck, tests, build, and E2E pass without database or external services.

**Status:** Complete — clean install, lint, typecheck, test, build, and E2E checks passed.

### T-056 Sprint 04 Handoff

**Outcome:** Identify the next CSV-ingestion boundary without implementing it.

**Relevant docs/files:** `docs/architecture/ARCHITECTURE.md`, `docs/architecture/DATA_FLOW.md`, `SCRATCHPAD.md`.

**AC:** Upload boundary, validation, source-detection, fixture, canonical-contract, and test considerations are recorded without dependencies or implementation.

**Status:** Complete.
