# ADR-004: AI after deterministic analysis

## Status

Accepted for V1 architecture.

## Context

Relay may use an LLM to make verified reporting facts readable, but product invariants require deterministic KPI calculations, fact traceability, and human review before client-facing use.

## Options considered

### Option A: LLM reads raw data and calculates/report facts

Flexible in appearance, but cannot provide authoritative, reproducible calculations or adequate control over unavailable, overlapping, and reconciled data.

### Option B: Deterministic analysis produces structured facts before LLM narration

The LLM receives only approved facts, caveats, targets, and explicit client context. It returns editable draft commentary linked to those facts.

## Decision

Adopt Option B.

```text
Raw data -> Normalization -> Metrics -> Change intelligence -> Structured facts
         -> LLM -> Draft commentary -> Human review
```

- Allowed LLM inputs: computed KPI values/changes, detected movers, explicit targets, reconciliation notes, report methodology, and client-provided context.
- Avoid unrestricted raw datasets and responsibility for authoritative calculations.
- Treat LLM output as suggestions for summaries, explanations, and recommendation language.
- Every factual quantitative statement must trace to supplied structured facts.
- Client-facing commentary remains editable/removable through human review.

## Consequences

The LLM cannot repair missing data or invent a KPI. The report model stores fact references and review state with commentary. Prompt/version evaluation becomes part of report-quality testing, but deterministic analytics remains independently testable.

## Revisit triggers

Revisit only when a bounded, privacy-reviewed raw-data use case demonstrates value that structured facts cannot provide, with evidence that it preserves traceability and does not delegate authority to the model.

## Validation path

Use fixture-based structured facts to verify quantitative claim references, review/edit/remove behavior, unavailable-LLM handling, and rejection of unsupported claims before client-facing rendering.
