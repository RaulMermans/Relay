# Sprint 13 execution state

- Sprint 13 closure status: **PASS** on 2026-08-17.

## Baseline

- Sprint 12 complete at `822b081`; Sprint 13 began on clean `main`.
- Restored exact npm lockfile state with Node 24.14.0/npm 11.9.0 after the desktop shell lacked npm.
- Pre-change verification: lint passed, typecheck passed, 33 test files / 255 tests passed, production build passed, and 9 Playwright tests passed.
- Provider adapters and CSV paths remain intact; no database, Prisma, durable workspace persistence, live OAuth, automatic sync, or chart dependency exists.

## Product direction

- Relay is a daily performance dashboard with recurring reporting automation underneath it.
- Primary order: Performance -> What Changed -> Channels -> Attention -> Data quality.
- Navigation: Overview and Data Sources only. Reports remains absent until implemented.
- Successful preparation is automatic; mapping and Data Health internals appear only for correction or inspection.

## Workspace architecture

- One `POST /api/workspace/analyze` multipart boundary accepts reporting context, expected sources, targets, and at most one CSV per supported provider.
- Each file uses existing validation, parsing, detection, mapping, and normalization; canonical observations combine only on the server before unchanged Data Health, KPI, and Change Intelligence engines.
- The response contains compact source summaries, trend points, structured results, and mapping exceptions; it never returns raw rows or canonical observations.
- Browser state is session-scoped React state. No raw CSV, canonical facts, credentials, or API tokens enter `sessionStorage` or other persistence.

## Visual decisions

- Direction: performance ledger - an editorial analytical page with a slim workspace/date/source rail and a continuous evidence flow rather than identical dashboard cards.
- Palette: graphite `#17201e`, cloud `#f2f4f1`, chalk `#ffffff`, sea `#256f64`, aubergine `#5a4a72`, amber `#a86516`.
- Typography: restrained system display stack for headings, neutral system body stack, tabular numerals for data; no external font dependency.
- Signature: a source-to-period status rail visually connects freshness, trend, and attention while encoding real workspace state.
- Motion is brief and functional; reduced-motion disables transitions.

## Dependency decision

- Keep the existing dependency set. Use React, CSS, Intl, and an internal accessible SVG trend; do not add a chart or component package.

## Execution order

1. Documentation and product contract.
2. Meta `Day` regression plus presentation/workspace unit tests (red then green).
3. Server-authoritative workspace orchestration and integration fixtures/tests.
4. Dashboard shell, source manager, progressive exceptions, trend, responsive and accessible states.
5. E2E and visual QA, focused reviews, docs alignment, full verification, sprint close.

## Issues and fixes

- The desktop shell did not expose npm. Bundled pnpm was incompatible with the npm checkout and partially relocated `node_modules`; exact `npm ci` restored 388 packages with 0 vulnerabilities and the temporary `.pnpm-store` was removed.
- Final clean-install verification encountered transient Windows `ENOTEMPTY` races while replacing Next.js files. After verifying and removing only the repository's `node_modules`, the original `npm ci` completed with npm debug-log exit `0`; the requested verification ladder then ran against the restored lockfile state.
- Focused review found that blocked currency-mismatch workspaces still received trend points and that source summaries returned unused normalization metadata. Failing integration tests reproduced both issues; blocked trend output is now empty and the response is limited to source, status, row count, date range, and currencies.

## Verification and review evidence

- Data-contract review: no findings. Shopify gross revenue remains report-level commerce truth; Meta/Google attributed revenue and ROAS remain source-specific; no FX, fabricated zero, generic revenue field, or normalizer semantic change was introduced.
- Change Intelligence review: no findings. Curation preserves deterministic priority/evidence, deduplicates only prominent presentation stories, uses documented polarity, and makes no causal or significance claim.
- Security review: no findings after response minimization. Upload bounds/revalidation remain server-authoritative; logs contain statuses/source IDs only; raw rows, canonical observations, filenames, credentials, and tokens are absent from responses and browser persistence.
- Code review: no P0-P3 findings after the blocked-trend regression fix. No dependency or architecture expansion was introduced.
- Verification: `npm ci` exit `0` (observed in npm debug log); lint exit `0`; typecheck exit `0`; 36 Vitest files / 271 tests passed; 23 unit files / 184 tests passed; 13 integration files / 87 tests passed; production build passed; 7 Playwright tests passed; `git diff --check` passed.
- Visual QA: empty, source-management, ready, warning/attention, blocked, loading, and error behavior were inspected across desktop, 820 px tablet, and 390 px mobile. The only defect found was a missing favicon request; `app/icon.svg` fixed it. Mobile had no horizontal overflow.

## Sprint 14 handoff

- Exact recommended task: **T-385 — Durable Client & Report Memory: evaluate and document the no-cost V1 persistence architecture for authenticated client, workspace, and report configuration—including ownership, encryption, migrations, retention, and Vercel compatibility—before implementing storage.**
- Do not begin T-385 as part of Sprint 13.
