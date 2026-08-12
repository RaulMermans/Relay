# KPI definitions

## Execution contract

The deterministic KPI engine consumes only canonical observations that have completed Data Health:

```ts
type KpiInput = {
  observations: Array<AdvertisingObservation | CommerceObservation>;
  reportingPeriod: ResolvedReportingPeriod;
  dataHealthStatus: "healthy" | "review_required" | "blocked";
};
```

`blocked` returns the stable failure below and performs no KPI calculation. `healthy` and `review_required` may execute; warnings remain owned by the upstream Data Health result. The KPI engine never decides whether unhealthy data is acceptable.

```ts
{
  status: "blocked";
  code: "DATA_HEALTH_BLOCKED";
  message: "KPI execution is unavailable because Data Health is blocked.";
  period: ResolvedReportingPeriod;
  metrics: [];
  sourceBreakdown: [];
}
```

## Result contract

A successful result has `status: "ready"`, the resolved `period`, report-level `metrics`, and source-specific `sourceBreakdown`. Each auditable metric contains:

```ts
type KpiMetricResult = {
  key: KpiMetricKey;
  value: FixedDecimalString | null;
  unit: "currency" | "count" | "ratio";
  status: "available" | "unavailable";
  unavailableReason?: "INPUT_UNAVAILABLE" | "ZERO_DENOMINATOR" | "CURRENCY_INCOMPATIBLE" | "INVALID_INPUT";
  inputs: Array<{
    source: "meta_ads" | "google_ads" | "shopify";
    field: string;
    period: "current" | "comparison";
    observationCount: number;
    currencyCode?: string;
  }>;
  formula: string;
  comparison: {
    current: FixedDecimalString | null;
    previous: FixedDecimalString | null;
    absoluteChange: FixedDecimalString | null;
    percentageChange: FixedDecimalString | null;
  };
};
```

There is no confidence score. `null` means the value cannot be truthfully calculated; an observed canonical `"0"` remains an available zero.

## Precision, rounding, and serialization

Relay uses an internal bounded fixed-decimal utility backed by `BigInt`; KPI calculations never convert authoritative numeric inputs to JavaScript `number`. Addition, subtraction, multiplication, comparison, and division accept canonical decimal text. Division produces at most 12 fractional digits and rounds half up once at the calculation boundary. Results serialize as canonical decimal strings without thousands separators, negative zero, or insignificant trailing zeroes. Ratios remain raw ratios (`"0.042"`), with `unit: "ratio"`; presentation may format them as percentages without changing the stored fact.

Inputs are limited to 256 characters and the canonical decimal grammar. Invalid or unbounded decimal input makes the affected metric unavailable with `INVALID_INPUT`. Divide by zero always returns an unavailable metric with `ZERO_DENOMINATOR`.

## Revenue semantics

V1 report-level `commerce_revenue` uses Shopify `grossRevenue`. This is the smallest explicit choice supported by the required Shopify order-row contract; `netRevenue` is optional and therefore cannot be the authoritative V1 basis. MER and AOV use the same Shopify gross-revenue basis.

Meta and Google `attributedRevenue` remain provider-specific advertising measures. Provider ROAS uses only the same provider's attributed revenue and spend. Relay exposes no report-level attributed-revenue total and no combined Meta-plus-Google ROAS because attribution can overlap. See [ADR-001](../decisions/ADR-001-revenue-semantics.md).

## Authoritative definitions

