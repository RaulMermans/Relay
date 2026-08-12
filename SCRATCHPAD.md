# Current status

- Sprint 09 is complete at baseline `638ddd6`.
- Sprint 10 activation decision: B - Shopify transport/normalization implemented; durable live activation deferred.
- Official Shopify GraphQL Admin API/auth/version/scope docs verified 2026-08-12; pinned adapter version is `2026-07`.
- Dependency decision: native server `fetch` plus existing Zod; no Shopify SDK or new dependency.
- Persistence blocker: no authenticated durable store for installations, rotating access/refresh tokens, expiries, scopes, ownership, revocation, or disconnect.

# Execution

- Main files: `lib/connectors/shopify/`, Shopify connector fixtures/tests, registry/UI, `docs/integrations/SHOPIFY_CONNECTOR.md`, focused connector/data/architecture/QA docs.
- Targeted baseline: 5 connector files / 28 tests passed.
- TDD red: Shopify suites failed because provider modules did not exist; registry test failed on `not_built`.
- Targeted green: Shopify unit/integration 2 files / 26 tests. Review findings fixed with red/green coverage: required capability enforcement, full `requestedQueryCost` throttle delay, and transport-to-normalizer integration.
- Final verification: `npm ci` exit 0 (Node 24.14.0/npm 11.9.0); lint exit 0; typecheck exit 0; unit 20 files / 131 tests; integration 9 files / 54 tests; combined 29 files / 185 tests; production build exit 0; Playwright 8/8.
- Reviews: security, data contract, and PR review have no unresolved P0/P1/P2 findings. No new dependency, route, environment key, database, credential store, mutation, PII query, or advertising-revenue field.
- Environment note: `npm` was absent from PATH, so verification used the exact npm 11.9.0 CLI with the bundled Node 24.14.0 runtime. No package metadata changed.

# Sprint 11 handoff

- Exact recommended Sprint 11 task: T-256 - verify current official Meta Marketing API app/auth/token/ad-account/reporting requirements and produce the Meta Ads activation decision plus executable read-only connector contract before implementation.
- Carry forward the Sprint 10 lessons: keep activation separate from adapter existence, do not invent credential persistence, use stable provider IDs, preserve canonical revenue polarity, inject transport/delay, fail closed on pagination, and prove CSV/API equivalence with negative controls.
