# Test architecture

## Principle

Core ingestion, health, and analytical logic must be independently testable from UI, persistence, and provider APIs. Tests use synthetic or anonymized fixtures only; every discovered parsing, transport, or calculation defect becomes a deterministic regression case.

## Unit tests

Existing suites cover CSV parsing/mapping/normalization, Data Health, KPIs, and Change Intelligence. Sprint 09 adds lifecycle transitions/state metadata, strict daily fetch intent, server-validated account selection, read-only capabilities, readiness, stable error classification, focused redaction, page/record/repeated-token/no-progress guards, injected-delay bounded retry, API provenance, a truthful not-built registry, and a test-only semantic comparator.

## Integration tests

Existing integration tests exercise synthetic raw CSV through Change Intelligence. Sprint 09 runs a labelled provider-neutral mock through account discovery, validated selection, two-page fetch, mock provider normalization, and API canonical provenance. The result is compared with the existing Meta CSV raw fixture after removing only provenance and sorting. Terminal authorization prevents provider page fetch, retryable/terminal errors remain structured, and runaway pagination fails closed.

## Connector contract tests

Connector tests are deterministic and perform no network request or real sleep. Separate assertions prove spend, attributed revenue, null/zero, and currency changes fail equivalence. API advertising value remains `attributedRevenue`. Mock records are not presented as real Meta API payloads.

## E2E tests

Playwright continues to verify the implemented single-CSV intake, mapping, Data Health, KPI, target, and What Changed flow. Sprint 09 adds no provider UI because no provider connector or OAuth action exists; E2E therefore verifies no decorative or fake connected behavior.

## Regression fixtures

Store labelled synthetic/anonymized provider CSV input in `fixtures/raw/`, canonical expectations in `fixtures/normalized/`, analytical expectations in `fixtures/expected/`, and provider-neutral connector mock input in `fixtures/connectors/mock/`. Expected artifacts are maintained independently from implementation code and never contain production/client data or secrets.

## Tooling and CI expectation

Vitest covers unit/integration suites and Playwright covers browser E2E. Expected commands remain `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:unit`, `npm run test:integration`, `npm run build`, and `npm run test:e2e`; all run without external services, databases, or provider credentials.
