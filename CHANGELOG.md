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

### Changed

- Defined Relay's product contract, V1 boundaries, validation metrics, research protocols, assumption register, and Sprint 02 decision inputs.
- Added documentation-only validation-experiment design; no application functionality was implemented.
- Defined V1 architecture, canonical data semantics, revenue rules, ingestion/persistence boundaries, report/AI boundaries, deployment, security, testing, and Sprint 03 handoff.
- Superseded ADR-005's Railway/PostgreSQL/Prisma deployment assumptions with Vercel and no currently connected database.
- Relay now supports fixture-backed CSV source detection, mapping, and canonical normalization. KPI calculation, Data Health/reconciliation, connectors, AI, reports, and persistence remain unimplemented.

### Deployment

- Vercel deployment is blocked locally because the Vercel CLI, authentication, and project linkage are unavailable; no production URL is claimed.
