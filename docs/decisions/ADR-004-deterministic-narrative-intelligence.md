# ADR-004: Deterministic Narrative Intelligence

## Status

Accepted for Sprint 15.

## Decision

Relay V1 uses deterministic Narrative Intelligence after Change Intelligence and before dashboard/report presentation. It consumes only bounded structured facts, preserves their evidence lineage, and renders a stable report-ready package. It does not require a generative model or external service.

## Consequences

Identical facts create identical commentary and stable narrative IDs. There are no model credentials, prompts, token accounting, provider abstractions, retries, public generation endpoints, or model-output trust boundary. Narrative cannot alter KPI values, Data Health, targets, or revenue semantics. A future product may consider an optional separate enhancement only through a new ADR; it must not change this V1 architecture.
