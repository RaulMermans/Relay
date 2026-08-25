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

`SPRINT_17_PRIVATE_BETA_READY` is recorded on 2026-08-25 for production commit `c05bd108cc552a945cc1b97f6c311a650d9bd3c8`.

- Automated evidence: lint, typecheck, unit, integration, full Vitest, production build, dependency audit, diff check, and the 48-test Chromium/WebKit/Firefox Playwright suite passed.
- Production evidence: the protected Vercel deployment served the non-sensitive health response and accepted the synthetic complete-workspace analysis without runtime errors.
- Manual evidence: a three-source workspace restored after browser reload; dashboard and report values were reviewed at desktop, 390 px, and 768 px; Chrome generated the attached six-page A4 PDF, which preserved the expected KPI and source-semantics disclosures.

The synthetic fixture ends on 2026-08-02 while the recorded report period ends on 2026-09-01. Its resulting freshness and coverage warnings are expected and are not a release finding.

## Sprint 18 handoff

Sprint 18 may begin. Its scope is production deployment/protection validation, production smoke, final cross-browser and PDF validation, environment verification, rollback validation, public documentation/assets, GitHub hygiene, release tag/version, and project closure. It does not expand V1 analytics, storage, OAuth, or application authentication without a separate decision.
