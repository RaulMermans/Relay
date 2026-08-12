# Sprint 06 - Data Health + Reconciliation

### T-100 Finding Model
**Outcome:** Define deterministic, safe Data Health findings.
**Relevant docs/files:** `docs/data/DATA_HEALTH.md`, `docs/data/RECONCILIATION_RULES.md`, `lib/data-health/types.ts`.
**AC:** Every finding has code/category/severity/status/message/evidence/blocking and no raw CSV values.
**Status:** Complete.

### T-101 Health Summary
**Outcome:** Aggregate Data Health deterministically.
**Relevant docs/files:** `docs/data/DATA_HEALTH.md`, `lib/data-health/types.ts`.
**AC:** `healthy`, `review_required`, and `blocked` are explicit and tested.
**Status:** Complete.

### T-102 Date Validation
**Outcome:** Assess canonical date validity and meaningful coverage.
**Relevant docs/files:** `docs/data/DATA_HEALTH.md`, `lib/data-health/checks/dates.ts`.
**AC:** Coverage ranges, advertising gaps, and out-of-period data are reported without invented zeroes.
**Status:** Complete.

### T-103 Reporting Period
**Outcome:** Add transient current/comparison period input.
**Relevant docs/files:** `docs/data/DATA_HEALTH.md`, `lib/data-health/reporting-period.ts`.
**AC:** Previous equivalent-length comparison is derived or validated without persistence.
**Status:** Complete.

### T-104 Period Alignment
**Outcome:** Compare source coverage to selected periods.
**Relevant docs/files:** `lib/data-health/checks/dates.ts`, `lib/data-health/checks/reconciliation.ts`.
**AC:** Partial, outside, missing-current, and mismatched comparison coverage are explicit.
**Status:** Complete.

### T-105 Currency Compatibility
**Outcome:** Block unsafe monetary compatibility.
**Relevant docs/files:** `docs/data/DATA_HEALTH.md`, `lib/data-health/checks/currencies.ts`.
**AC:** Within-source mixed and cross-source mismatches never convert values.
**Status:** Complete.

### T-106 Mapping Health
**Outcome:** Surface mapping review context without punishing valid overrides.
**Relevant docs/files:** `lib/data-health/checks/mappings.ts`, `tests/unit/data-health.test.ts`.
**AC:** Manual, ignored, optional-unresolved, required, and conflicting mappings are deterministic.
**Status:** Complete.

### T-107 Provenance Health
**Outcome:** Require traceable canonical facts.
**Relevant docs/files:** `lib/data-health/checks/provenance.ts`, `docs/data/DATA_HEALTH.md`.
**AC:** Missing source, locator, mapping origin, or safe request identity blocks readiness.
**Status:** Complete.

### T-108 Duplicate Detection
**Outcome:** Explain duplicate evidence without mutating observations.
**Relevant docs/files:** `lib/data-health/checks/duplicates.ts`, `docs/data/DATA_HEALTH.md`.
**AC:** Shopify repeats are confirmed; qualified advertising key repeats are candidates only.
**Status:** Complete.

### T-109 Source Completeness
**Outcome:** Evaluate request-scoped expected sources.
**Relevant docs/files:** `lib/data-health/checks/source-coverage.ts`, `lib/data-health/types.ts`.
**AC:** Missing, repeated, and unusable expected sources are explicit; no universal source set is assumed.
**Status:** Complete.

### T-110 Revenue Reconciliation Rules
**Outcome:** Preserve commerce truth and provider attribution semantics.
**Relevant docs/files:** `docs/data/RECONCILIATION_RULES.md`, `docs/decisions/ADR-001-revenue-semantics.md`.
**AC:** Advertising attributed revenue is never total commerce revenue or cross-platform-summed.
**Status:** Complete.

