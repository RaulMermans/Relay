# Changelog

## Unreleased

### Added

- Sprint 17 private-beta hardening: threat model, deployment-gated access decision, safe observability/data-inventory contracts, executable beta runbook, known-issues register, release gate, cross-browser smoke matrix, and a maximum-row synthetic stress regression.
- CSV request/body guards, duplicate-header/null-byte rejection, mixed-newline parsing, and bounded deterministic numeric normalization.

- A deterministic `ReportDocument` composer, editorial report preview, and browser-native Print/Save-as-PDF path. It reuses the authoritative snapshot and Narrative Intelligence, preserves Shopify/Meta/Google revenue semantics, blocks stale or Data-Health-blocked exports, and persists no PDF bytes or raw inputs.

- Deterministic Narrative Intelligence: an immediate evidence-backed Performance Summary with stable IDs, significance-aware stories, source-safe semantics, health/freshness/target attention, and inspectable evidence. Relay V1 requires no generative model.

- Versioned, Zod-validated, bounded browser-local client memory behind `RelayMemoryStore`, with explicit recovery, client deletion, and Relay-only reset.
- Lightweight create/select/rename/delete client UX, persisted source expectations, compatible provider/header mapping reuse, existing-contract targets, fixed revenue rules, bounded attribution context, and reporting preferences.
- Compact authoritative dashboard snapshots with per-source data-through metadata, deterministic Current/Needs refresh/Old labels, active-client restoration, and up to 52 local analysis-cycle summaries per client.
- Persistence unit tests, repeat-cycle and isolation integration coverage, and Playwright reload/reuse/switching flows; incompatible saved mappings return to focused review.
- A transient dashboard-first workspace with human-readable naming, reporting period control, and truthful Meta Ads, Google Ads, and Shopify CSV source slots.
- `POST /api/workspace/analyze` for server-authoritative multi-file normalization and one combined Data Health, KPI, and Change Intelligence pass without returning canonical rows.
- Deterministic presentation formatting, Data Health/observation humanization, What Changed curation, Attention prioritization, channel summaries, and an accessible native SVG daily trend.
- A responsive editorial analytics shell with empty, preparing, mapping-exception, error, ready, warning, and blocked states; no UI/chart dependency was added.
- Meta Ads `Day` and `Date` date aliases with a fixture-backed `Day` regression.
- Labelled workspace scenario composition plus unit, integration, E2E, and desktop/tablet/mobile visual QA coverage.

