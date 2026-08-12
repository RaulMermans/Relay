# Change Intelligence contract

## Purpose and boundary

Change Intelligence is Relay's deterministic interpretation layer over trusted Sprint 07 KPI facts. The KPI engine owns mathematical values and deltas; Change Intelligence owns rule-based direction, assessment, change magnitude, explicit-target evaluation, and structured cross-metric signals. It produces no prose narrative, causal attribution, recommendation, prediction, statistical confidence, or AI output.

The pure engine consumes only:

```ts
type ChangeIntelligenceInput = {
  kpiResult: KpiExecutionResult;
  dataHealthStatus: "healthy" | "review_required" | "blocked";
  reportingPeriod: ResolvedReportingPeriod;
  targets?: Target[];
};
```

Canonical observations, parsed CSV rows, raw provider rows, and browser-derived interpretations are outside this boundary. `healthy` and `review_required` may execute. If Data Health or KPI execution is blocked, Change Intelligence returns `DATA_HEALTH_BLOCKED` with empty structured result arrays and runs no rules.

## Observation model

Each observation has a deterministic ID and type; metric and report/source scope; optional provider source; current/previous values and deltas where applicable; mathematical direction; business assessment; rule-based significance; deterministic priority; and complete KPI evidence. Target breaches also retain the supplied target. Cross-metric observations carry multiple evidence entries rather than a manufactured explanation.

Direction is purely mathematical:

- `increased`: current is greater than previous.
- `decreased`: current is less than previous.
- `unchanged`: current equals previous.
- `unavailable`: either comparison value is unavailable.

Assessment is a separate business interpretation:

- `favorable`
- `unfavorable`
- `neutral`
- `context_required`

Significance describes deterministic change magnitude, never statistical significance:

- `minor`: absolute percentage change is below 5%, including no change.
- `notable`: absolute percentage change is at least 5% and at most 15%.
- `major`: absolute percentage change is greater than 15%.
- `unavailable`: percentage change is absent.

When previous is zero, the KPI engine truthfully supplies no percentage change. Change Intelligence retains the mathematical direction and absolute delta when classifying the fact but assigns `unavailable` significance and excludes it from percentage-ranked movers. If either comparison value is null, direction and significance are unavailable and no movement observation is emitted. Relay does not synthesize a percentage from absolute units.

## Metric polarity

One V1 polarity table governs assessment:

| Polarity | Metrics | Interpretation |
| --- | --- | --- |
| Higher generally favorable | `commerce_revenue`, `orders`, `roas`, `mer`, `ctr`, `conversion_rate` | Increase is favorable; decrease is unfavorable. |
| Lower generally favorable | `cpa`, `cpc` | Decrease is favorable; increase is unfavorable. |
| Context-dependent | `spend`, `impressions`, `clicks`, `conversions`, `attributed_revenue`, `aov` | Movement alone is `context_required`. |

Unchanged facts are neutral. Context-dependent does not mean unimportant: clicks or spend can participate in cross-metric rules, and AOV can provide context when revenue and orders diverge. Provider conversions remain broad canonical provider conversions, and provider attributed revenue never becomes commerce revenue.

## Core rules

Every available comparable report/source KPI can produce one metric-movement observation. Special types identify CPA, provider ROAS, MER, commerce revenue, and orders without changing their KPI semantics.

Positive and negative movers contain at most three favorable and three unfavorable observations. Ranking uses absolute percentage change, then a stable metric/source/ID tie-break. Context-dependent, neutral, unavailable-percentage, and cross-metric observations are excluded; raw currency/count/ratio units are never compared.

Spend/commerce-revenue divergence is emitted only when both percentage changes exist, both previous baselines are positive, and their gap is at least 5 percentage points. Revenue growing at least five points faster is favorable efficiency improvement; spend growing at least five points faster is unfavorable deterioration. MER is included as evidence when available. Zero/non-positive baselines do not produce this relative-growth rule. The observation states the relative movement only and does not claim spend caused revenue performance.

Meta and Google source-efficiency observations use only their own available spend, CPA, and ROAS facts. A notable/major favorable CPA or ROAS movement yields improvement; an unfavorable one yields deterioration. No campaign cause or combined cross-provider ROAS is inferred.

Source contribution is calculated only for additive advertising spend. For a non-zero available total spend delta, each available source delta is divided by that total delta. Signed shares may be negative or greater than one when sources offset; this is truthful movement contribution rather than a bounded allocation. A zero/unavailable total delta produces no contribution. Ratios such as ROAS, MER, CTR, CPA, and CPC never receive pseudo-contribution.

V1 rule-based signals are limited to:

- report spend increased while report conversions decreased;
- source spend increased while the same source's attributed revenue decreased;
- commerce revenue increased while orders decreased (context only, with AOV evidence when available);
- report or source clicks increased while matching conversions decreased.

These are explainable conjunctions, not statistical anomaly detection, forecasting, or causation.

## Explicit targets

Targets are optional transient request inputs. Relay never invents or persists them.

```ts
type Target = {
  id: string;
  metric: KpiMetricKey;
  scope: "report" | "source";
  source?: "meta_ads" | "google_ads" | "shopify";
  operator: ">" | ">=" | "<" | "<=";
  value: FixedDecimalString;
  unit: "currency" | "count" | "ratio";
  currencyCode?: string;
};
```

The server accepts a bounded JSON array and validates exact object fields, IDs, supported metric, exact operator tokens, canonical decimal value, unit, source/scope compatibility, and three-letter currency where supplied. Operators are dispatched through explicit comparison branches and are never evaluated as code. Currency targets require a matching explicit currency code; count/ratio targets must not supply one. Malformed targets reject the request. A valid target evaluation is `met`, `breached`, or `unavailable`; only a breach creates a `TARGET_BREACH` observation. Its priority is highest, while its significance still reflects the KPI's comparison magnitude rather than being inflated by the breach. Missing/incompatible KPI facts never become a false breach.

## Deduplication and priority

Stable observation IDs deduplicate exact rule output. Metric movements and aggregate source-efficiency/cross-metric signals coexist only when they communicate different facts. The default ready result returns at most 12 observations ordered by:

1. target breach;
2. major unfavorable movement;
3. major favorable movement;
4. source-efficiency or divergence signal;
5. notable movement;
6. contextual/minor signal.

Ties use deterministic type, scope, source, metric, and ID ordering. Movers are selected before the presentation limit so their contract is stable.

## Evidence lineage and exclusions

Evidence copies the exact structured KPI identity, scope/source, unit, current/previous values, absolute change, and percentage change. It contains no raw row, filename, provider payload, customer identity, recommendation, or generated narrative. Downstream layers can determine why a finding exists without re-reading CSV data.

Sprint 08 adds no database, persistence, connector, AI/LLM call, recommendation engine, report/PDF generation, charting dependency, statistical model, seasonality model, or campaign analysis.
