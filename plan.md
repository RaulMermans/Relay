# Sprint 16 - Report Composer + PDF

| Task | Outcome | Relevant files/docs | Acceptance criteria | Status |
| --- | --- | --- | --- | --- |
| T-482 | Report experience defined | `docs/product/REPORT_EXPERIENCE.md` | Reader, hierarchy, disclosures, and client-safe boundaries documented. | Complete |
| T-483 | PDF architecture decided | `docs/decisions/ADR-009-report-composer-and-pdf.md` | Browser-native print decision and trade-offs documented. | Complete |
| T-484 | Dependency decision recorded | ADR-009, `package.json` | No PDF/runtime dependency added. | Complete |
| T-485 | Renderer-neutral report contract | `lib/report/types.ts` | Versioned `ReportDocument` contains selected authoritative facts only. | Complete |
| T-486 | Stable report identity | `lib/report/compose.ts` | Identity is deterministic from client, snapshot, period, and schema version. | Complete |
| T-487 | Pure composer | `lib/report/compose.ts` | Composer consumes compact analysis snapshot facts, not raw inputs. | Complete |
| T-488 | Semantic invariants | `lib/report/compose.ts`, tests | Shopify/Meta/Google/MER semantics fail closed. | Complete |
| T-489 | Concise hierarchy | `lib/report/types.ts`, `app/report-preview.tsx` | Default editorial section order is implemented. | Complete |
| T-490 | Editorial header | `app/report-preview.tsx` | Client, period, comparison, prepared date, and Relay identity render. | Complete |
| T-491 | Executive summary | composer, preview | Existing deterministic headline and summary render unchanged. | Complete |
| T-492 | Performance overview | composer, preview | Shopify-aware KPIs and paid-only unavailable states are truthful. | Complete |
| T-493 | Presentation formatting | `lib/presentation/`, composer | Existing formatter is used only at presentation boundary. | Complete |
| T-494 | Intentional trend treatment | composer, preview | Textual authoritative trend coverage is used; no chart dependency. | Complete |
| T-495 | Key developments | composer, preview | Three-to-five deterministic narrative stories render. | Complete |
| T-496 | Channel performance | composer, preview | Source-specific compact provider blocks render. | Complete |
| T-497 | Needs attention | composer, preview | Deterministic attention, targets, warnings, and healthy empty state render. | Complete |
| T-498 | Data quality | composer, preview | Client-safe quality and source coverage render without diagnostic codes. | Complete |
| T-499 | Freshness | composer, preview | Conservative data-through disclosure and manual-data wording render. | Complete |
| T-500 | Methodology | composer, preview | Source semantics and comparison context are concise and client-safe. | Complete |
| T-501 | Reporting preferences | persistence, preview | Existing section preferences control optional report sections. | Complete |
| T-502 | Dedicated preview | `app/report-preview.tsx` | Report canvas is distinct from the dashboard. | Complete |
| T-503 | Preview UX | `app/workspace.tsx`, preview | Back and explicit Export PDF actions exist outside print content. | Complete |
| T-504 | Report visual system | `app/globals.css` | Light A4 editorial canvas and report-specific styles exist. | Complete |
| T-505 | Pagination | `app/globals.css` | Covers, sections, KPI/channel blocks use print-safe break rules. | Complete |
| T-506 | Metadata | `app/workspace.tsx` | Sanitized report title is applied at the browser-print boundary. | Complete |
| T-507 | Safe filename | composer, unit tests | Filename excludes traversal/invalid characters and is length bounded. | Complete |
| T-508 | Explicit export | `lib/report/export.ts`, workspace | Only a user action invokes browser print; no PDF persists. | Complete |
| T-509 | Stale guard | export boundary, preview, E2E | Old preview remains inspectable; export disables until explicit refresh. | Complete |
| T-510 | Blocked guard | composer, dashboard, E2E | Blocked Data Health cannot create or export normal report. | Complete |
| T-511 | Missing Shopify | composer, preview, E2E | Paid-only report names unavailable commerce metrics without false totals. | Complete |
| T-512 | History integration | persistence | Existing compact analysis history remains the only history; no PDF metadata added. | Complete |
| T-513 | No PDF persistence | persistence, security docs | PDF bytes/artifacts are excluded from browser memory. | Complete |
| T-514 | Client-safe terminology | preview, experience doc | Report UI avoids internal analytics terminology. | Complete |
| T-515 | Accessibility | preview, CSS, E2E | Semantic structure, keyboard actions, contrast, focus, and textual trend coverage exist. | Complete |
| T-516 | Report unit tests | `tests/unit/report.test.ts` | Composer, identity, formatting, filename, guards, and export boundary are covered. | Complete |
| T-517 | Golden scenarios | `tests/integration/report-pipeline.test.ts` | Complete, paid-only, target, warning, blocked, and mixed cases reuse fixtures. | Complete |
| T-518 | Pipeline integration | `tests/integration/report-pipeline.test.ts` | Authoritative pipeline facts match selected report facts. | Complete |
| T-519 | Export boundary tests | unit tests | Current prints once; stale and blocked never print. | Complete |
| T-520 | Complete report E2E | `tests/e2e/report.spec.ts` | Full preview and explicit export flow passes. | Complete |
| T-521 | Paid-media E2E | `tests/e2e/report.spec.ts` | Paid-only disclosure and no false totals pass. | Complete |
| T-522 | Stale E2E | `tests/e2e/report.spec.ts` | Stale warning, disabled export, and refresh pass. | Complete |
| T-523 | Blocked E2E | `tests/e2e/report.spec.ts` | Blocked report/export are unavailable. | Complete |
| T-524 | Visual and print QA | Playwright, print CSS | Required viewports and A4 print behavior are inspected. | Complete |
| T-525 | Design smell review | report preview | Editorial hierarchy and repetition review completed. | Complete |
| T-526 | Anti-corruption review | repository search | One `AnalysisSnapshot -> ReportDocument -> browser print` path remains. | Complete |
| T-527 | Security review | security/data-contract/PR review | No sensitive/raw data or unsafe export path remains. | Complete |
| T-528 | Dependency audit | `package-lock.json`, npm audit | No report runtime dependency and audit passes. | Complete |
| T-529 | Documentation | product, architecture, QA, security, README, changelog | Documentation reflects actual deterministic browser-print behavior. | Complete |
| T-530 | Full verification | repository scripts | All mandated checks are observed under Node 24/npm 11.9. | Complete |
| T-531 | Sprint 17 handoff | `SCRATCHPAD.md` | Hardening scope is prepared without implementation. | Complete |
