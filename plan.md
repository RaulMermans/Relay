# Sprint 13 - Daily Dashboard + Multi-Source Workspace

| Task | Outcome | Relevant files/docs | Acceptance criteria | Status |
| --- | --- | --- | --- | --- |
| T-339 Product UX Contract | Establish the dashboard-first UX source of truth. | `docs/product/PRODUCT_UX.md` | Daily questions, product loop, exception-driven disclosure, deterministic authority, and freshness limits are explicit. | Complete |
| T-340 Product Positioning Update | Align daily monitoring with reporting automation. | Product docs, `README.md` | Relay is framed as a focused dashboard plus reporting automation, never real-time BI. | Complete |
| T-341 Information Architecture | Limit V1 navigation to useful surfaces. | `docs/product/PRODUCT_UX.md`, app shell | Only Overview and Data Sources appear; dead future destinations are absent. | Complete |
| T-342 Application Shell | Replace the engineering intake page with a product shell. | `app/` | Relay identity, workspace, period, source status, content, actions, and responsive navigation feel intentional. | Complete |
| T-343 Transient Workspace | Model one session-scoped analytical workspace. | Workspace UI/types/docs | State is transient; browser storage contains no raw CSV, canonical data, credentials, or tokens. | Complete |
| T-344 Workspace Naming | Let the active workspace use a human-readable name. | Workspace UI | Name editing works transiently without client CRUD or persistence claims. | Complete |
| T-345 Reporting Period UX | Present an understandable current and previous period. | Workspace UI, period contract | Users select the current range; the previous equal-length range remains server-derived. | Complete |
| T-346 Multi-Source Workspace | Provide truthful Meta, Google, and Shopify source slots. | Source management UI | Each provider has one CSV slot; live API remains clearly unavailable. | Complete |
| T-347 Source Cards | Summarize compact source readiness. | Source presentation | Status, coverage, latest date, currency, and observation count are human-readable. | Complete |
| T-348 Multi-File Orchestration | Combine one active CSV dataset per provider. | `lib/workspace/` | Existing normalization feeds one combined Data Health, KPI, and Change Intelligence execution. | Complete |
| T-349 Workspace Server Boundary | Add one server-authoritative analysis endpoint. | `app/api/workspace/analyze/` | Inputs are revalidated; responses omit raw and canonical rows. | Complete |
| T-350 Automatic Mapping | Skip mapping confirmation on the deterministic happy path. | Workspace orchestration/UI | Ready mappings proceed directly to analysis. | Complete |
| T-351 Mapping Exceptions | Reveal only fields that require correction. | Workspace UI/API | Copy is actionable, focused, and allows corrected re-analysis. | Complete |
| T-352 Meta Day Alias Regression | Recognize the supported Meta `Day` date header. | Mapping catalog, fixtures/tests | `Day` and existing `Date` behavior map deterministically with regression coverage. | Complete |
| T-353 Preparation State | Show compact truthful preparation progress. | Workspace UI | Immediate processing has brief, non-fake recognized/mapped/checked states. | Complete |
| T-354 Exception Center | Group user-facing issues by actionability. | Presentation/workspace UI | A compact count leads to blocking, target, source, and warning actions without dumping findings. | Complete |
| T-355 Humanized Data Health | Translate structured findings into deterministic product copy. | `lib/presentation/` | Code, severity, blocking, and evidence remain unchanged underneath human wording. | Complete |
| T-356 Progressive Data Health | Keep healthy trust state compact and details inspectable. | Dashboard UI | Status defaults to Good or item count; technical detail is behind View details. | Complete |
| T-357 Presentation Formatting | Add a pure formatting boundary. | `lib/presentation/`, unit tests | Currency, ratios, percentages, integers, signs, and unavailable values render consistently without changing facts. | Complete |
| T-358 Dashboard Hierarchy | Order the dashboard around daily questions. | Dashboard UI | Performance, What Changed, Channels, Attention, and Data quality appear in that order. | Complete |
| T-359 Hero KPIs | Choose useful KPIs from available sources. | KPI presentation | Commerce Revenue, Spend, MER, Orders lead when available; provider ROAS stays separate and truthful. | Complete |
| T-360 KPI Visual Treatment | Give KPI facts a premium readable hierarchy. | Dashboard styles/components | Human labels, formatted current values, deltas, and context replace raw engine presentation. | Complete |
| T-361 Performance Trend | Add one truthful responsive daily trend. | Workspace response/presentation/UI | Shopify revenue and paid spend are distinct; advertising attribution is never presented as commerce revenue. | Complete |
| T-362 What Changed Curation | Default to the most useful 3-4 observations. | Presentation/UI | Deterministic priority and deduplication avoid repeated prominent stories; View all remains available. | Complete |
| T-363 Observation Presentation | Humanize movement and polarity safely. | Presentation/UI | Copy states the metric movement without unsupported causality or altered evidence. | Complete |
| T-364 Channel Cards | Summarize Meta, Google, and Shopify performance. | Dashboard UI | Each source shows current facts, change, and readiness without becoming a mini-dashboard. | Complete |
| T-365 Attention | Prioritize actionable issues. | Presentation/dashboard UI | Blocking health, target breaches, missing sources, and significant warnings appear in order; favorable insights do not. | Complete |
| T-366 Source Management | Update source data without losing dashboard context. | Workspace UI | Update data opens source management and preserves compact analysis state until replacement succeeds. | Complete |
| T-367 Empty State | Make first use directional and truthful. | Workspace UI | Users can name the workspace, set a period, and add CSV data without decorative demo metrics. | Complete |
| T-368 Loading States | Provide stable preparation feedback. | Workspace UI | Controls prevent duplicate submission and status is announced without fake duration. | Complete |
| T-369 Error States | Explain failures with a recovery action. | Workspace UI | Server-safe messages are human-readable; retry/update actions preserve valid context. | Complete |
| T-370 Responsive Design | Preserve hierarchy across desktop, tablet, and mobile. | App styles, E2E/visual QA | Navigation, dashboard, cards, chart, and source management remain usable at required widths. | Complete |
| T-371 Accessibility | Meet the Sprint 13 accessibility baseline. | Components/styles/E2E | Semantic structure, labels, keyboard flow, focus, contrast, status text, chart summary, and reduced motion pass. | Complete |
| T-372 Visual System | Create a coherent editorial analytics system. | Global/app styles | Tokens, typography, spacing, states, and numerical rhythm are distinctive and restrained. | Complete |
| T-373 Dependency Review | Keep the frontend dependency set minimal. | `package.json`/lockfile | No chart or UI dependency is added without necessity; native React/CSS/SVG is preferred. | Complete |
| T-374 Fixtures | Add labelled multi-source synthetic fixtures. | `fixtures/workspace/` | Complete, paid-only, partial, warning, mismatch, mapping, and target scenarios contain no real data. | Complete |
| T-375 Unit Tests | Cover workspace and presentation behavior. | `tests/unit/` | Formatting, curation, humanization, period/source summaries, and Meta alias behavior are deterministic. | Complete |
| T-376 Integration Tests | Prove combined server-authoritative analysis. | `tests/integration/` | Multi-source combinations, mapping exceptions, health gates, targets, and revenue semantics pass. | Complete |
| T-377 Complete Workspace E2E | Verify the complete three-source workflow. | `tests/e2e/` | CSV sources analyze automatically into the dashboard without credentials. | Complete |
| T-378 Exception E2E | Verify correction and recovery. | `tests/e2e/` | Mapping or health exceptions are focused, actionable, and re-analyzable. | Complete |
| T-379 Visual QA | Inspect dashboard states at required viewports. | Browser screenshots/notes | Empty, ready, warning, blocked, loading, and error states are visually reviewed and fixed. | Complete |
| T-380 UX Smell Test | Remove technical and decorative product smells. | Product UI | No dead nav, raw enums, repeated cards, fake live claims, or backend architecture dominates. | Complete |
| T-381 Security/Integrity | Review upload, state, response, and semantic boundaries. | Scoped code/docs/tests | No secrets/raw rows leak; bounds, revalidation, blocking behavior, and revenue semantics remain intact. | Complete |
| T-382 Documentation | Align focused product, data-flow, QA, roadmap, and changelog docs. | Focused docs | Documentation matches actual Sprint 13 behavior and deferrals. | Complete |
| T-383 Full Verification | Run the complete repository verification ladder. | Repository commands | Install, lint, typecheck, all tests, build, E2E, diff, semantics, scope, and UX evidence are observed. | Complete |
| T-384 Sprint 14 Handoff | Define the exact durable client/report-memory follow-up. | `SCRATCHPAD.md`, roadmap context | Persistence evaluation and saved client/report configuration are bounded without implementing Sprint 14. | Complete |