| Canonical key | Definition | Formula | Numerator | Denominator | Source/domain | Unit | Null behavior | Zero denominator | Currency requirements | Known caveats |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `spend` | Paid-media cost inside the selected period | Sum available `spend` | Advertising `spend` | None | Meta + Google advertising; also each provider | Currency | No supplied spend → unavailable, not zero | Not applicable | Exactly one compatible currency across contributing observations | Partial coverage remains an upstream warning |
| `commerce_revenue` | V1 store-truth gross revenue inside the selected period | Sum Shopify `grossRevenue` | Shopify `grossRevenue` | None | Shopify commerce | Currency | No supplied commerce revenue → unavailable | Not applicable | Exactly one compatible Shopify currency | Gross basis; source returns/refund treatment is preserved |
| `orders` | Supported Shopify order count | Sum `orders` | Shopify `orders` | None | Shopify commerce | Count | No orders field/data → unavailable | Not applicable | None | Supported export grain is one row per order ID |
| `impressions` | Provider-reported delivered ad impressions | Sum available `impressions` | Advertising `impressions` | None | Meta + Google advertising; also each provider | Count | No supplied impressions → unavailable | Not applicable | None | Provider definitions and partial coverage apply |
| `clicks` | Provider-reported ad clicks | Sum available `clicks` | Advertising `clicks` | None | Meta + Google advertising; also each provider | Count | No supplied clicks → unavailable | Not applicable | None | Click type remains provider-defined |
| `conversions` | Provider canonical conversion measure | Sum available `conversions` | Advertising `conversions` | None | Meta + Google advertising; also each provider | Count | No supplied conversions → unavailable | Not applicable | None | Not restricted to acquisitions in V1 |
| `attributed_revenue` | Provider-reported paid attribution value | Sum within one provider only | Same-provider `attributedRevenue` | None | Meta or Google advertising source breakdown only | Currency | No supplied attributed revenue → unavailable | Not applicable | Exactly one currency inside provider scope | Attribution windows and cross-platform overlap remain provider caveats |
| `ctr` | Advertising click-through rate | `clicks / impressions` | Advertising clicks | Advertising impressions | Advertising aggregate and each provider | Ratio | Missing numerator or denominator → unavailable | Impressions `0` → unavailable | None | Raw ratio, not pre-multiplied percentage |
| `cpc` | Advertising cost per click | `spend / clicks` | Advertising spend | Advertising clicks | Advertising aggregate and each provider | Currency | Missing spend or clicks → unavailable | Clicks `0` → unavailable | Spend must have one compatible currency | Currency is preserved in input metadata |
| `cpa` | Cost per provider canonical conversion | `spend / conversions` | Advertising spend | Advertising conversions | Advertising aggregate and each provider | Currency | Missing spend or conversions → unavailable | Conversions `0` → unavailable | Spend must have one compatible currency | V1 name is broad: conversions are provider canonical, not acquisition-only |
| `roas` | Provider attributed return on matching provider spend | `attributedRevenue / spend` | Same-provider attributed revenue | Same-provider spend | Meta or Google source breakdown only | Ratio | Missing attributed revenue or spend → unavailable | Spend `0` → unavailable | Same-provider numerator/denominator currency must be compatible | No combined cross-provider ROAS; attribution can overlap |
| `mer` | Commerce efficiency across compatible paid spend | `commerce_revenue / spend` | Shopify gross revenue | Total Meta + Google spend | Commerce plus advertising report level | Ratio | Missing commerce revenue or spend → unavailable | Spend `0` → unavailable | Commerce and total advertising spend require one compatible currency | No attributed revenue participates in the numerator |
| `aov` | Average gross commerce revenue per order | `commerce_revenue / orders` | Shopify gross revenue | Shopify orders | Shopify commerce/report level | Currency | Missing revenue or orders → unavailable | Orders `0` → unavailable | Shopify revenue currency is preserved | Uses the V1 gross-revenue basis, never attributed revenue |
| `conversion_rate` | Advertising click-to-conversion rate | `conversions / clicks` | Advertising conversions | Advertising clicks | Advertising aggregate and each provider | Ratio | Missing conversions or clicks → unavailable | Clicks `0` → unavailable | None | This is not Shopify site/session conversion rate; GA4/session data is absent in V1 |

Primitive sums include all available field values in the selected scope. A field absent from some rows does not fabricate a zero; an aggregate is unavailable only when no applicable observation supplies that field (or the input is invalid/incompatible).

## Reporting periods and comparisons

The engine filters observations itself with inclusive ISO date boundaries. It separately selects `currentPeriod` and the Data-Health-resolved immediately preceding equivalent-length `comparisonPeriod`; observations outside both ranges never contribute.

For every metric:

```text
absoluteChange = current - previous
percentageChange = (current - previous) / previous
```

If either period value is unavailable, both deltas are `null`. When previous is `0`, absolute change remains valid but percentage change is `null`. Current `0` with previous greater than `0` produces `-1` (a raw ratio representing -100%). These are mathematical facts only: an increase or decrease is not labeled favorable, unfavorable, significant, or actionable.

## Source breakdown

Meta Ads and Google Ads each expose spend, impressions, clicks, conversions, attributed revenue, CTR, CPC, CPA, ROAS, and advertising click-to-conversion rate. Shopify exposes commerce revenue, orders, and AOV. Campaign-level and other entity-level breakdowns are deferred.

## Sprint 08 boundary

The KPI engine exposes metric identity, current/previous values, absolute and percentage change, source, input scope, and period. Sprint 08 Change Intelligence may interpret those facts. The KPI Engine describes what changed mathematically. Change Intelligence interprets whether the change is favorable, unfavorable, significant, or actionable.
