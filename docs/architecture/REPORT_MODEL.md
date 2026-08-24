# Structured report model

## Purpose

The structured report model is the boundary between validated analysis and rendering. It is implemented as a renderer-neutral TypeScript `ReportDocument`, not a PDF implementation. The preview/print renderer consumes this model; it does not recalculate metrics or infer facts.

## Required sections

| Section | Contents | Source of truth |
| --- | --- | --- |
| Report metadata | Client reference, report version/status, generation time, methodology version | Report and configuration snapshot |
| Reporting period | Current and comparison periods, timezones, currency coverage | Reporting-period and Data Health facts |
| Data Health | Missing sources, mapping ambiguity, date/currency coverage, warnings/errors | Validation and reconciliation findings |
| KPI scorecard | Labeled KPI values, changes, targets, availability/caveats | Deterministic analytics facts |
| Channel performance | Source-specific paid-media performance and commerce context | Canonical/analytics facts |
| Movers and risks | Deterministically detected positive/negative drivers and efficiency risks | Change-intelligence facts |
| Narrative | Deterministic narrative package and evidence references | Existing deterministic Narrative Intelligence package only |
| Reconciliation notes | Commerce versus paid-attribution differences and coverage caveats | Reconciliation facts |
| Methodology | KPI/revenue basis, source coverage, attribution limitations | Rule/configuration snapshot |

## Composition rules

- Every quantitative display references a structured fact and its provenance.
- Commerce revenue, paid-platform attributed revenue, and their permitted KPIs remain labeled according to [ADR-001](../decisions/ADR-001-revenue-semantics.md).
- Commentary is the existing deterministic Narrative Intelligence package. Human overrides are not part of V1 report composition.
- The report model carries the currently selected reporting preferences and methodology so the visible report is interpretable without internal Relay context. It is not persisted as historical report content.
- Browser print from the report preview is the V1 PDF path. Web/share URL, PPTX, and Google Slides are future renderers and must consume the same report model if added.

## Boundary ownership

Analytics produces structured facts. Narrative Intelligence assembles evidence-backed commentary. The report composer assembles the report model. The preview and browser print stylesheet turn the model into presentation. No layer accepts arbitrary generated HTML as the report source of truth.
