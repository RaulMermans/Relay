# Sprint 04 - CSV Intake + Source Detection

### T-057 CSV Intake Contract

**Outcome:** Define the transient, single-file CSV intake contract and stable outcomes.

**Relevant docs/files:** `docs/data/CSV_INTAKE_CONTRACT.md`, `docs/data/SOURCE_RULES.md`.

**AC:** Accepted, rejected, and needs-review outcomes, source values, and error codes are explicit.

**Status:** Complete.

### T-058 Source Detection Rules

**Outcome:** Define deterministic, header-based evidence rules for supported providers.

**Relevant docs/files:** `docs/data/SOURCE_RULES.md`, `lib/intake/csv/detect-source.ts`.

**AC:** Meta Ads, Google Ads, Shopify, unsupported, and ambiguous inputs have documented deterministic behavior.

**Status:** Complete.

### T-059 Synthetic Fixtures

**Outcome:** Add small, clearly labelled synthetic raw CSV fixtures.

**Relevant docs/files:** `fixtures/raw/`, `docs/qa/REGRESSION_FIXTURES.md`.

**AC:** Representative, alternate-header, unknown, ambiguous, and malformed coverage is available without client data.

**Status:** Complete.

### T-060 Parser Selection

**Outcome:** Select and justify the smallest reliable CSV parser.

**Relevant docs/files:** `package.json`, `package-lock.json`, `docs/data/CSV_INTAKE_CONTRACT.md`.

**AC:** Quoting, escaped quotes, line endings, empty cells, malformed input, BOM, and dependency scope are addressed.

**Status:** Complete.

### T-061 Server Validation

**Outcome:** Validate upload presence, type, size, text decoding, headers, and data rows server-side.

**Relevant docs/files:** `lib/intake/csv/validate.ts`, `app/api/intake/csv/route.ts`.

**AC:** A 5 MiB limit and structured validation errors protect the transient intake boundary.

**Status:** Complete.

### T-062 CSV Parser

**Outcome:** Parse CSV safely through a small server-side boundary.

**Relevant docs/files:** `lib/intake/csv/parse.ts`, `tests/unit/csv-parse.test.ts`.

**AC:** Parsing preserves headers and rows/counts while handling ordinary CSV semantics and controlled failures.

**Status:** Complete.

### T-063 Source Detector

**Outcome:** Implement pure, deterministic source detection from validated headers.

**Relevant docs/files:** `lib/intake/csv/detect-source.ts`, `tests/unit/source-detection.test.ts`.

**AC:** Supported, unknown, and ambiguous inputs produce transparent evidence without guessing.

**Status:** Complete.

### T-064 Intake API

**Outcome:** Expose the intake boundary with a stable structured response.

**Relevant docs/files:** `app/api/intake/csv/route.ts`, `lib/intake/csv/intake.ts`.

**AC:** The endpoint returns accepted/needs-review results or safe 4xx error codes without retaining content.

**Status:** Complete.

### T-065 Upload UI

**Outcome:** Add a focused single-file intake experience at `/`.

**Relevant docs/files:** `app/page.tsx`, `app/globals.css`, `app/intake-form.tsx`.

**AC:** A user can submit, inspect results, recover from errors, and reset a CSV intake.

**Status:** Complete.

### T-066 Client Guardrails

**Outcome:** Add light client-side selection feedback while retaining server authority.

**Relevant docs/files:** `app/intake-form.tsx`.

**AC:** Empty, non-CSV, and oversized selections receive clear local guidance.

**Status:** Complete.

### T-067 Unit Tests

**Outcome:** Cover parsing, validation, and source detection deterministically.

**Relevant docs/files:** `tests/unit/`.

**AC:** Normal, edge, malformed, provider, unknown, and ambiguous conditions are exercised.

**Status:** Complete.

### T-068 Integration Tests

**Outcome:** Test raw fixture to structured intake result.

**Relevant docs/files:** `tests/integration/`.

**AC:** Meta, Google Ads, Shopify, unknown, and malformed fixture flows execute through the real modules.

**Status:** Complete.

### T-069 E2E

**Outcome:** Test the real upload experience.

**Relevant docs/files:** `tests/e2e/intake.spec.ts`.

**AC:** Playwright verifies a Meta upload and an unknown-source state.

**Status:** Complete.

### T-070 Security Sanity

**Outcome:** Review CSV trust-boundary risks and mitigations.

**Relevant docs/files:** `SECURITY.md`, scoped intake files, dependency manifest.

**AC:** No P0/P1 findings remain; raw CSV is neither logged nor retained.

**Status:** Complete.

### T-071 Observability

**Outcome:** Record limited redacted server intake events.

**Relevant docs/files:** `app/api/intake/csv/route.ts`.

**AC:** Logs contain status/error metadata only, never uploaded contents or rows.

**Status:** Complete.

### T-072 Documentation

**Outcome:** Align active docs with the implemented intake boundary.

**Relevant docs/files:** `README.md`, `docs/data/`, `docs/qa/`, `CHANGELOG.md`.

**AC:** Documentation describes fixture-backed source detection without claiming downstream capabilities.

**Status:** Complete.

### T-073 Verification

**Outcome:** Run the Sprint 04 reproducible verification ladder.

**Relevant docs/files:** `package.json`, tests, application files.

**AC:** Install, lint, typecheck, test, build, and E2E evidence is recorded.

**Status:** Complete.

### T-074 Sprint 05 Handoff

**Outcome:** Document the mapping/normalization starting boundary without implementing it.

**Relevant docs/files:** `SCRATCHPAD.md`, `docs/data/CSV_INTAKE_CONTRACT.md`.

**AC:** Parsed shape, detector output, aliases, deferred persistence, expected canonical fields, fixtures, and open ambiguities are recorded.

**Status:** Complete.
