# Sprint 05 - Field Mapping + Canonical Normalization

### T-075 Canonical Observation Contract
**Outcome:** Lock explicit V1 advertising and commerce observation shapes.
**Relevant docs/files:** `docs/data/DATA_CONTRACT.md`, `lib/normalization/types.ts`.
**AC:** Two daily domains, revenue separation, identifiers, names, and provenance are explicit.
**Status:** Complete.

### T-076 Numeric Representation
**Outcome:** Normalize money and measures without binary floating-point semantics.
**Relevant docs/files:** `docs/data/DATA_CONTRACT.md`, `lib/normalization/values.ts`, `tests/unit/normalization-values.test.ts`.
**AC:** Fixed decimal strings, currency, null/zero, invalid input, negatives, separators, locale, and dates are explicit and tested.
**Status:** Complete.

### T-077 Alias Catalog
**Outcome:** Document fixture-backed Meta, Google, and Shopify aliases.
**Relevant docs/files:** `docs/data/SOURCE_RULES.md`, `lib/mapping/catalog.ts`.
**AC:** Exact/normalized matching and ambiguity behavior are documented without speculative aliases.
**Status:** Complete.

### T-078 Mapping Engine
**Outcome:** Propose deterministic provider-header mappings.
**Relevant docs/files:** `lib/mapping/field-mapping.ts`, `lib/mapping/types.ts`.
**AC:** Mapped, unmapped, ambiguous, ignored, and required-missing outcomes are structured.
**Status:** Complete.

### T-079 Mapping Status
**Outcome:** Expose interpretable mapping origin and readiness status.
**Relevant docs/files:** `lib/mapping/types.ts`, `docs/data/SOURCE_RULES.md`.
**AC:** Exact alias, normalized alias, and manual origin replace fake confidence percentages.
**Status:** Complete.

### T-080 Required Fields
**Outcome:** Enforce minimum provider semantics before normalization.
**Relevant docs/files:** `docs/data/DATA_CONTRACT.md`, `lib/mapping/field-mapping.ts`.
**AC:** Advertising context/measure and Shopify order-row requirements return structured correction states.
**Status:** Complete.

### T-081 Mapping UI
**Outcome:** Add a focused provider-column mapping review after detection.
**Relevant docs/files:** `app/intake-form.tsx`, `app/globals.css`.
**AC:** Users can inspect proposals, required corrections, and normalization status.
**Status:** Complete.

### T-082 Manual Mapping Rules
**Outcome:** Support transient, domain-valid manual overrides and optional ignores.
**Relevant docs/files:** `app/intake-form.tsx`, `lib/mapping/field-mapping.ts`.
**AC:** Cross-domain and duplicate targets fail; mappings are not persisted.
**Status:** Complete.

### T-083 Provider Normalizers
**Outcome:** Isolate provider normalization behind canonical inputs/outputs.
**Relevant docs/files:** `lib/normalization/`.
**AC:** Downstream results contain no provider raw column names.
**Status:** Complete.

### T-084 Meta Normalization
**Outcome:** Normalize fixture-backed Meta primitives into advertising observations.
**Relevant docs/files:** `lib/normalization/meta-ads.ts`, `fixtures/normalized/meta_ads/`.
**AC:** Meta purchase value remains attributed advertising revenue with provenance.
**Status:** Complete.

### T-085 Google Normalization
**Outcome:** Normalize fixture-backed Google primitives into advertising observations.
**Relevant docs/files:** `lib/normalization/google-ads.ts`, `fixtures/normalized/google_ads/`.
**AC:** Conversion value remains attributed advertising revenue; cost micros are safe.
**Status:** Complete.

### T-086 Shopify Normalization
**Outcome:** Normalize supported Shopify order rows into commerce observations.
**Relevant docs/files:** `lib/normalization/shopify.ts`, `fixtures/normalized/shopify/`.
**AC:** Gross revenue remains commerce revenue and duplicate order rows are rejected.
**Status:** Complete.

### T-087 Provenance
**Outcome:** Preserve minimal source-row and mapping provenance.
**Relevant docs/files:** `lib/normalization/types.ts`, `docs/data/DATA_CONTRACT.md`.
**AC:** Transport, request ID, safe filename, source row, and mapping origins remain available without raw rows.
**Status:** Complete.