- Initial Relay repository operating system.
- Product, architecture, data, connector, QA and roadmap documentation.
- Agent skill framework.
- ADR-006 for Vercel-native deployment and deferred durable persistence.
- Minimal Next.js application foundation, deterministic health endpoint, environment boundary, Vitest tests, Playwright smoke tests, and base CI.
- Transient single-file CSV intake at `POST /api/intake/csv` and a minimal upload UI at `/`.
- Deterministic, fixture-backed source detection for representative Meta Ads, Google Ads, and Shopify CSV signatures, with safe unknown and ambiguity outcomes.
- Synthetic CSV fixtures, parser/validation/source-detection tests, API integration tests, and Playwright upload coverage.
- `csv-parse` 7.0.2 for standards-compliant CSV parsing, bounded by 5 MiB, 50,000 rows, 256 columns, and 32,768-character fields.
- Deterministic provider-specific field mapping, explicit mapping status/origin, provider-valid manual overrides, and a focused mapping review UI.
- Row-level daily canonical advertising and commerce normalizers for representative Meta Ads, Google Ads, and Shopify CSVs.
- Fixed-decimal money/count normalization, currency preservation, canonical provenance, normalized golden fixtures, and mapping/normalization integration coverage.
- `POST /api/normalize/csv`, which reparses a transient re-upload and returns a compact normalization summary without rows.
- A reusable, scoped data-contract review skill for canonical metric changes.
- Deterministic request-scoped Data Health and reconciliation after normalization, with date coverage/alignment, expected-source, currency, mapping, provenance, duplicate, and revenue-semantics findings.
- A compact Data Health response from `POST /api/normalize/csv` and a focused single-file Data Health UI with local warning acknowledgement and blocked readiness state.
- Synthetic, independently maintained Data Health regression fixtures and unit/integration/E2E coverage.
- Deterministic Data-Health-gated KPI engine with fixed-decimal arithmetic, primitive and derived advertising/commerce metrics, source breakdowns, and equivalent-period deltas.
- Compact KPI facts on the existing normalization API and a focused single-file KPI scorecard.
- Independently maintained KPI goldens, manual formula verification, unit/integration pipeline coverage, and a focused Playwright KPI flow.
- Pure Data-Health-gated Change Intelligence with explicit direction/assessment separation, documented polarity and 5%/15% rule-based magnitude bands, top movers, commerce-efficiency divergence, CPA/ROAS/MER and source-efficiency rules, and four explainable cross-metric signals.
- Additive source-spend contribution, bounded transient target validation/evaluation, stable observation deduplication/priority, and raw-data-free KPI evidence lineage.
- Compact Change Intelligence facts on the normalization API plus a minimal What Changed UI with optional current-period and MER/CPA target inputs.
- Ten manually maintained Change Intelligence goldens, raw comparison fixtures, unit/integration/E2E coverage, and a scoped Change Intelligence review skill.
- Provider-neutral read-only connector types for lifecycle, connection/account selection, daily fetch requests/results, capabilities, and explicit readiness.
- Bounded generic pagination and injected-delay retry helpers, stable structured connector errors, and focused provider-error redaction.
- Discriminated CSV/API canonical provenance with transport-specific Data Health lineage validation and no analytics transport branch.
- A truthful not-built provider registry plus a test-only two-page mock connector/normalizer and synthetic API fixture.
- CSV/API canonical semantic-equivalence support that ignores only provenance/order and rejects measure, revenue, null/zero, and currency drift.
- A scoped connector implementation skill and strengthened connector transport/security/testing documentation.
- A native-fetch Shopify GraphQL Admin API 2026-07 adapter with validated installed-store discovery, store-local date bounds, read-only order query, bounded cursor pagination/retry, and safe error mapping.
- A Shopify API commerce normalizer with one-order grain, fixed-decimal gross revenue, safe API provenance, and no customer PII or advertising-revenue field.
- Labelled synthetic Shopify GraphQL fixtures, positive/negative CSV/API equivalence regressions, unchanged Data Health/KPI/Change Intelligence convergence, and a truthful live-unavailable UI state.
- A native-fetch Meta Marketing API v26.0 read-only adapter with validated ad-account discovery/selection, minimal synchronous daily Ads Insights, bounded cursor pagination/retry, and redacted error mapping.
- A Meta API advertising normalizer with exact purchase action/value semantics, fixed-decimal null/zero preservation, safe API provenance, labelled synthetic fixtures, positive/negative CSV/API equivalence, unchanged downstream convergence, and a truthful live-unavailable UI state.
- A native-fetch Google Ads API v25 read-only adapter with direct/manager customer discovery, nested hierarchy context, server-validated reporting selection, minimal daily ad-group GAQL Search, bounded fixed-page pagination/retry, and redacted error mapping.
- A Google API advertising normalizer with exact cost-micros conversion, primary conversions/conversions-value semantics, fixed-decimal null/zero preservation, safe API provenance, labelled synthetic fixtures, positive/negative CSV/API equivalence, unchanged downstream convergence, permanent Google CSV regression coverage, and a truthful live-unavailable UI state.

### Changed

- Relay's repeat workflow now restores browser-local configuration and the latest dashboard while keeping CSV files, filenames, canonical observations, provider payloads, credentials, generated-report artifacts, and PDF bytes transient and unpersisted.
- The existing Change Intelligence target parser is now reusable by persistence validation, avoiding a second target contract without changing target evaluation semantics.
- Defined Relay's product contract, V1 boundaries, validation metrics, research protocols, assumption register, and Sprint 02 decision inputs.
- Added documentation-only validation-experiment design; no application functionality was implemented.
- Defined V1 architecture, canonical data semantics, revenue rules, ingestion/persistence boundaries, report/AI boundaries, deployment, security, testing, and Sprint 03 handoff.
- Superseded ADR-005's Railway/PostgreSQL/Prisma deployment assumptions with Vercel and no currently connected database.
- Relay now supports fixture-backed CSV source detection, mapping, canonical normalization, Data Health/reconciliation, deterministic KPI calculation, structured deterministic Change Intelligence, a multi-source daily dashboard, browser-local return memory, the generic connector framework, implemented Shopify, Meta Ads, and Google Ads API adapters proven through synthetic provider-shaped integration, and a deterministic report preview with browser-native PDF saving. Live provider auth, automatic sync, cloud persistence, authentication, generative AI, recommendations, generated-report persistence, and server-generated PDF bytes remain unimplemented.

### Deployment

- A Vercel-protected production deployment at `c05bd108cc552a945cc1b97f6c311a650d9bd3c8` is ready for the deliberately limited private beta. Deployment protection, health, complete-workspace analysis, cross-browser smoke, browser-local restore, responsive dashboard/report review, and browser-native PDF output were verified on 2026-08-25. Public access remains out of scope.
