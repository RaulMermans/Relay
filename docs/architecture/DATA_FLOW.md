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
  -> Deterministic Narrative Intelligence
  -> Dashboard/report commentary
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
| Change Intelligence -> Narrative Intelligence | Health, KPIs, observations, targets, source metadata, freshness | Stable headline, summary, items, and evidence references | Rule eligibility, evidence lineage, stable IDs, source semantics | Omit unsupported narrative; blocked health suppresses performance summary |
| Narrative Intelligence -> Report model | Deterministic narrative package plus facts/findings | Structured report model snapshot | Required sections and methodology; no fact mutation | Preserve deterministic package; future human override remains separate |
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

## Sprint 12 Google Ads adapter boundary

Sprint 12 adds the second paid-media provider transport without activating a live connection:

```text
request-scoped server OAuth + developer credentials
  -> v25 ListAccessibleCustomers direct roots
  -> customer/customer_client manager hierarchy
  -> validated serving reporting customer + provider-owned login context
  -> daily ad-group GAQL Search with inclusive range
  -> bounded fixed 10,000-row page-token collection and retry
  -> cost-micros + conversions/conversions-value normalization
  -> existing canonical advertising observations
  -> unchanged Data Health -> KPI -> Change Intelligence
```

Only the provider module sees Google customer, hierarchy, error, page-token, and report shapes. It requests no keyword, search-term, audience, user, device, placement, creative, or derived-KPI fields and exposes no mutation. Manager context is derived server-side and never accepted from browser input. Synthetic tests inject `fetch` and delay; production runtime wiring remains absent. The registry says `implemented` but unconfigured, the UI shows live connection unavailable, and Google CSV remains fully supported. Live OAuth, routes, environment configuration, approved developer-token access, and durable refresh-token/ownership state remain deferred.

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

Data Health detects date coverage and alignment, expected source completeness, currency incompatibility, mapping/provenance gaps, duplicate evidence, and revenue semantic compatibility. It never fills missing days with zeroes, deletes duplicates, performs FX conversion, aggregates revenue, calculates KPIs, persists state, or connects providers. `blocked` prevents future KPI use; `review_required` needs local acknowledgement in the current UI before it displays readiness.

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

V1 report-level commerce revenue, MER, and AOV use Shopify gross revenue. Meta/Google attributed revenue is exposed only inside the corresponding provider breakdown for ROAS. Fixed-decimal calculations use bounded `BigInt` arithmetic and 12-place half-up division. Missing inputs and zero denominators produce unavailable/null facts. Sprint 07 adds no interpretation, anomaly detection, recommendation, persistence, connector, dashboard, report, or PDF behavior.

## Sprint 08 implemented Change Intelligence boundary

The authoritative normalization Route Handler now continues through a pure deterministic interpretation layer:

```text
CSV -> normalization -> Data Health -> KPI Engine -> Change Intelligence
```

`blocked` Data Health produces blocked KPI and Change Intelligence results with no rule execution. `healthy` and `review_required` may produce structured metric movement, mover, efficiency, source-spend contribution, explicit-target, and rule-based signal facts. The engine receives only KPI results, resolved period/status, and validated transient targets. Canonical/raw rows never enter the engine or browser response.

Direction remains mathematical and separate from assessment. Shopify gross revenue remains the commerce-revenue/MER basis; provider attributed revenue remains source-specific evidence. Contribution is limited to additive spend. Targets use explicit bounded operators and are never persisted. The browser supplies optional current-period dates and MER/CPA targets, then renders server-owned observation fields as compact deterministic labels. Sprint 08 adds no causation, recommendations, statistics, database, connector, report, or PDF behavior.

## Sprint 13 multi-source workspace boundary

```text
browser session workspace
  -> reporting period + expected sources + transient targets
  -> at most one CSV per Meta Ads / Google Ads / Shopify slot
  -> POST /api/workspace/analyze
  -> per-file validation + parsing + detection + mapping + normalization
  -> mapping exception response, or combined request-local canonical observations
  -> one Data Health -> KPI -> Change Intelligence execution
  -> compact source summaries + structured results + daily trend facts
  -> dashboard presentation
```

The server revalidates every file and validates that its detected provider matches the selected source slot. A mapping exception stops partial analytics and returns only headers/candidates required for correction. Ready files combine only in request memory. Raw rows and canonical observations never cross the response boundary.

The trend sums only canonical advertising `spend` across Meta/Google and Shopify `grossRevenue` by day inside the resolved current period. It never includes provider `attributedRevenue` in commerce revenue. Source summaries reflect Data Health blocking state, date coverage, currency, and observation count.

## Sprint 14 browser-local product-memory boundary

```text
explicitly created client
  -> versioned RelayMemoryStore
  -> validated LocalBrowserMemory document
  -> restore configuration + latest compact dashboard snapshot
  -> new transient CSV analysis
  -> safely reuse compatible exact-header mappings
  -> replace latest snapshot + append bounded cycle summary
```

The document stores client identity, source expectations, provider/header mapping decisions, existing-contract targets, fixed source-of-truth rules, bounded notes, report preferences, one authoritative structured dashboard snapshot, up to 52 cycle summaries, and safe local workflow counters. It is capped and validated on load/save; corrupt or unsupported data returns to explicit recovery.

Selected `File` objects remain React-session-only. Raw CSV text, filenames, parsed rows, canonical observation arrays, provider payloads, credentials, authorization headers, tokens, final reports, and PDFs never enter product memory. Exact-header saved mappings are rechecked against current provider candidates and occupied targets; incompatibility returns to mapping review. The server still owns normalization and analytics and receives saved mappings only as untrusted bounded request input.

## Persistence posture

Relay has no database. Sprint 14 implements `Product UI -> RelayMemoryStore -> LocalBrowserMemory` for small non-sensitive return-workflow state only. Analysis processing remains transient on the server. Future authenticated cloud ownership requires a separate server/API boundary and Postgres-compatible implementation; browser IDs/state are not automatically trusted or uploaded.

## Sprint 16 report flow

`validated analysis snapshot -> ReportDocument -> report preview -> explicit browser print` is the report flow. The report composer formats and selects the snapshot’s existing KPI, Data Health, Change Intelligence, freshness, and deterministic Narrative Intelligence facts; it does not accept raw source data or run analytics again. A snapshot mismatch disables export, and blocked Data Health has no normal performance-report output.
