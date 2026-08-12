---
name: change-intelligence-review
description: Review Relay Change Intelligence rule or contract changes for metric-polarity mistakes, unsupported causal or significance claims, revenue/attribution conflation, malformed target handling, duplicate observations, deterministic priority, and evidence-lineage loss. Use for a focused read-only review whenever `lib/change-intelligence/`, its contract, targets, or its regression fixtures change.
---

# Change Intelligence review

## Goal

Identify deterministic interpretation regressions without expanding the implementation scope.

## Read only

Read in this order:

1. The task and changed-file list.
2. `docs/data/KPI_DEFINITIONS.md` headings governing affected metrics.
3. `docs/data/CHANGE_INTELLIGENCE.md` headings governing the affected rule.
4. The affected rule/target file.
5. The focused tests and expected fixture for that rule.

Do not recursively read `docs/`, raw fixtures, unrelated KPI implementation, UI styling, or provider normalizers unless direct evidence requires it.

## Review procedure

1. Verify mathematical direction remains separate from business assessment.
2. Compare each metric assessment with the explicit polarity table; treat context-dependent metrics as context unless a documented cross-metric rule applies.
3. Verify magnitude bands use comparable percentage changes only, label rule-based magnitude rather than statistical significance, and preserve null/previous-zero behavior.
4. Reject causal, recommendation, prediction, confidence, or AI language not supported by the structured rule.
5. Verify Shopify commerce revenue remains the only report-level revenue/MER/AOV basis and Meta/Google attributed revenue remains source-specific ROAS evidence.
6. Verify contribution is limited to mathematically additive measures and handles zero/unavailable totals.
7. Verify targets are explicit, transient, bounded, unit/currency/scope compatible, and dispatched through fixed operators rather than evaluated code.
8. Check stable IDs, deduplication, deterministic priority/limits, and whether aggregate versus metric observations communicate distinct facts.
9. Trace every observation to exact KPI/target evidence without raw rows, filenames, customer data, or browser-invented interpretation.
10. Require a focused semantic regression and unhappy-path test for each changed rule.

## Output

Return only prioritized findings:

- `P0`/`P1`: semantic, integrity, raw-data, gate, arbitrary-operator, or revenue-boundary defect that blocks the change.
- `P2`/`P3`: clear evidence, affected file, and a bounded recommendation.
- If none: state `No findings` and list residual assumptions/questions.

Do not modify files or claim tests passed without observed output.
