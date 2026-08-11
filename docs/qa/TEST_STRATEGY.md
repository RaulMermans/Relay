# Test architecture

## Principle

Core analytical logic must be independently testable from UI, database, and provider APIs. Tests use synthetic or anonymized fixtures only; every discovered parsing or calculation defect becomes a regression fixture/test.

## Unit tests

Sprint 03 tests the server environment boundary and deterministic health-response creation. Later sprints test source detection, mappings, normalizers, canonical semantic rules, KPI formulas, period comparison, mover detection, reconciliation logic, report-fact composition, and fact-to-commentary grounding rules. Pure deterministic modules must not require a browser, database, or live provider.

## Integration tests

Sprint 03 creates the integration-test location but does not force an artificial integration test: no integration boundary exists yet. Later test raw CSV -> canonical data, canonical data -> analytics, analytics -> report model, and persistence boundaries when they exist. Include date/currency/availability validation and report re-rendering from persisted canonical/report snapshots.

## Connector contract tests

Use provider response fixtures -> normalized canonical output. The key equivalence test is: when CSV and API inputs represent equivalent source data, they produce equivalent canonical semantics, provenance shape, and relevant validation findings.

## E2E tests

Sprint 03 provides a Playwright smoke test for `/` and `/api/health`. Later exercise the bounded happy path: client -> report -> upload -> review -> PDF, including the explicit failure states for malformed upload, mapping ambiguity, unavailable connector, expired credential, mismatched periods, unavailable LLM, and PDF rendering failure.

## Regression fixtures

Store synthetic/anonymized source input in `fixtures/raw/`, expected canonical output in `fixtures/normalized/`, and expected KPI/report facts in `fixtures/expected/`. Never use fabricated production evidence or unlabelled sensitive data.

## Tooling and CI expectation

Sprint 03 establishes Vitest for unit/integration tests and Playwright Test for E2E. Expected commands are `npm test`, `npm run test:e2e`, `npm run lint`, `npm run typecheck`, and `npm run build`; all run without external services. Base CI runs locked install, lint, typecheck, unit tests, and build. Playwright remains available locally but outside base CI because browser installation would add disproportionate overhead to the foundation pipeline; it needs no database.
