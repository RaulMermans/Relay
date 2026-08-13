# Relay data flow

```text
External source
  -> Ingestion
  -> Raw representation
  -> Normalization
  -> Canonical data
  -> Data Health
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
| Canonical data -> Data Health | Canonical observations plus transient reporting context | Data Health findings, source coverage, readiness status, and eligible canonical facts | Date coverage/alignment, expected sources, currency, mapping, provenance, and duplicate candidates | Blocking errors prevent analytics; warnings remain reviewable without changing observations |
| Data Health -> Reconciliation | Non-mutated canonical observations plus health context | Compatibility/comparison findings | Commerce versus attribution distinction, source coverage, currency compatibility | Warn/block only according to explicit incompatibility; do not fabricate attribution or combined revenue |
| Reconciliation -> Metrics | Compatible validated canonical data | Deterministic KPIs and period comparisons | Formula inputs, denominator/availability, revenue-basis rules | Mark KPI unavailable with reason rather than calculate from invalid inputs |
| Metrics -> Change intelligence | KPIs/comparisons | Movers, risks, explanatory facts | Deterministic thresholds/rules and fact provenance | Omit unsupported conclusion; retain source finding |
| Change intelligence -> Report facts | Analytics facts, health, reconciliation, targets | Renderer-neutral structured facts | Fact completeness, target evidence, provenance references | Report incomplete state; no invented commentary |
| Report facts -> AI commentary | Approved facts and explicit context | Editable draft commentary with fact references | Grounding and quantitative claim traceability | Continue without commentary if unavailable/invalid |
| AI commentary -> Human review | Draft text and facts | Accepted, edited, or removed commentary | Reviewer confirms client-facing suitability | Exclude unreviewed/rejected narrative |
| Human review -> Report model | Reviewed commentary plus facts/findings | Structured report model snapshot | Required sections, methodology, reviewed state | Preserve model error/status; do not mutate facts |
| Report model -> Renderer | Structured report model | PDF and render status | Renderer input completeness and layout/render health | Preserve model, record failure, allow retry |

CSV and connector paths differ only before the raw-representation/normalization boundary. Analytics and report generation operate only on canonical data and structured facts.

## Sprint 09 generic connector boundary

Sprint 09 implements the provider-neutral connector contract without a live provider:

```text
request/test-scoped connection
  -> deterministic lifecycle/readiness
  -> discovered account + server-validated selection
  -> bounded daily fetch intent
  -> provider-owned page fetch callback
  -> pagination/retry/error guards
  -> provider-specific raw result
  -> provider normalizer
  -> existing canonical observation union
```

At the Sprint 09 baseline, the static registry marked Shopify, Meta Ads, and Google Ads as framework-known but `not_built` and unconfigured. A synthetic test-only advertising connector proved discovery, selection, pagination, safe failure, API provenance, provider normalization, and canonical equivalence against the existing Meta CSV fixture without network access or a production UI surface.

CSV and API provenance are different discriminated shapes. Data Health validates the relevant locator fields; the KPI Engine and Change Intelligence continue consuming canonical observations without transport branches. Connections and opaque mock credential references are request/test scoped. No OAuth, provider SDK, database, durable token persistence, provider network call, or new service exists.

## Sprint 10 Shopify adapter boundary

Sprint 10 implements the first provider-specific transport without activating a live connection:

```text
request-scoped server Shopify credential
  -> GraphQL Admin API 2026-07 shop identity
  -> validated single installed store
  -> store-local inclusive date range translated to UTC query bounds
  -> bounded cursor-paginated order fetch
  -> validated one-node-per-order records
  -> Shopify API normalizer
  -> existing canonical commerce observations
  -> unchanged Data Health -> KPI -> Change Intelligence
```

Only the provider module can see GraphQL response shapes. It requests no customer PII or line items, exposes no mutations, and uses Shopify original order total as the existing gross-commerce semantic. Synthetic tests inject `fetch`; production runtime wiring remains absent. The static registry says `implemented` but unconfigured, and the UI shows live connection unavailable. Shopify CSV remains fully supported. Live authorization, routes, environment configuration, callbacks, webhooks, and durable tokens are deferred until secure ownership-aware persistence exists.

## Sprint 11 Meta Ads adapter boundary

Sprint 11 adds the read-only paid-media provider transport without activating a live connection:

```text
request-scoped server Meta credential
  -> Marketing API v26.0 /me/adaccounts discovery
  -> validated act_{account_id} selection with currency/timezone metadata
  -> synchronous ad-level Insights with inclusive range + daily increment
  -> bounded Graph-cursor pages and request-scoped retry
  -> exact purchase actions/action_values extraction
  -> Meta API normalizer
  -> existing canonical advertising observations
  -> unchanged Data Health -> KPI -> Change Intelligence
