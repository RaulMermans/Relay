# Sprint 14 execution state

## Baseline

- Sprint 13 status: **PASS** on 2026-08-17.
- Sprint 13 documentation commit: `36e66162325aad318c733f0bea430149d657f3a2`.
- Sprint 13 implementation commit: `dbae03f16966e2ff2790f50f6205c119d6dab6f5`.
- Sprint 14 began on clean `main`; no Sprint 13 changes were absorbed.

## Persistence decision

- Choice: one namespaced `localStorage` document behind `RelayMemoryStore`; IndexedDB is unnecessary for bounded summaries and an external database would require deferred ownership/auth/governance decisions.
- ADR: `docs/decisions/ADR-007-demo-persistence-and-future-database-boundary.md` refines ADR-006 without adding cloud persistence.
- Schema: `RelayMemoryV1`, `version: 1`; load -> supported-version migration boundary -> validation. Unsupported/corrupt/oversized/unsafe state fails to explicit reset.
- Limits: 50 clients; 52 cycles/client; 10 existing-contract targets; 128 mappings; 20 notes of 500 characters; 2,000,000 serialized characters.

## Stored / excluded

- Stored: local client identity/timestamps, source expectations, exact provider/header mapping decisions, targets, fixed source-of-truth rules, bounded notes/preferences, one compact authoritative dashboard snapshot, bounded cycle summaries, and safe local workflow counters/timestamps.
- Excluded: raw CSV, filenames, files/rows, canonical observation arrays, provider payloads, customer PII, credentials, tokens, authorization headers, provider secrets, report/PDF artifacts.

## UX decisions

- No demo seed. First use requires an explicitly named local client.
- Returning clients open on the last dashboard with per-source data-through metadata, analyzed time, Current/Needs refresh/Old labels, and Update data.
- Client create/select/rename/delete remains lightweight in the shell; memory settings use progressive disclosure. Delete/reset require confirmation.
- Saved mappings are provider- and exact-header-scoped and are reused only when the current proposal confirms compatibility; otherwise focused review remains mandatory.

## Commands, failures, and fixes

- Node/npm were restored from the same temporary Node 24.14.0 runtime used for Sprint 13 because npm is not on the desktop shell PATH.
- TDD regressions covered persistence, repeat cycles, reload/switching, incompatible saved mappings, and save/load prototype-key rejection.
- Fixed Zod's special-key edge case with recursive dangerous-key rejection on both load and save.
- Fixed explicit ignored-column mapping capture, the target-on-change E2E race, and the missing expected-source cue found by focused tests.
- Reused the canonical Change Intelligence target parser after a failing regression proved the local schema accepted an unsupported report-level target.
- Final clean install: `npm ci` added 388 packages, audited 389, and reported 0 vulnerabilities.
- Final verification: lint passed; typecheck passed; 38 Vitest files / 287 tests passed; 24 unit files / 196 tests passed; 14 integration files / 91 tests passed; production build passed; 11 Playwright tests passed; `git diff --check` passed.
- Focused memory E2E covered reload restoration, repeat mapping reuse, client isolation, 820 px tablet, and 390 px mobile with no horizontal overflow.
- Security/data/architecture/code reviews found no remaining material issue after canonical target reuse, dangerous-key save validation, conservative mixed-source freshness, and ephemeral fallback when storage is unavailable.

## Sprint 15 execution state

- Pre-pivot audit found `main` clean at `77b805b5f1b8c3954da48728f2ffdc79053d9bb7`; the empty recovery patch and untracked-file list were written outside the repository in `/private/tmp`.
- Relay V1 now uses bounded deterministic Narrative Intelligence after Change Intelligence. It produces a report-ready package from existing structured facts and never receives raw CSV, canonical rows, provider payloads, or credentials.
- Human narrative overrides are deferred until Sprint 16 proves a report-composition need. Existing browser-memory schema and cycle history remain unchanged; the summary is reproducible from the persisted analytical snapshot.

## Next action

- Sprint 16 baseline repair fast-forwarded `main` to `2b3fb8d` (Sprint 15). Browser-native print is selected in ADR-009: the pure `ReportDocument` composer consumes the snapshot’s persisted Narrative Intelligence and existing KPI/Data Health facts only. No dependency, server-side PDF renderer, PDF persistence, raw rows, or generative model is permitted.
- Current implementation: report model/composer, semantic fail-closed guards, source-safe KPI/channel selection, deterministic filename/title, light editorial preview, A4 print CSS, stale export disablement, and initial unit/E2E coverage. Pending closure: run stable test/lint/browser commands in this workspace and complete visual/security review; local Vitest/ESLint wrappers currently hang after startup.

## Sprint 17 execution state

- Baseline: local `main` and `origin/main` have unrelated histories. Sprint 17 branches from the repository's existing `codex/sprint-16-main-reconciliation` branch at `a211212`, which is also `origin/main`; it contains the reconciled Sprint 16 release path.
- Node 24.14.0 and npm 11.9.0 were selected with nvm. The initial `npm ci` succeeded. Stale ignored `.next/types/* 2.ts` generated duplicates were moved recoverably to `/private/tmp/relay-next-types-duplicate-backup`; typecheck then passed and the production build regenerated its normal type output.
- Added request declaration guards, duplicate-normalized-header/null-byte rejection, mixed-newline parsing, and a 256-character fixed-decimal input bound. CSV source rows, report semantics, and persistence schema remain unchanged.
- Independent security, data-contract, and PR review passes found no P0/P1 issue. `npm audit --audit-level=low` reported 0 vulnerabilities; `npm outdated` is informational and no dependency was upgraded.
- Verification: lint/typecheck/build passed; 42 Vitest files/304 tests, 26 unit files/209 tests, 16 integration files/95 tests passed; release stress processed a synthetic 50,000-row Meta CSV in 807 ms; full Playwright suite passed 48 tests across Chromium, WebKit, and Firefox.
- Closure evidence (2026-08-25): the protected production deployment at `c05bd108` passed its health and complete-workspace API smoke; no runtime errors were observed. Manual production QA confirmed three-source dashboard/report semantics, browser-local restore after reload, visible primary actions and KPIs at 390 px and 768 px, and Chrome's six-page A4 Save-as-PDF result. The beta matrix and release gate now record PASS; Sprint 18 may begin.
