# Generic Connector Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and prove Relay's provider-neutral, read-only connector framework without a live provider, OAuth flow, network call, or durable connection store.

**Architecture:** Connector transport concerns stop at a provider-specific raw fetch result, then a provider normalizer produces the existing canonical observations. CSV and API provenance form a discriminated union, while analytics receives the same advertising/commerce shapes and the test comparator ignores provenance only.

**Tech Stack:** TypeScript 6, Zod 4, Vitest 4, existing Next.js 16 repository; zero new dependencies.

---

### Task 1: Contract types, lifecycle, account selection, and readiness

**Files:** create `lib/connectors/types.ts`, `lib/connectors/lifecycle.ts`, `lib/connectors/readiness.ts`; test `tests/unit/connectors-contract.test.ts`.

- [ ] Write tests that import the wished-for schemas/helpers and assert valid daily fetches, invalid account injection, allowed lifecycle transitions, and fetch readiness only for `ready` plus `reporting_fetch`.
- [ ] Run `npm run test:unit -- tests/unit/connectors-contract.test.ts` and observe module-not-found failure.
- [ ] Implement the provider/status/capability/connection/account/fetch/result/interface types, strict Zod fetch schema, transition table, selected-account validator, and readiness result.
- [ ] Re-run the focused test and observe PASS.

### Task 2: Errors, redaction, pagination, and bounded retry

**Files:** create `lib/connectors/errors.ts`, `lib/connectors/pagination.ts`, `lib/connectors/retry.ts`; test `tests/unit/connectors-runtime.test.ts`.

- [ ] Write tests for retryable/terminal error codes, dangerous provider-error patterns, completed pagination, max pages/records, repeated token, no progress, retry success, and terminal no-retry.
- [ ] Run the focused test and observe missing-module failures.
- [ ] Implement `toConnectorError`, a narrow safe-string redactor, `paginate` with opaque provider tokens, and `withRetry` with injected delay.
- [ ] Re-run the focused test and observe PASS without real sleeps or network calls.

### Task 3: API provenance and canonical semantic equivalence

**Files:** modify `lib/normalization/types.ts` and `lib/data-health/checks/provenance.ts`; create `tests/support/connectors/semantic-equivalence.ts`; test unit provenance/equivalence cases.

- [ ] Write tests proving valid API provenance passes Data Health, invalid API identity fails, transport-only differences compare equal, and spend/attribution/null/currency changes compare unequal.
- [ ] Run focused tests and observe failures because provenance is CSV-only and the comparator is absent.
- [ ] Add discriminated `CsvObservationProvenance | ApiObservationProvenance`, transport-specific health validation, and a test-support semantic projection that removes only provenance.
- [ ] Re-run focused tests and observe PASS.

### Task 4: Mock connector integration and fixtures

**Files:** create `fixtures/connectors/mock/meta-ads-equivalent.json`, `tests/support/connectors/mock-connector.ts`, `tests/support/connectors/mock-normalizer.ts`, and `tests/integration/connector-framework.test.ts`.

- [ ] Add synthetic provider-like records matching `fixtures/raw/meta_ads/representative-export.csv` and integration tests for discovery, validated selection, paginated fetch, canonical normalization/equivalence, attributed-revenue preservation, retryable/terminal errors, and pagination guards.
- [ ] Run the integration test and observe failure before support code exists.
- [ ] Implement the smallest deterministic mock connector and mock normalizer; keep both test-only and provider-compatibility-neutral.
- [ ] Re-run integration and relevant Data Health/KPI tests and observe PASS.

### Task 5: Registry, contracts, skill, and truthful product documentation

**Files:** create `lib/connectors/registry.ts` and `.agents/skills/connector-implementation/SKILL.md`; modify the Sprint 09 named connector/data/architecture/QA docs, `README.md`, `CHANGELOG.md`, `plan.md`, and `SCRATCHPAD.md`.

- [ ] Add registry tests proving all providers are `not_built` and cannot be fetched.
- [ ] Implement the static truthful registry with no dynamic plugin system.
- [ ] Document lifecycle tables, fetch/error/pagination/retry/provenance/equivalence contracts, no-persistence limits, and provider framework-ready/live-not-built status.
- [ ] State that T-216 intentionally adds no decorative UI because no provider can truthfully connect.

### Task 6: Review, verification, and delivery

**Files:** all Sprint 09 changes.

- [ ] Run the data-contract, security-sanity, and read-only PR review workflows; fix every P0/P1 issue with a failing regression test first.
- [ ] Run `npm ci`, lint, typecheck, full/unit/integration Vitest, build, Playwright, `git diff --check`, dependency/scope/secret scans, and inspect outputs.
- [ ] Mark `plan.md` tasks complete and record exact observed results/blockers in `SCRATCHPAD.md`.
- [ ] Commit once as `feat: add generic connector framework` and confirm clean `main`.

## Self-review

- Spec coverage: T-188 through T-221 map to Tasks 1-6 and `plan.md`; live providers, OAuth, persistence, database, SDKs, AI, KPI changes, and decorative UI remain excluded.
- Placeholder scan: no deferred implementation placeholder exists; provider implementation is an explicit Sprint boundary, not incomplete Sprint 09 work.
- Type consistency: `Provider`, `ConnectionStatus`, `ConnectorCapability`, `ExternalAccount`, `FetchRequest`, `ProviderFetchResult`, `ConnectorError`, `Connector`, `paginate`, `withRetry`, and API/CSV provenance names are fixed across tasks.
