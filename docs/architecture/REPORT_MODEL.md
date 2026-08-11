# Structured report model

## Purpose

The structured report model is the boundary between validated analysis and rendering. It is a conceptual object, not a TypeScript interface or PDF implementation. The renderer consumes this model to create a PDF; it does not recalculate metrics or infer facts.

## Required sections

| Section | Contents | Source of truth |
| --- | --- | --- |
| Report metadata | Client reference, report version/status, generation time, methodology version | Report and configuration snapshot |
| Reporting period | Current and comparison periods, timezones, currency coverage | Reporting-period and Data Health facts |
| Data Health | Missing sources, mapping ambiguity, date/currency coverage, warnings/errors | Validation and reconciliation findings |
| KPI scorecard | Labeled KPI values, changes, targets, availability/caveats | Deterministic analytics facts |
| Channel performance | Source-specific paid-media performance and commerce context | Canonical/analytics facts |
| Movers and risks | Deterministically detected positive/negative drivers and efficiency risks | Change-intelligence facts |
| Insights | Draft commentary, fact references, review state | LLM output plus human review |
| Recommendations | Data-supported recommendation and separately labeled client context | Structured facts and human context |
| Reconciliation notes | Commerce versus paid-attribution differences and coverage caveats | Reconciliation facts |
| Methodology | KPI/revenue basis, source coverage, attribution limitations | Rule/configuration snapshot |

## Composition rules

- Every quantitative display references a structured fact and its provenance.
- Commerce revenue, paid-platform attributed revenue, and their permitted KPIs remain labeled according to [ADR-001](../decisions/ADR-001-revenue-semantics.md).
- Commentary is optional and retains its review state. A reviewer can edit or remove it without changing source data or metrics.
- The report model records configuration/rule and methodology snapshots so historical reports remain interpretable after settings change.
- PDF is the only V1 renderer. Web/share URL, PPTX, and Google Slides are future renderers and must consume the same report model if added.

## Boundary ownership

Analytics produces structured facts. The report composer assembles the report model. The renderer turns the model into presentation. No layer accepts arbitrary AI-generated HTML as the report source of truth.
