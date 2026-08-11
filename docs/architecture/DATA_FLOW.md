# Relay data flow

```text
External source
  -> Ingestion
  -> Raw representation
  -> Normalization
  -> Canonical data
  -> Validation
  -> Reconciliation
  -> Metrics
  -> Change intelligence
  -> Report facts
  -> AI commentary
  -> Human review
  -> Report model
  -> Renderer
```

| Boundary | Input | Output | Validation responsibility | Failure behavior |
| --- | --- | --- | --- | --- |
| External source -> Ingestion | CSV file or provider response/session | Ingestion request and source context | Trust boundary, file/session/account eligibility | Reject/record structured, redacted intake error |
| Ingestion -> Raw representation | Validated upload or fetch result | Transport-specific raw dataset/result plus provenance | File shape, provider/source detection, pagination/retry outcome | Mark ingestion failed/partial; never infer missing values |
| Raw representation -> Normalization | Provider-shaped raw input and mapping | Daily canonical observations, provenance, findings | Required field/type mapping, availability, source identifiers, currency | Emit mapping/normalization findings; request confirmation where ambiguous |
| Normalization -> Canonical data | Normalized observations | Persistable canonical advertising/commerce data | Daily grain, null versus zero, money/currency, identity, dedupe candidates | Block unsupported aggregate or incompatible data from analytics |
| Canonical data -> Validation | Canonical observations | Data Health findings and eligible data set | Coverage, date alignment, duplicate candidates, required report inputs | Errors block affected analysis; warnings retain caveat |
| Validation -> Reconciliation | Eligible observations and findings | Compatibility/comparison notes | Commerce versus attribution distinction, source coverage, currency compatibility | Warn/block only according to explicit incompatibility; do not fabricate attribution |
| Reconciliation -> Metrics | Compatible validated canonical data | Deterministic KPIs and period comparisons | Formula inputs, denominator/availability, revenue-basis rules | Mark KPI unavailable with reason rather than calculate from invalid inputs |
| Metrics -> Change intelligence | KPIs/comparisons | Movers, risks, explanatory facts | Deterministic thresholds/rules and fact provenance | Omit unsupported conclusion; retain source finding |
| Change intelligence -> Report facts | Analytics facts, health, reconciliation, targets | Renderer-neutral structured facts | Fact completeness, target evidence, provenance references | Report incomplete state; no invented commentary |
| Report facts -> AI commentary | Approved facts and explicit context | Editable draft commentary with fact references | Grounding and quantitative claim traceability | Continue without commentary if unavailable/invalid |
| AI commentary -> Human review | Draft text and facts | Accepted, edited, or removed commentary | Reviewer confirms client-facing suitability | Exclude unreviewed/rejected narrative |
| Human review -> Report model | Reviewed commentary plus facts/findings | Structured report model snapshot | Required sections, methodology, reviewed state | Preserve model error/status; do not mutate facts |
| Report model -> Renderer | Structured report model | PDF and render status | Renderer input completeness and layout/render health | Preserve model, record failure, allow retry |

CSV and connector paths differ only before the raw-representation/normalization boundary. Analytics and report generation operate only on canonical data and structured facts.

## Persistence posture

Sprint 03 keeps request processing transient and does not connect a database. When a real feature needs state, the boundary is `UI / Server Logic -> Persistence Boundary -> Demo/local implementation OR future durable database`. Server memory is not durable persistence, and no generic repository abstraction is created before that feature exists.
