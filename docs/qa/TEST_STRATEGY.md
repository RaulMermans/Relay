# Test architecture

## Principle

Core analytical logic must be independently testable from UI, database, and provider APIs. Tests use synthetic or anonymized fixtures only; every discovered parsing or calculation defect becomes a regression fixture/test.

## Unit tests

Sprint 04 retains the server environment and health tests and adds pure CSV parser, file-validation, intake-composition, and source-detection tests. They cover quoted cells, escaped quotes, CRLF/LF, empty cells, BOMs, malformed input, file/row limits, stable validation errors, supported signatures, unsupported inputs, and ambiguity. Pure deterministic modules must not require a browser, database, or live provider. Later sprints add mapping, normalizer, canonical semantic, KPI, reconciliation, and fact-grounding rules.

## Integration tests

Sprint 04 exercises a real boundary: synthetic raw CSV -> validation -> parser -> source detector -> structured intake result, plus the `POST /api/intake/csv` Route Handler. Fixture integration tests cover Meta Ads, Google Ads, Shopify, unknown, and malformed CSV input. No canonical observations are produced in this sprint. Later test raw CSV -> canonical data, canonical data -> analytics, analytics -> report model, and persistence boundaries when they exist.

## Connector contract tests

Use provider response fixtures -> normalized canonical output. The key equivalence test is: when CSV and API inputs represent equivalent source data, they produce equivalent canonical semantics, provenance shape, and relevant validation findings.

## E2E tests

Sprint 04 retains the `/` and `/api/health` smoke tests and adds the first product slice: select a synthetic Meta Ads CSV, submit it, inspect the detected provider, row count, and headers; select an unsupported CSV and inspect the review state. Later exercise the bounded client -> report -> upload -> review -> PDF flow, including mapping ambiguity, unavailable connector, expired credential, mismatched periods, unavailable LLM, and PDF rendering failure.

## Regression fixtures

Store synthetic/anonymized source input in `fixtures/raw/`, expected canonical output in `fixtures/normalized/`, and expected KPI/report facts in `fixtures/expected/`. Sprint 04 raw fixtures cover source identification only; no canonical or KPI output fixture exists yet. Never use fabricated production evidence or unlabelled sensitive data.

## Tooling and CI expectation

Sprint 03 establishes Vitest for unit/integration tests and Playwright Test for E2E. Expected commands are `npm test`, `npm run test:e2e`, `npm run lint`, `npm run typecheck`, and `npm run build`; all run without external services. Base CI runs locked install, lint, typecheck, unit tests, and build. Playwright remains available locally but outside base CI because browser installation would add disproportionate overhead to the foundation pipeline; it needs no database.