### T-088 Normalization API
**Outcome:** Add the server-authoritative transient normalization boundary.
**Relevant docs/files:** `app/api/normalize/csv/route.ts`, `lib/normalization/normalize-csv.ts`.
**AC:** A re-upload plus valid overrides returns a compact safe summary or structured correction/error.
**Status:** Complete.

### T-089 Normalized Fixtures
**Outcome:** Add independent canonical golden outcomes.
**Relevant docs/files:** `fixtures/normalized/`, `tests/integration/csv-normalization.test.ts`.
**AC:** Representative and alternate Meta, Google, and Shopify outputs are manually reviewable JSON.
**Status:** Complete.

### T-090 Failure Fixtures
**Outcome:** Cover realistic mapping and value failures.
**Relevant docs/files:** `fixtures/raw/failures/`, `fixtures/normalized/failures/`.
**AC:** Missing date, invalid value/date, ambiguity, duplicate mapping/order, and mixed-currency cases are covered.
**Status:** Complete.

### T-091 Unit Tests
**Outcome:** Exercise mapping, numeric/date parsing, and provider normalizers.
**Relevant docs/files:** `tests/unit/field-mapping.test.ts`, `tests/unit/normalization-values.test.ts`, `tests/unit/provider-normalizers.test.ts`.
**AC:** Deterministic happy, override, boundary, and failure behavior is covered.
**Status:** Complete.

### T-092 Integration Tests
**Outcome:** Exercise raw CSV through canonical goldens and API responses.
**Relevant docs/files:** `tests/integration/csv-normalization.test.ts`, `tests/integration/csv-normalize-api.test.ts`.
**AC:** Meta, Google, Shopify, unresolved mapping, and invalid canonical values execute through real modules.
**Status:** Complete.

### T-093 Equivalence Preparation
**Outcome:** Establish reusable canonical outcomes for future connector equivalence.
**Relevant docs/files:** `docs/data/DATA_CONTRACT.md`, `fixtures/normalized/`.
**AC:** The CSV/API semantic-equivalence invariant and fixture reuse boundary are documented.
**Status:** Complete.

### T-094 E2E
**Outcome:** Verify mapping review, manual resolution, and normalization summary in the browser.
**Relevant docs/files:** `tests/e2e/intake.spec.ts`.
**AC:** Supported and required-mapping correction flows are automated.
**Status:** Complete.

### T-095 Security/Data Integrity
**Outcome:** Review mapping/normalization trust boundaries and data integrity.
**Relevant docs/files:** `SECURITY.md`, scoped intake/mapping/normalization files.
**AC:** No P0/P1 finding remains; raw data remains unpersisted and unlogged.
**Status:** Complete.

### T-096 Data Contract Review Skill
**Outcome:** Add a narrow reusable semantic-review skill.
**Relevant docs/files:** `.agents/skills/data-contract-review/SKILL.md`.
**AC:** It uses progressive disclosure and focuses on semantic, currency, provenance, and mapping regressions.
**Status:** Complete.

### T-097 Documentation
**Outcome:** Align data, architecture, QA, README, and changelog documentation.
**Relevant docs/files:** `docs/data/`, `docs/architecture/DATA_FLOW.md`, `docs/qa/`, `README.md`, `CHANGELOG.md`.
**AC:** Documentation describes only fixture-backed mapping/normalization and deferred boundaries.
**Status:** Complete.

### T-098 Verification
**Outcome:** Run the required reproducible verification ladder.
**Relevant docs/files:** `package.json`, tests, application files.
**AC:** Install, lint, typecheck, all test scopes, build, and E2E evidence is recorded.
**Status:** Complete.

### T-099 Sprint 06 Handoff
**Outcome:** Record the normalized-input and Data Health starting boundary.
**Relevant docs/files:** `SCRATCHPAD.md`, `docs/data/DATA_CONTRACT.md`.
**AC:** Provenance, findings, date/currency, duplicate, and attribution/commerce questions are explicit without reconciliation implementation.
**Status:** Complete.
