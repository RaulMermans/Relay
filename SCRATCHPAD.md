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

- Sprint 16 should consume Client, reporting period, Data Health, deterministic KPIs, Change Intelligence, Narrative Intelligence, targets, channels, freshness, preferences, and methodology metadata to create a structured report model, preview, and PDF. Do not add a generative-model dependency.
