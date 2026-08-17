# Sprint 14 - Client + Report Memory

| Task | Outcome | Relevant files/docs | Acceptance criteria | Status |
| --- | --- | --- | --- | --- |
| T-385 Persistence Decision | Select the smallest no-cost store for compact non-sensitive memory. | ADR-007, architecture docs | localStorage, IndexedDB, and external storage are evaluated; the chosen option fits actual data and adds no dependency. | Complete |
| T-386 Persistence ADR | Record the browser-local and future database boundary. | `docs/decisions/ADR-007-demo-persistence-and-future-database-boundary.md` | Stored/excluded data, limitations, migration path, and revisit triggers are explicit without superseding ADR-006. | Complete |
| T-387 Persistence Boundary | Centralize product memory access. | `lib/persistence/` | Product code uses one `RelayMemoryStore`; localStorage does not leak through components. | Complete |
| T-388 Memory Schema | Define compact versioned client memory. | `lib/persistence/types.ts`, `schema.ts` | Version 1 contains only purposeful bounded client/configuration/snapshot/history fields. | Complete |
| T-389 Client Model | Support local client lifecycle. | Persistence domain/store | Create, select, rename, and delete are deterministic and isolated. | Complete |
| T-390 Client Selector | Add lightweight client management to the shell. | Workspace UI/styles | Users can switch, create, rename, and confirm deletion without a CRM surface. | Complete |
| T-391 Source Configuration | Remember expected CSV sources per client. | Persistence types/UI | Expected sources and CSV preference survive reload; files and provider data do not. | Complete |
| T-392 Mapping Memory | Save bounded provider/header mapping decisions. | Persistence domain/schema | Only deterministic or user-approved client/provider/header mappings persist. | Complete |
| T-393 Mapping Reuse | Reapply safe client mappings on later uploads. | Workspace UI/API integration | Compatible saved mappings become overrides; conflicts return to focused review with origin retained. | Complete |
| T-394 KPI Targets | Persist existing target-contract values per client. | Persistence types/UI, target contract | Targets can be added, edited, and removed without a duplicate analytical contract. | Complete |
| T-395 Source-of-Truth Rules | Persist valid reporting authority rules. | Persistence schema/UI | Shopify remains commerce truth and provider attribution remains provider-specific. | Complete |
| T-396 Attribution Notes | Save bounded human context separately from rules. | Persistence schema/UI | Notes persist but cannot change calculations. | Complete |
| T-397 Reporting Preferences | Remember lightweight later-report inputs. | Persistence schema/UI | Weekly/monthly cadence and bounded section choices persist without report generation. | Complete |
| T-398 Analysis Snapshot | Save a compact derived dashboard snapshot. | Persistence snapshot helpers | Period, freshness, health, structured KPIs, changes, sources, targets, and trend redraw the dashboard. | Complete |
| T-399 Snapshot Integrity | Preserve authoritative structured values. | Snapshot schema/tests | Fixed-decimal values and units persist; formatted strings are presentation-only. | Complete |
| T-400 Freshness Model | Attach explicit analysis/source freshness. | Snapshot schema/UI | Every snapshot exposes analyzed time and source data-through dates. | Complete |
| T-401 Stale Data UX | Label returned snapshots deterministically. | Workspace UI/docs | Current, Needs refresh, and Old use documented date rules without live-data implications. | Complete |
| T-402 Report-Cycle History | Keep bounded local analysis-cycle summaries. | Persistence domain/schema | Each completed analysis appends a compact per-client summary capped at 52. | Complete |
| T-403 History UX | Show compact recent cycle activity. | Workspace UI/styles | Recent periods and freshness are inspectable without a report library. | Complete |
| T-404 Repeat Workflow | Reuse client setup for the next cycle. | Workspace UI/persistence | Update data retains expected sources, mappings, targets, and preferences. | Complete |
| T-405 Dashboard Restoration | Restore the active client's latest dashboard. | Workspace initialization | Reload displays the saved dashboard without re-analysis; configured empty clients remain directional. | Complete |
| T-406 Storage Validation | Treat browser state as untrusted. | Zod schema/store | Malformed state fails safely with recovery and never crashes the app. | Complete |
| T-407 Schema Versioning | Add an explicit migration boundary. | Persistence schema/store | Version 1 validates through load -> migrate-if-supported -> validate; unsupported versions fail safely. | Complete |
| T-408 Storage Limits | Bound browser memory. | Persistence constants/schema/tests | Clients, history, notes, targets, mappings, snapshots, and serialized size are capped. | Complete |
| T-409 Client Delete | Remove one client's complete memory safely. | Persistence domain/UI | Confirmed deletion removes only that client's config, snapshot, and history. | Complete |
| T-410 Reset | Clear only Relay's memory namespace. | Persistence store/UI | Confirmed reset removes the Relay key and leaves unrelated storage untouched. | Complete |
| T-411 Privacy Disclosure | Explain local memory truthfully. | Product UI/docs/security | Copy states browser-only memory and that CSVs/credentials are not retained. | Complete |
| T-412 Browser Storage Security | Review the local trust boundary. | Security review | Secrets, unsafe JSON, XSS, oversized data, isolation, and deletion receive evidence-backed review. | Complete |
| T-413 No OAuth Persistence | Keep credentials outside memory. | Schema/tests/scope search | Memory types reject/omit tokens, headers, credentials, and provider secrets. | Complete |
| T-414 Memory UX | Integrate settings progressively. | Workspace UI/styles | Sources, targets, rules, notes, and preferences remain compact and contextual. | Complete |
| T-415 Return Experience | Make saved dashboards primary on re-entry. | Workspace UI/E2E | Active client, snapshot, period, freshness, changes, attention, and Update data appear immediately. | Complete |
| T-416 Demo Seed Decision | Decide whether demo seeding is warranted. | ADR/product docs | No fake client is silently created; skip seeding unless clearly beneficial. | Complete |
| T-417 Persistence Tests | Cover store, schema, domain, limits, and recovery. | `tests/unit/persistence.test.ts` | Required lifecycle, validation, memory, freshness, cap, reset, and isolation cases pass with a storage double. | Complete |
| T-418 Repeat-Cycle Integration | Prove recurring setup reuse. | `tests/integration/client-memory-workflow.test.ts` | Period 2 reuses config/mappings/targets, retains history, and stores no raw CSV. | Complete |
| T-419 Client Isolation | Prove client boundaries. | Integration tests | Switching clients never leaks targets, mappings, setup, or snapshots. | Complete |
| T-420 Persistence E2E | Prove reload restoration. | `tests/e2e/workspace-memory.spec.ts` | Client/dashboard/freshness restore after page reload without upload. | Complete |
| T-421 Repeat E2E | Prove the next-period workflow. | E2E tests | Expected sources and saved configuration remain available for updated exports. | Complete |
| T-422 Client Switching E2E | Prove UI isolation. | E2E tests | Two clients retain distinct dashboards, targets, setup, and history. | Complete |
| T-423 Performance Sanity | Keep local restore lightweight. | Store tests/QA | Parsing and rendering remain bounded without new performance infrastructure. | Complete |
| T-424 Validation Instrumentation Contract | Define later measurement inputs without telemetry. | Success metrics/schema docs | Safe local cycle metadata supports future timing/reuse measures; nothing is sent externally. | Complete |
| T-425 Success Metrics | Align memory with validation hypotheses. | `docs/product/SUCCESS_METRICS.md` | Setup time, reuse, cycles, and returns remain measurable hypotheses, not claimed outcomes. | Complete |
| T-426 UX QA | Review memory states responsively. | Browser evidence/styles | Client, return, stale, repeat, history, delete, and reset states remain clean on desktop/tablet/mobile. | Complete |
| T-427 Architecture Smell Test | Review persistence scope and replaceability. | Scoped diff/reviews | Storage is centralized, bounded, versioned, truthful, optional, and free of sensitive/raw data. | Complete |
| T-428 Documentation | Align product, architecture, QA, security, and changelog. | Required Sprint 14 docs | Documentation matches implemented browser-local behavior and deferrals. | Complete |
| T-429 Full Verification | Run the complete closure ladder. | Repository commands | Install, lint, typecheck, all tests, build, E2E, diff, semantics, security, UX, and scope checks pass. | Complete |
| T-430 Sprint 15 Handoff | Bound grounded AI and human review follow-up. | `SCRATCHPAD.md`, roadmap context | Next task uses only bounded structured facts/context and does not implement AI now. | Complete |
