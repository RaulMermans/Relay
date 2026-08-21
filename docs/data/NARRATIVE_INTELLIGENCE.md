# Narrative Intelligence contract

## Purpose and boundary

Narrative Intelligence is Relay’s pure deterministic presentation layer. It turns already-authoritative Data Health, KPI, Change Intelligence, target, source, and freshness facts into concise human-readable commentary for the dashboard and a future report model.

It may describe those facts but may never create, modify, infer, or recalculate authoritative facts. It receives no raw CSV, parsed row, provider payload, or canonical-observation array. It makes no network request and has no model, provider, prompt, token, retry, or API-key boundary.

## Input and output

`NarrativeContext` is bounded to reporting period, Data Health, KPI execution result, Change Intelligence observations and target evaluations, safe source summaries, and freshness. `NarrativeResult` is report-ready:

```ts
type NarrativeResult = {
  status: "ready" | "blocked";
  headline: string;
  summary: string;
  highlights: NarrativeItem[];
  attention: NarrativeItem[];
  channelSummaries: NarrativeItem[];
  methodologyNotes: string[];
};
```

Every item has a stable ID derived from its rule, scope, and sorted evidence references, a type, title, text, priority, and `evidenceRefs`. Evidence references point only to existing Change Intelligence observation IDs, Data Health finding IDs, target observations, or source freshness IDs. A rule does not fire when required evidence is absent.

## Rules, priority, and deduplication

The compact rule families are growth, decline, efficiency, tradeoff, target, health, freshness, and channel. Only notable or major movement is narrated by default; target breaches and blocking/warning health findings remain eligible independently. Priority is deterministic: blocking health, target breach, major outcome decline, major efficiency/tradeoff, growth/channel, freshness, then supporting context.

Story-level deduplication retains one richer statement for an efficiency or cross-metric story. Stable IDs and a rule-specific precedence prevent simultaneous improved and weakened wording for one retained story. At most four highlights, four attention items, and two channel summaries are emitted.

## Semantics, tone, and formatting

Shopify is the only commerce-revenue source. Meta and Google attributed revenue stay provider-specific; Narrative Intelligence never totals or labels combined attribution as revenue. Cross-metric language states co-occurrence only—never causality.

Templates use Relay’s existing presentation formatter for numbers. Tone is analytical, concise, professional, neutral, and client-safe. Statements do not use hype, recommendations, forecasts, statistical confidence, or generative-AI language.

## Data Health and report readiness

Blocked Data Health suppresses normal performance commentary and produces only a clear resolution-oriented headline/summary plus supported health attention. The report-ready package includes deterministic headline, summary, highlights, attention, channel summaries, and a methodology note. Human overrides are deliberately deferred: Sprint 16 must first establish a concrete report-composition need and retain any future edit separately from its generated evidence context.

## Deterministic guarantees and unsupported behavior

The same input produces deeply equal output, including IDs, ordering, and wording. The module is synchronous, bounded, dependency-free TypeScript. It does not perform raw-data analysis, independent calculations, causal inference, recommendations, model calls, prompt processing, editing workflows, report/PDF rendering, or narrative-history persistence.

Sprint 16 retains this package in new compact analysis snapshots. The report composer consumes this existing deterministic result and does not regenerate or rewrite it.
