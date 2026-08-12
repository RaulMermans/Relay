# Sprint 08 - Deterministic Change Intelligence

| Task | Outcome | Relevant files/docs | Acceptance criteria | Status |
| --- | --- | --- | --- | --- |
| T-156 Execution Contract | Gate structured KPI interpretation with Data Health. | `docs/data/CHANGE_INTELLIGENCE.md`, `lib/change-intelligence/types.ts` | Blocked returns stable refusal; healthy/review-required may execute; no raw rows enter the engine. | Complete |
| T-157 Observation Model | Expose structured, auditable observations. | Change Intelligence contract and types | Direction, assessment, significance, evidence, scope, source, and optional target are explicit. | Complete |
| T-158 Metric Polarity | Define one explicit interpretation source. | Change Intelligence contract and rules | Higher/lower/context-dependent metrics and caveats are documented and tested. | Complete |
| T-159 Significance Rules | Define transparent V1 change-magnitude thresholds. | Change Intelligence contract and rules | Minor/notable/major behavior covers unavailable percentage, zero baseline, and null values. | Complete |
| T-160 Change Classification | Classify every comparable KPI fact. | `lib/change-intelligence/`, unit tests | Increase/decrease/unchanged/unavailable remain separate from business assessment. | Complete |
| T-161 Movers | Rank meaningful positive and negative movers. | Engine and unit tests | Top three use comparable percentage magnitude; undefined percentages are not falsely ranked. | Complete |
| T-162 Spend/Revenue Divergence | Detect deterministic commerce-efficiency divergence. | Efficiency rules and tests | Spend/revenue change and MER evidence produce non-causal improvement/deterioration observations. | Complete |
| T-163 CPA Rules | Detect CPA improvement and deterioration. | Metric/efficiency rules and tests | Available report/source CPA movements respect polarity and comparison availability. | Complete |
| T-164 ROAS Rules | Detect provider-specific ROAS movement. | Metric/source rules and tests | Meta and Google remain separate; no combined attributed ROAS exists. | Complete |
| T-165 MER Rules | Detect MER improvement, deterioration, and stability. | Metric/efficiency rules and tests | MER retains commerce-revenue/compatible-spend semantics. | Complete |
| T-166 Revenue/Order Rules | Detect meaningful commerce movement. | Metric rules and tests | Commerce revenue and orders produce structured non-causal observations. | Complete |
| T-167 Source Performance | Detect source-level efficiency facts. | Source rules and tests | Meta/Google observations cite exact spend/ROAS/CPA facts without campaign causes. | Complete |
| T-168 Contribution | Attribute additive spend movement by source. | Contribution rules and tests | Contribution uses fixed-decimal source deltas only; ratios are excluded; zero total is safe. | Complete |
| T-169 Target Model | Accept transient explicit targets. | Types, target parser/evaluator, UI | Only supported metrics/scopes/operators/units are accepted; Relay invents no targets. | Complete |
| T-170 Target Breaches | Evaluate explicit target facts. | Target rules and tests | Breaches are emitted; met/unavailable/incompatible targets do not create false breaches. | Complete |
| T-171 Rule-Based Signals | Surface small explainable cross-metric signals. | Signal rules and tests | Supported conjunctions are deterministic, structured, and make no statistical or causal claim. | Complete |
| T-172 Deduplication | Prevent overlapping rule floods. | Engine prioritization and tests | Stable IDs and precedence remove exact/semantically redundant observations. | Complete |
| T-173 Prioritization | Order observations deterministically. | Engine and contract | Target breaches and major movements precede lower-value context; output limit is documented. | Complete |
| T-174 Evidence Lineage | Preserve KPI and target evidence. | Types, rules, fixtures | Every observation explains itself from structured facts without raw CSV rereads. | Complete |
| T-175 Intelligence Engine | Deliver a focused pure engine. | `lib/change-intelligence/` | Provider-independent orchestration has no browser, database, AI, or new dependency. | Complete |
| T-176 Server Integration | Extend the authoritative normalization pipeline. | `app/api/normalize/csv/route.ts`, integration tests | Data Health -> KPI -> Change Intelligence gate runs server-side and returns only structured facts. | Complete |
| T-177 What Changed UI | Present compact deterministic observations. | `app/intake-form.tsx`, `app/globals.css`, E2E | A minimal What Changed section follows KPIs and does not manufacture interpretation. | Complete |
| T-178 Target UI | Supply minimal transient MER/CPA targets. | Intake UI and Route Handler | Current-request targets are optional, bounded, validated, and never persisted. | Complete |
| T-179 Goldens | Add manually reviewable intelligence fixtures. | `fixtures/expected/change-intelligence/` | Required growth, efficiency, source, target, zero/null, and revenue-semantic cases exist. | Complete |
| T-180 Unit Tests | Cover deterministic rules and boundaries. | `tests/unit/change-intelligence*.test.ts` | Classification, movers, rules, contribution, targets, dedupe, priority, evidence, and gate pass. | Complete |
| T-181 Integration Tests | Cover raw pipeline through observations. | `tests/integration/change-intelligence-pipeline.test.ts` | Healthy, deterioration, target, review, blocked, and revenue-semantic cases pass. | Complete |
| T-182 E2E | Verify the What Changed upload flow. | `tests/e2e/intake.spec.ts` | Supported CSV reaches at least one deterministic observation in the UI. | Complete |
| T-183 Review Skill | Add a scoped semantic review workflow. | `.agents/skills/change-intelligence-review/SKILL.md` | Review scope covers polarity, causation, significance, revenue, targets, duplicates, and lineage. | Complete |
| T-184 Security/Data Integrity | Review trust and semantic boundaries. | Security/data contracts, implementation, focused reviews | No P0/P1 target, division, leakage, gate, authority, or revenue issue remains. | Complete |
| T-185 Documentation | Align implemented capability and deferrals. | Change contract, data flow, QA docs, README, changelog | Documentation claims only deterministic structured behavior that exists. | Complete |
| T-186 Verification | Run the full required ladder. | Repository commands and focused semantic checks | Install, lint, typecheck, tests, build, E2E, diff, gates, semantics, and exclusions are observed. | Complete |
| T-187 Sprint 09 Handoff | Prepare only the connector-framework boundary. | `SCRATCHPAD.md`, roadmap context | Exact next task states transport/account/lifecycle/error/equivalence contracts without connector implementation. | Complete |
