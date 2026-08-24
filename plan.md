# Sprint 17 - Security, QA + Private Beta Readiness

| Task | Outcome | Relevant files/docs | Acceptance criteria | Status |
| --- | --- | --- | --- | --- |
| T-532 | Private-beta contract | `docs/release/PRIVATE_BETA.md` | Audience, limits, support, exit documented | Complete |
| T-533 | Threat model | `docs/security/THREAT_MODEL.md` | Assets, controls, risk/actions documented | Complete |
| T-534 | Trust boundaries | `THREAT_MODEL.md`, architecture | Authority boundary matches implementation | Complete |
| T-535 | Route inventory | `THREAT_MODEL.md` | All server routes inventoried | Complete |
| T-536 | Request limits | intake routes, `limits.ts` | Bodies/files/fields bounded | Complete |
| T-537 | CSV adversarial suite | CSV unit tests | Parser abuse cases pass safely | Complete |
| T-538 | Numeric abuse | values tests | Decimal/micros bounds fail closed | Complete |
| T-539 | Storage hardening | persistence tests | Corruption and fallback covered | Complete |
| T-540 | Client isolation | memory integration/E2E | No cross-client state leakage | Complete |
| T-541 | Report security | report tests/docs | Safe, current, client-scoped export | Complete |
| T-542 | Data inventory | `THREAT_MODEL.md` | Processing and retention truthful | Complete |
| T-543 | Logging/privacy audit | `THREAT_MODEL.md` | Only safe operational fields permitted | Complete |
| T-544 | Environment validation | `lib/env/server.ts` | Minimal server config validated | Complete |
| T-545 | Runtime contract | package, `.nvmrc`, README | Node/npm agreement | Complete |
| T-546 | Production access decision | ADR-010, Vercel doc | Deployment gate selected | Complete |
| T-547 | Authentication decision | ADR-010 | App accounts explicitly deferred | Complete |
| T-548 | Beta limits | `PRIVATE_BETA.md` | Practical bounded limits stated | Complete |
| T-549 | Rate/abuse decision | threat model, ADR-010 | Public-launch blocker documented | Complete |
| T-550 | Error taxonomy | threat model, UI/tests | Safe actionable states reviewed | Complete |
| T-551 | Recovery | runbook, persistence tests | Recovery paths documented/tested | Complete |
| T-552 | Browser contract | beta contract, QA matrix | Supported behavior documented | Complete |
| T-553 | Cross-browser E2E | Playwright config/E2E | Chromium, WebKit, Firefox smoke | Complete |
| T-554 | Accessibility audit | product UX/E2E | Material baseline reviewed | Complete |
| T-555 | Accessibility regressions | E2E | Stable semantic assertions retained | Complete |
| T-556 | Performance baseline | `PERFORMANCE_BASELINE.md` | Synthetic local measure recorded | Complete |
| T-557 | Performance budgets | `PERFORMANCE_BASELINE.md` | V1 budgets documented | Complete |
| T-558 | Workspace stress | release stress test | Max-source bound completes | Complete |
| T-559 | Frontend performance | performance baseline | No material issue found | Complete |
| T-560 | Observability | `OBSERVABILITY.md` | Safe minimal contract defined | Complete |
| T-561 | Health endpoint | route/unit/E2E | Cheap, non-sensitive response | Complete |
| T-562 | Beta diagnostics | runbook | Safe reproduction details specified | Complete |
| T-563 | Beta matrix | `PRIVATE_BETA_MATRIX.md` | Scenarios/expected results listed | Complete |
| T-564 | Exploratory QA | QA matrix | Manual beta pass still required | Pending |
| T-565 | Visual review | E2E responsive checks | Manual visual pass still required | Pending |
| T-566 | Terminology audit | product/report UX | Existing product vocabulary consistent | Complete |
| T-567 | Determinism | existing unit/integration suites | Deterministic pipeline protected | Complete |
| T-568 | Reproducibility | workspace/report pipeline tests | Canonical synthetic regression passes | Complete |
| T-569 | Architecture invariants | tests, docs | Semantics/persistence boundaries protected | Complete |
| T-570 | Repository hygiene | source/docs search | No material stale path found | Complete |
| T-571 | Dependency audit | npm audit/outdated | Audit observed; no auto-upgrade | Complete |
| T-572 | Deployment config | config/deployment docs | Runtime/build assumptions reviewed | Complete |
| T-573 | Vercel contract | `docs/deployment/VERCEL.md` | Protection/rollback documented | Complete |
| T-574 | Beta rollback | runbook/Vercel doc | Known-good and local-state recovery defined | Complete |
| T-575 | Known issues | `KNOWN_ISSUES.md` | Genuine limits disclosed | Complete |
| T-576 | Beta runbook | `BETA_RUNBOOK.md` | Executable preflight/support/rollback | Complete |
| T-577 | Severity model | release gate | P0–P3 definitions recorded | Complete |
| T-578 | Release gate | release gate | Explicit beta criteria recorded | Complete |
| T-579 | Independent review | review skills | Security/data/PR reviews complete | Complete |
| T-580 | Full verification | repo scripts | Canonical ladder observed green | Complete |
| T-581 | RC checkpoint | release gate | Requires all gates | Pending |
| T-582 | Sprint 18 handoff | release gate | Handoff only after RC | Pending |
