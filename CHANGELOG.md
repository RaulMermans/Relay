# Changelog

## Unreleased

### Added

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

### Changed

- Defined Relay's product contract, V1 boundaries, validation metrics, research protocols, assumption register, and Sprint 02 decision inputs.
- Added documentation-only validation-experiment design; no application functionality was implemented.
- Defined V1 architecture, canonical data semantics, revenue rules, ingestion/persistence boundaries, report/AI boundaries, deployment, security, testing, and Sprint 03 handoff.
- Superseded ADR-005's Railway/PostgreSQL/Prisma deployment assumptions with Vercel and no currently connected database.
- Relay now supports fixture-backed CSV source detection, mapping, canonical normalization, Data Health/reconciliation, and deterministic KPI calculation. Change Intelligence, connectors, AI, reports, dashboards, and persistence remain unimplemented.

### Deployment

- Vercel deployment is blocked locally because the Vercel CLI, authentication, and project linkage are unavailable; no production URL is claimed.
