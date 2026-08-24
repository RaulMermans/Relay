# Sprint 17 release gate

## Severity model

| Severity | Meaning | Beta action |
| --- | --- | --- |
| P0 | Data/security corruption or critical privacy issue | Stop beta and rollback/pause access. |
| P1 | Authoritative analytics or report materially wrong | Stop affected workflow; fix before beta continues. |
| P2 | Significant workflow or UX failure | Document and explicitly accept before release. |
| P3 | Minor presentation/non-blocking defect | Triage for a later release. |

## Gate

`SPRINT_17_PRIVATE_BETA_READY` may be recorded only when all are true:

- Zero unresolved P0 or P1; accepted P2 issues are listed in `KNOWN_ISSUES.md`.
- Deterministic unit/integration/reproducibility/invariant suites are green.
- Chromium, WebKit, and Firefox critical smoke is green.
- Security, data-contract, and PR reviews have no material open finding.
- Accessibility baseline, manual exploratory QA, and visual review are marked PASS in `PRIVATE_BETA_MATRIX.md`.
- Production build, dependency audit, and diff check are green.
- Vercel deployment protection is configured and independently verified before tester access.
- `BETA_RUNBOOK.md`, `PRIVATE_BETA.md`, and rollback instructions are ready.

## Current checkpoint

Automated gates are pending final full verification. Manual exploratory QA and visual review have not yet been recorded; therefore this repository is **not yet marked** `SPRINT_17_PRIVATE_BETA_READY`.

## Sprint 18 handoff (do not start)

Sprint 18 may begin only after this gate is satisfied. Its scope is production deployment/protection validation, production smoke, final cross-browser and PDF validation, environment verification, rollback validation, public documentation/assets, GitHub hygiene, release tag/version, and project closure. It does not expand V1 analytics, storage, OAuth, or application authentication without a separate decision.
