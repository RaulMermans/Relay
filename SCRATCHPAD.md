# Current status

- Sprint 10 is complete at baseline `afaa914`.
- Sprint 11 activation decision: B - Meta Ads transport/normalization implemented; durable live activation deferred.
- Official Meta Marketing API app/auth/access/token/account/Insights/rate/version guidance verified 2026-08-12; the adapter is pinned to `v26.0`.
- Dependency decision: native server `fetch` plus existing Zod; no Meta SDK, OAuth framework, or new dependency.
- Persistence blocker: Relay has no authenticated durable store for encrypted access tokens, owner/account relationships, scopes, expiry, revocation, reauthorization, or disconnect.

# Execution

- Main files: `lib/connectors/meta-ads/`, labelled synthetic Meta fixtures/tests, registry/UI, `docs/integrations/META_ADS_CONNECTOR.md`, and focused connector/data/architecture/QA docs.
- TDD red/green covered strict provider validation, bearer-only read transport, accessible `act_` account selection, 31-day synchronous fetch bounds, primitive daily ad Insights, fail-closed cursor paging, safe rate/error mapping, API provenance, exact purchase semantics, null/zero, and account-timezone dates.
- Representative Meta CSV/API facts compare semantically equal; negative spend/count/attribution/currency/null/date/joint-identity changes fail. API observations converge through unchanged Data Health, KPI, and Change Intelligence paths.
- Independent review findings fixed: `inline_link_clicks` replaces broader clicks, Graph `next` without `after` fails closed, synchronous ranges are capped at 31 inclusive days, usage-header claims match implementation, and Sprint 09 registry text is explicitly historical.
- Security/data review: no unresolved P0/P1/P2 finding; no real credential, dependency, route, environment key, database, mutation, PII field, commerce-revenue conflation, or raw provider diagnostic is added.
- Final verification: pinned npm 11.9.0 clean install exit 0 with 0 vulnerabilities; lint exit 0; typecheck exit 0; unit 21 files / 160 tests; integration 10 files / 65 tests; combined 31 files / 225 tests; production build exit 0; Playwright 8/8; diff/scope checks exit 0.
- Environment note: npm is absent from PATH and the bundled runtime, so the clean install used an ephemeral npm 11.9.0 CLI through the bundled pnpm runner with Node 24.14.0 on PATH. Package metadata remained unchanged.

# Sprint 12 handoff

- Exact recommended Sprint 12 task: T-296 - verify current official Google Ads API developer-token, OAuth, customer-account hierarchy, access-level, reporting, quota, and version requirements, then produce the Google Ads activation decision plus executable read-only connector contract before implementation.
- Carry forward: separate adapter existence from activation; do not invent credential persistence; use authoritative provider IDs; bound synchronous requests before network access; use primitive metrics; preserve null/zero, currency, timezone, attribution-versus-commerce revenue, and provenance; fail closed on malformed/repeated/max pagination; prove CSV/API equivalence with negative controls.
