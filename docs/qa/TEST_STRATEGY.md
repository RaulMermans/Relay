# Test architecture

## Principle

Core analytical logic must be independently testable from UI, database, and provider APIs. Tests use synthetic or anonymized fixtures only; every discovered parsing or calculation defect becomes a regression fixture/test.

## Unit tests

Sprint 05 retains the parser, validation, intake, and source-detection tests and adds pure mapping and normalization tests. Mapping coverage includes exact and normalized aliases, unmapped columns, duplicate aliases, required semantics, manual override origin, cross-domain rejection, and duplicate manual targets. Numeric/date coverage includes fixed-decimal money, zero versus unavailable, thousands separators, invalid text, negative money/count rejection, Google micros, and invalid dates. Provider normalizer tests independently cover Meta, Google, and Shopify semantics and Shopify duplicate-order protection.

## Integration tests

Integration tests exercise synthetic raw CSV -> validation -> parser -> detector -> mapping -> normalizer -> independently maintained canonical JSON. Six representative/alternate golden files cover Meta Ads, Google Ads, and Shopify. Failure fixtures cover missing date, ambiguous mapping, duplicate canonical mapping, invalid number, invalid date, duplicate Shopify order rows, and mixed currencies. `POST /api/normalize/csv` is also tested for its compact, raw-data-free response and malformed mapping payload handling.

## Connector contract tests

No connector exists yet. The prepared connector contract is: equivalent provider CSV and API reporting data must produce equivalent canonical observation semantics, supported provenance shape, and relevant findings. `fixtures/normalized/` is the CSV-independent golden boundary for that future test suite.

## E2E tests

Playwright verifies source detection, mapping proposal display, successful Meta mapping/normalization summary, required-field correction state, and manually resolving an ambiguous mapping. It still has no KPI, Data Health, persistence, connector, AI, or report assertions.

## Regression fixtures

Store labelled synthetic/anonymized provider input in `fixtures/raw/`, independent canonical expectation JSON in `fixtures/normalized/`, and future KPI/report facts in `fixtures/expected/`. Never generate expected canonical files from implementation code, use fabricated production evidence, or include client data.

## Tooling and CI expectation

Sprint 03 establishes Vitest for unit/integration tests and Playwright Test for E2E. Expected commands are `npm test`, `npm run test:e2e`, `npm run lint`, `npm run typecheck`, and `npm run build`; all run without external services. Base CI runs locked install, lint, typecheck, unit tests, and build. Playwright remains available locally but outside base CI because browser installation would add disproportionate overhead to the foundation pipeline; it needs no database.
