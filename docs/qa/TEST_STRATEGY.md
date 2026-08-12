# Test architecture

## Principle

Core analytical logic must be independently testable from UI, database, and provider APIs. Tests use synthetic or anonymized fixtures only; every discovered parsing or calculation defect becomes a regression fixture/test.

## Unit tests

Sprint 06 retains the parser, validation, intake, mapping, and normalization tests and adds pure Data Health checks. Data Health coverage includes period derivation/validation, aligned/partial/outside date coverage, advertising-only missing days, within- and cross-source currencies, manual/ignored/required mappings, provenance requirements, duplicate candidates, expected-source completeness, attribution/commerce separation, and `healthy`/`review_required`/`blocked` aggregation. Tests use canonical synthetic observations and never assert a fabricated KPI or combined revenue.

## Integration tests

Integration tests exercise synthetic raw CSV -> validation -> parser -> detector -> mapping -> normalizer -> independently maintained canonical JSON. Six representative/alternate golden files cover Meta Ads, Google Ads, and Shopify. Failure fixtures cover missing date, ambiguous mapping, duplicate canonical mapping, invalid number, invalid date, duplicate Shopify order rows, and mixed currencies. Sprint 06 adds raw CSV through Data Health goldens for healthy multi-source, date mismatch, currency mismatch, missing source, provenance failure, advertising duplicate candidate, and revenue semantic separation. `POST /api/normalize/csv` is tested for its compact, raw-data-free Data Health response and malformed mapping/Data Health-context handling.

## Connector contract tests

No connector exists yet. The prepared connector contract is: equivalent provider CSV and API reporting data must produce equivalent canonical observation semantics, supported provenance shape, and relevant findings. `fixtures/normalized/` is the CSV-independent golden boundary for that future test suite.

## E2E tests

Playwright verifies source detection, mapping proposal display, successful Meta normalization, the one-file Data Health review state, local warning acknowledgement, required-field correction state, and manually resolving an ambiguous mapping. Multi-source reconciliation remains covered below the UI boundary because the intentionally scoped V1 flow accepts one CSV at a time. It has no KPI, persistence, connector, AI, or report assertions.

## Regression fixtures

Store labelled synthetic/anonymized provider input in `fixtures/raw/`, independent canonical expectation JSON in `fixtures/normalized/`, and future KPI/report facts in `fixtures/expected/`. Never generate expected canonical files from implementation code, use fabricated production evidence, or include client data.

## Tooling and CI expectation

Sprint 03 establishes Vitest for unit/integration tests and Playwright Test for E2E. Expected commands are `npm test`, `npm run test:e2e`, `npm run lint`, `npm run typecheck`, and `npm run build`; all run without external services. Base CI runs locked install, lint, typecheck, unit tests, and build. Playwright remains available locally but outside base CI because browser installation would add disproportionate overhead to the foundation pipeline; it needs no database.