```

Only the provider module sees Meta response/action structures. It requests no demographic, placement, device, audience, creative, or derived-KPI fields and exposes no mutations. Synthetic tests inject `fetch` and delay; production runtime wiring remains absent. The registry says `implemented` but unconfigured, the UI shows live connection unavailable, and Meta CSV remains fully supported. Live OAuth, routes, environment configuration, reviewed access, and durable tokens remain deferred until secure ownership-aware persistence exists.

## Sprint 05 implemented CSV boundary

The current CSV flow is deliberately staged and transient:

```text
CSV upload
  -> server validation + csv-parse
  -> deterministic source detection
  -> deterministic mapping proposal returned to browser
  -> user confirms only provider-valid mapping overrides
  -> browser re-uploads the same selected file to normalization
  -> server revalidates, reparses, redetects, validates overrides, and normalizes
  -> compact summary returned; canonical observations remain request-local
```

The second upload is intentional: raw rows never move to client-visible intake output and are never retained on the server between mapping review and normalization. Provider normalizers receive parsed rows plus an approved mapping and return only canonical advertising/commerce observations, provenance, and structured findings. The UI receives a count, date range, currencies, mapped/ignored-field summary, and warnings, never the normalized dataset or raw CSV rows.

## Sprint 06 implemented Data Health boundary

The current single-file endpoint now runs a deterministic, server-authoritative Data Health pass immediately after normalization:

```text
CSV upload
  -> server validation + parsing + source detection + mapping + normalization
  -> request-scoped Data Health and reconciliation
  -> compact normalization plus Data Health result returned to the browser
```

Canonical observations remain request-local and never appear in the response. The browser receives only a health status, safe source-coverage metadata, and safe findings. A one-file request derives its current reporting period from canonical coverage and expects the one detected source. Unit and integration tests cover multi-source Data Health/reconciliation; Sprint 06 deliberately does not introduce a multi-file reporting workflow.

Data Health detects date coverage and alignment, expected source completeness, currency incompatibility, mapping/provenance gaps, duplicate evidence, and revenue semantic compatibility. It never fills missing days with zeroes, deletes duplicates, performs FX conversion, aggregates revenue, calculates KPIs, persists state, connects providers, or invokes AI. `blocked` prevents future KPI use; `review_required` needs local acknowledgement in the current UI before it displays readiness.

## Sprint 07 implemented KPI boundary

The existing normalization Route Handler now continues server-side through the deterministic KPI engine:

```text
CSV upload
  -> validation + parsing + source detection + mapping + normalization
  -> Data Health + reconciliation
  -> blocked: stable KPI refusal
  -> healthy/review_required: period-filtered deterministic KPI facts
  -> compact Data Health + KPI response
```

Canonical observations stay request-local. The browser receives auditable metric facts, input metadata, formulas, periods, source breakdowns, and deltas, but never canonical rows or raw CSV content. The server is authoritative for period filtering and calculation; the UI only presents the result.

V1 report-level commerce revenue, MER, and AOV use Shopify gross revenue. Meta/Google attributed revenue is exposed only inside the corresponding provider breakdown for ROAS. Fixed-decimal calculations use bounded `BigInt` arithmetic and 12-place half-up division. Missing inputs and zero denominators produce unavailable/null facts. Sprint 07 adds no interpretation, anomaly detection, recommendation, AI, persistence, connector, dashboard, report, or PDF behavior.

## Sprint 08 implemented Change Intelligence boundary

The authoritative normalization Route Handler now continues through a pure deterministic interpretation layer:

```text
CSV -> normalization -> Data Health -> KPI Engine -> Change Intelligence
```

`blocked` Data Health produces blocked KPI and Change Intelligence results with no rule execution. `healthy` and `review_required` may produce structured metric movement, mover, efficiency, source-spend contribution, explicit-target, and rule-based signal facts. The engine receives only KPI results, resolved period/status, and validated transient targets. Canonical/raw rows never enter the engine or browser response.

Direction remains mathematical and separate from assessment. Shopify gross revenue remains the commerce-revenue/MER basis; provider attributed revenue remains source-specific evidence. Contribution is limited to additive spend. Targets use explicit bounded operators and are never persisted. The browser supplies optional current-period dates and MER/CPA targets, then renders server-owned observation fields as compact deterministic labels. Sprint 08 adds no causation, recommendations, AI, statistics, database, connector, report, or PDF behavior.

## Persistence posture

Sprint 03 keeps request processing transient and does not connect a database. When a real feature needs state, the boundary is `UI / Server Logic -> Persistence Boundary -> Demo/local implementation OR future durable database`. Server memory is not durable persistence, and no generic repository abstraction is created before that feature exists.
