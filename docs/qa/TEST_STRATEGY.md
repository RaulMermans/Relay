# Test architecture

## Principle

Core ingestion, health, and analytical logic must be independently testable from UI, persistence, and provider APIs. Tests use synthetic or anonymized fixtures only; every discovered parsing, transport, or calculation defect becomes a deterministic regression case.

## Unit tests

Existing suites cover CSV parsing/mapping/normalization, Data Health, KPIs, and Change Intelligence. Sprint 09 adds lifecycle transitions/state metadata, strict daily fetch intent, server-validated account selection, read-only capabilities, readiness, stable error classification, focused redaction, page/record/repeated-token/no-progress guards, injected-delay bounded retry, API provenance, a truthful not-built registry, and a test-only semantic comparator.

Sprint 14 adds controlled-storage unit coverage for client lifecycle/isolation, V1 validation, corrupt/unsupported/prototype-key recovery, save/load/reset, bounds, snapshot integrity, history caps, and freshness. Persisted targets are validated by the existing Change Intelligence contract rather than a second target system.

Sprint 15 adds pure Narrative Intelligence coverage for deterministic equality, stable IDs, evidence references, headline precedence, significance gating, deduplication, target/health/freshness attention, source-safe revenue wording, and blocked Data Health behavior.

Sprint 10 adds Shopify shop/order GraphQL validation, safe domain/store identity, store-local date boundaries, cursor translation, throttling/error classification, one-order grain, fixed-decimal gross revenue, currency, null optional fields, safe API provenance, and implemented-but-unconfigured registry coverage. Network and delay functions are injected; tests contact no provider and never sleep.

Sprint 11 adds Meta Graph account/Insights validation, authoritative `act_` identity, account currency/timezone metadata, exact daily ad-grain query parameters, purchase-only action/value extraction, null/zero behavior, safe cursor handling, documented throttle/error classification, API provenance, and implemented-but-unconfigured registry coverage. Network and delay functions are injected; tests contact no provider and never sleep.

Sprint 12 adds Google Ads v25 REST validation, direct and manager-access customer discovery, nested serving-client selection, provider-owned login context, minimal daily ad-group GAQL, fixed 10,000-row page-token handling, exact cost-micros conversion, primary conversions/value semantics, null/zero, customer currency/timezone dates, safe error classification, API provenance, and implemented-but-unconfigured registry coverage. Network and delay functions are injected; tests contact no provider and never sleep.

## Integration tests

Existing integration tests exercise synthetic raw CSV through Change Intelligence. Sprint 09 runs a labelled provider-neutral mock through account discovery, validated selection, two-page fetch, mock provider normalization, and API canonical provenance. The result is compared with the existing Meta CSV raw fixture after removing only provenance and sorting. Terminal authorization prevents provider page fetch, retryable/terminal errors remain structured, and runaway pagination fails closed.

Sprint 14's repeat-cycle integration creates a client, analyzes period one with a manual mapping, round-trips browser memory, safely reuses that mapping and targets in period two, and preserves bounded history without raw CSV/canonical rows. Separate coverage proves incompatible saved mappings return to review and client configuration/snapshots do not leak.

Sprint 15's integration coverage continues real CSV -> normalization -> Data Health -> KPI -> Change Intelligence -> Narrative Intelligence and asserts that narrative evidence refers to downstream facts only. Complete-workspace cases preserve Shopify commerce revenue, Meta/Google provider attribution, and blocked currency behavior.

Sprint 10 runs labelled synthetic Shopify GraphQL pages through the provider validator/normalizer and compares them with the existing representative Shopify CSV. Comparison ignores transport provenance and identity only where one transport cannot supply it; identity remains strict when both supply it. Focused negative cases change gross revenue, currency, order count, null/zero, and date. API observations then pass through existing Data Health, KPI, and Change Intelligence functions without transport branches.

Sprint 11 runs labelled synthetic Meta v26.0 account/Insights pages through discovery, selection, pagination, validation, and normalization, then compares them with the existing representative Meta CSV. Comparison ignores transport provenance and identity only where either transport lacks it; jointly supplied campaign names remain strict. Negative cases change spend, impressions, clicks, purchase conversions/value, currency, null/zero, date, and joint campaign identity. API observations then pass through existing Data Health, KPI, and Change Intelligence functions without transport branches.

Sprint 12 runs labelled synthetic Google Ads v25 accessible-customer, manager-hierarchy, and paged Search responses through discovery, server selection, manager-context validation, normalization, and comparison with the existing representative Google CSV. Negative cases change every primitive measure, currency, null/zero, date, and jointly available campaign/ad-group identity. API observations pass unchanged through existing Data Health, KPI, and Change Intelligence and never expose advertising value as commerce revenue.

## Connector contract tests

Connector tests are deterministic and perform no network request or real sleep. Separate assertions prove spend, attributed revenue, null/zero, and currency changes fail equivalence. API advertising value remains `attributedRevenue`. Mock records are not presented as real Meta API payloads.

## E2E tests

Playwright continues to verify the implemented single-CSV intake, mapping, Data Health, KPI, target, and What Changed flow. Sprint 09 adds no provider UI because no provider connector or OAuth action exists; E2E therefore verifies no decorative or fake connected behavior.

Sprint 10 additionally verifies the truthful Shopify API adapter/live-unavailable text, absence of a connect control, and continued CSV file input. No live credential is required.

Sprint 11 adds the same truthful implemented/live-unavailable state for Meta Ads and verifies there is no inert Meta connect control. Existing Meta CSV browser coverage remains credential-free.

Sprint 12 adds the truthful Google Ads implemented/live-unavailable state, verifies no inert Google connect control, and exercises the permanent Google CSV intake/normalization/KPI path without credentials.

Sprint 13 replaces the single-file browser workflow with complete-workspace and exception flows. E2E covers the minimal shell, three-source automatic preparation, mapping correction/re-analysis, safe unsupported-source recovery, transient target Attention, and mobile overflow. Tests require no database, provider credential, or network service.

Sprint 14 E2E adds explicit client creation, latest-dashboard restoration after reload, freshness disclosure, repeat compatible-mapping reuse, expected-source reuse, cycle history, and two-client switching/isolation. Browser storage is reset per test and no upload is restored automatically.

Sprint 15 E2E verifies the immediate Performance Summary, headline, key developments, needs-attention state, and evidence disclosure. It asserts no generation control, loading state, model-provider error, or network requirement exists.

## Regression fixtures

Store labelled synthetic/anonymized provider CSV input in `fixtures/raw/`, canonical expectations in `fixtures/normalized/`, analytical expectations in `fixtures/expected/`, and provider-neutral connector mock input in `fixtures/connectors/mock/`. Expected artifacts are maintained independently from implementation code and never contain production/client data or secrets.

`fixtures/workspace/scenarios.json` composes existing labelled synthetic CSVs for complete, paid-only, Meta-plus-Shopify, partial-coverage, currency-mismatch, mapping-exception, and target-breach workspace regressions without duplicating provider facts.

## Tooling and CI expectation

Vitest covers unit/integration suites and Playwright covers browser E2E. Expected commands remain `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:unit`, `npm run test:integration`, `npm run build`, and `npm run test:e2e`; all run without external services, databases, or provider credentials.
