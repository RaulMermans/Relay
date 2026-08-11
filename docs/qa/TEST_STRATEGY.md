# Test architecture

## Principle

Core analytical logic must be independently testable from UI, database, and provider APIs. Tests use synthetic or anonymized fixtures only; every discovered parsing or calculation defect becomes a regression fixture/test.

## Unit tests

Test source detection, mappings, normalizers, canonical semantic rules, KPI formulas, period comparison, mover detection, reconciliation logic, report-fact composition, and fact-to-commentary grounding rules. Pure deterministic modules must not require a browser, database, or live provider.

## Integration tests

Test raw CSV -> canonical data, canonical data -> analytics, analytics -> report model, and persistence boundaries when they exist. Include date/currency/availability validation and report re-rendering from persisted canonical/report snapshots.

## Connector contract tests

Use provider response fixtures -> normalized canonical output. The key equivalence test is: when CSV and API inputs represent equivalent source data, they produce equivalent canonical semantics, provenance shape, and relevant validation findings.

## E2E tests

Exercise the bounded happy path: client -> report -> upload -> review -> PDF. Cover explicit failure states for malformed upload, mapping ambiguity, unavailable connector, expired credential, mismatched periods, unavailable LLM, and PDF rendering failure.

## Regression fixtures

Store synthetic/anonymized source input in `fixtures/raw/`, expected canonical output in `fixtures/normalized/`, and expected KPI/report facts in `fixtures/expected/`. Never use fabricated production evidence or unlabelled sensitive data.

## Tooling and CI expectation

Sprint 03 will establish Vitest for unit/integration tests and Playwright Test for E2E. Expected commands after scaffold are `npm test`, `npm run test:e2e`, `npm run lint`, `npm run typecheck`, and `npm run build`; do not run them in Sprint 02 because no application exists. CI will run locked install, lint, typecheck, unit tests, build, and a bounded E2E smoke path using an isolated test database.
