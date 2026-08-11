# Current status

- Sprint 02 is complete at baseline commit `06bb09e`.
- Sprint 03 has a locally verified Vercel-native application foundation; its production deployment is blocked because no Vercel CLI, authentication, or project linkage is available.

# Decisions made

- ADR-006 supersedes ADR-005's Railway, immediate PostgreSQL/Prisma, migration, and `DATABASE_URL` assumptions while preserving the single Next.js application stack.
- Vercel hosts frontend and backend execution together. Relay is database-ready, not database-dependent.

# Dependencies installed

- Runtime: Next.js, React, React DOM, and Zod.
- Development: TypeScript, Node/React types, ESLint with Next configuration, Vitest, and Playwright.
- No database, ORM, connector, AI, PDF, auth, queue, or worker dependency was installed.

# Commands run

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run test:e2e`
- `npm run test:integration`

# Failures and deviations

- The system path had no npm. A temporary official Node 24.14.0 distribution supplied npm 11.9.0 for install and verification; the repository itself pins the same runtime contract.
- Playwright Chromium was downloaded locally for the required smoke test.
- No Vercel deployment was attempted because required local tooling and project credentials were absent.

# Sprint 04 handoff

- **Upload UI boundary:** choose a minimal App Router upload surface only when the CSV intake request contract is approved; do not create it in Sprint 03.
- **Server/client boundary:** the browser may select a file, but authoritative size/type/filename, parser-safety, source-detection, and structured-finding logic belongs in a server-side Route Handler. Do not parse or normalize authoritative data in the browser.
- **Fixture strategy:** use clearly synthetic provider CSV examples under `fixtures/raw/`; place source-detection expectations under `fixtures/expected/`. No production exports or credentials.
- **File validation:** establish size, extension/type, encoding, header/row-shape, parser-failure, and CSV-injection controls before mapping; return structured errors for malformed, ambiguous, or unsupported input.
- **Source detection:** identify known Meta Ads, Google Ads, and Shopify export signatures from validated structure; return known, ambiguous, or unsupported results without guessing mappings or metrics.
- **Test strategy:** unit-test source signatures and validation findings with synthetic fixtures; add handler integration tests and an upload E2E only after the upload contract exists.
- **Canonical contracts:** normalize only after detection into `docs/data/DATA_CONTRACT.md`'s daily observations, source identity, provenance, null-versus-zero, currency, and separated revenue semantics. `docs/data/KPI_DEFINITIONS.md` remains downstream of validated canonical data.

# Next task

- Sprint 04 — CSV Ingestion + Source Detection: begin with its approved intake contract; do not select a CSV parser or implement uploads before that task.