### T-111 Reconciliation Findings
**Outcome:** Explain source compatibility without attribution scoring.
**Relevant docs/files:** `lib/data-health/checks/reconciliation.ts`, `docs/data/RECONCILIATION_RULES.md`.
**AC:** Source/currency/period semantics are findings; numeric revenue differences alone are not errors.
**Status:** Complete.

### T-112 Data Health Engine
**Outcome:** Create pure deterministic health/reconciliation engine.
**Relevant docs/files:** `lib/data-health/`.
**AC:** Engine accepts canonical facts plus request context and has no UI/database/AI dependency.
**Status:** Complete.

### T-113 API Boundary
**Outcome:** Run Data Health server-side after normalization.
**Relevant docs/files:** `app/api/normalize/csv/route.ts`, `lib/data-health/request-context.ts`.
**AC:** Compact health output is authoritative and malformed context is rejected safely.
**Status:** Complete.

### T-114 Data Health UI
**Outcome:** Show health status, coverage, and grouped actionable findings.
**Relevant docs/files:** `app/intake-form.tsx`, `app/globals.css`.
**AC:** Single-file flow reaches Data Health without exposing observations or raw rows.
**Status:** Complete.

### T-115 User Control
**Outcome:** Allow local acknowledgement of non-blocking warnings.
**Relevant docs/files:** `app/intake-form.tsx`, `docs/data/DATA_HEALTH.md`.
**AC:** Warnings can reach readiness; errors remain blocked; no fake analytics screen exists.
**Status:** Complete.

### T-116 Fixtures
**Outcome:** Add independently maintained Data Health goldens.
**Relevant docs/files:** `fixtures/expected/data-health/`, `docs/qa/REGRESSION_FIXTURES.md`.
**AC:** Healthy, date, currency, source, provenance, duplicate, and semantic scenarios are covered.
**Status:** Complete.

### T-117 Unit Tests
**Outcome:** Test each Data Health rule and aggregation state.
**Relevant docs/files:** `tests/unit/data-health.test.ts`.
**AC:** Required date, currency, mapping, provenance, duplicate, completeness, reconciliation, and status cases pass.
**Status:** Complete.

### T-118 Integration Tests
**Outcome:** Test raw CSV through Data Health expectations.
**Relevant docs/files:** `tests/integration/data-health-pipeline.test.ts`, `fixtures/raw/`, `fixtures/expected/data-health/`.
**AC:** Healthy, review-required, and blocked multi-source flows use real parser/mapping/normalizers.
**Status:** Complete.

### T-119 E2E
**Outcome:** Verify the single-file Data Health interface.
**Relevant docs/files:** `tests/e2e/intake.spec.ts`.
**AC:** A supported CSV displays its health result; multi-source remains unit/integration scoped.
**Status:** Complete.

### T-120 Security/Data Integrity
**Outcome:** Review trust boundaries and canonical semantics.
**Relevant docs/files:** `SECURITY.md`, scoped health/API files.
**AC:** No P0/P1 raw-data, validation, provenance, currency, duplicate, or revenue-semantics finding remains.
**Status:** Complete.

### T-121 Documentation
**Outcome:** Document implemented health and reconciliation behavior.
**Relevant docs/files:** `docs/data/`, `docs/architecture/DATA_FLOW.md`, `docs/qa/`, `README.md`, `CHANGELOG.md`.
**AC:** Documentation states tested capabilities and deferred boundaries only.
**Status:** Complete.

### T-122 Verification
**Outcome:** Run the required verification ladder.
**Relevant docs/files:** `package.json`, tests, application files.
**AC:** Install, lint, typecheck, tests, build, and E2E evidence is recorded.
**Status:** Complete.

### T-123 Sprint 07 Handoff
**Outcome:** Define only the KPI input gate.
**Relevant docs/files:** `docs/data/DATA_HEALTH.md`, `SCRATCHPAD.md`.
**AC:** Blocked health cannot run KPIs; health/review-required inputs and deferred KPI list are explicit.
**Status:** Complete.
