# Sprint 15 - Deterministic Narrative Intelligence + Report Preparation

| Task | Outcome | Relevant files/docs | Acceptance criteria | Status |
| --- | --- | --- | --- | --- |
| T-431 Pivot contract | Replace the abandoned AI roadmap with this deterministic sprint. | `plan.md`, roadmap | No generative-AI work is represented as active/deferred. | Complete |
| T-432 Narrative contract | Define bounded facts, evidence, priorities, and exclusions. | `docs/data/NARRATIVE_INTELLIGENCE.md` | Narrative never recalculates or invents authoritative facts. | Complete |
| T-433–438 Pure module | Build deterministic types, rules, templates, priority, IDs, and formatting boundary. | `lib/narrative/` | Identical facts produce identical IDs and text; no dependency added. | Complete |
| T-439–457 Narrative rules | Cover executive, growth/decline, efficiency/tradeoff, channel, target, health, and freshness rules. | `lib/narrative/` | Significant, evidence-backed, non-causal facts only; source revenue semantics remain explicit. | Complete |
| T-458–459 Dashboard | Add immediate Performance Summary with optional evidence inspection. | `app/workspace.tsx`, `app/globals.css` | Headline, concise summary, key developments, and needs-attention render with no request or generation action. | Complete |
| T-460 Report preparation | Expose a structured report-ready narrative package. | `lib/narrative/types.ts` | Sprint 16 can consume headline, summary, highlights, attention, channels, and methodology notes directly. | Complete |
| T-461–464 Editing/persistence | Defer human text overrides until report composition establishes a concrete need. | ADR-007, persistence types | No ungrounded commentary or duplicate narrative history is stored. | Complete |
| T-465 Evidence inspection | Let advanced users trace displayed statements to Relay evidence IDs. | Dashboard | Default dashboard remains uncluttered. | Complete |
| T-466–470 Tests | Add deterministic golden/unit and pipeline regression coverage. | unit/integration tests | Scenarios cover growth, decline, paid-only, target, health, and revenue semantics. | Complete |
| T-471–474 E2E and responsive QA | Verify summary visibility and dashboard presentation. | E2E/CSS | No AI control/loading/provider state; layout remains responsive. | Complete |
| T-475–479 Hygiene/docs/security | Remove generative architecture/docs and record the deterministic replacement. | docs, dependency/scope checks | No active model key/provider/prompt/token architecture; no new dependencies. | Complete |
| T-480 Verification | Run complete repository verification. | repository scripts | Relevant checks pass and diff is clean. | Complete |
| T-481 Handoff | Bound Sprint 16’s deterministic report inputs. | roadmap/SCRATCHPAD | No Sprint 16 implementation begins. | Complete |
