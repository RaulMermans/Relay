# Source rules

## Cross-source invariants

- Meta and Google platform values are advertising attribution, never Shopify commerce truth.
- Shopify values are commerce data, never paid-platform attributed revenue.
- CSV and future connector inputs converge at the canonical contract in [DATA_CONTRACT.md](DATA_CONTRACT.md).
- Mapping and normalization are deterministic. They use neither an LLM nor fuzzy semantic guessing.
- Unknown, duplicate, or ambiguous mappings never silently choose a source column.

## CSV source detection

Source detection remains the Sprint 04 deterministic, header-evidence step. It runs before mapping and returns only `meta_ads`, `google_ads`, `shopify`, or `unknown`. See the compact evidence catalog below; filenames and data values do not influence detection.

| Source | Detection evidence aliases |
| --- | --- |
| Meta Ads | `Campaign`, `Campaign name`; `Ad set`, `Ad set name`; `Amount spent`, `Spend`; `Impressions`; `Link clicks`, `Clicks`, `Outbound clicks`; `Purchases`, `Website purchases`; `Purchase conversion value`, `Website purchase conversion value` |
| Google Ads | `Campaign`, `Campaign name`; `Ad group`, `Ad group name`; `Cost`, `Cost (micros)`; `Impressions`, `Impr.`; `Clicks`, `Interactions`; `Conversions`, `All conv.`; `Conv. value`, `Conversion value`, `All conv. value` |
| Shopify | `Name`, `Order`, `Order name`; `Created at`, `Paid at`, `Processed at`; `Total`, `Total sales`; `Financial status`, `Payment status`; `Email`, `Customer email` |

Detection normalizes header text by removing a leading BOM, trimming, collapsing internal whitespace, and lowercasing. A candidate requires six weighted points and must lead every other qualifying candidate by two points; a tie/near-tie remains `unknown` with `needs_review` status. These deterministic `high`, `medium`, and `low` labels describe source-detection evidence only, not field-mapping confidence.

## V1 field aliases

Field mapping uses the same normalized header comparison. An exact original-string match receives `exact_alias`; a case/whitespace/BOM-normalized match receives `normalized_alias`. The catalog is deliberately limited to aliases exercised by the synthetic V1 fixtures or normalizer tests.

### Meta Ads → advertising

| Canonical field | Exact aliases |
| --- | --- |
| `date` | `Date start` |
| `source_account_id` | `Account ID` |
| `source_account_name` | `Account name` |
| `campaign_id` | `Campaign ID` |
| `campaign_name` | `Campaign name`, `Campaign` |
| `group_id` | `Ad set ID` |
| `group_name` | `Ad set name`, `Ad set` |
| `ad_id` | `Ad ID` |
| `ad_name` | `Ad name` |
| `currency` | `Currency` |
| `spend` | `Amount spent`, `Spend` |
| `impressions` | `Impressions` |
| `clicks` | `Link clicks`, `Clicks`, `Outbound clicks` |
| `conversions` | `Purchases`, `Website purchases` |
| `attributed_revenue` | `Purchase conversion value`, `Website purchase conversion value` |

The Meta API adapter requests daily ad-level Ads Insights without optional breakdowns. It maps `inline_link_clicks` to canonical `clicks` so the API matches the CSV `Link clicks` semantic. It maps `actions` only when `action_type` is exactly `purchase` to `conversions`, and maps the exact matching `action_values` entry to `attributedRevenue`. Missing entries remain `null`; explicit `"0"` remains zero; unrelated or duplicate purchase actions are never summed. Account currency is explicit and dates retain Meta's ad-account-timezone calendar boundary. Provider attribution remains advertising attribution only.

### Google Ads → advertising

| Canonical field | Exact aliases |
| --- | --- |
| `date` | `Day` |
| `source_account_id` | `Customer ID` |
| `source_account_name` | `Customer` |
| `campaign_id` | `Campaign ID` |
| `campaign_name` | `Campaign`, `Campaign name` |
| `group_id` | `Ad group ID` |
| `group_name` | `Ad group`, `Ad group name` |
| `ad_id` | `Ad ID` |
| `ad_name` | `Ad name` |
| `currency` | `Currency code` |
| `spend` | `Cost`, `Cost (micros)` |
| `impressions` | `Impressions`, `Impr.` |
| `clicks` | `Clicks`, `Interactions` |
| `conversions` | `Conversions`, `All conv.` |
| `attributed_revenue` | `Conv. value`, `Conversion value`, `All conv. value` |

`Cost (micros)` is the only unit-specific alias: it converts from millionths by decimal-string placement. All other V1 money aliases use source major-unit decimal text.

The Google Ads API adapter queries daily `ad_group` rows. It maps `metrics.cost_micros` through the same fixed-decimal micros conversion, `metrics.clicks` to clicks, `metrics.conversions` to the configured primary Conversions-column semantic, and `metrics.conversions_value` to advertising-only `attributedRevenue`. Explicit zero remains zero and an omitted selected metric remains unavailable; all-zero segmented rows that Google omits are not fabricated. Customer ID, currency, timezone, campaign, and ad-group identity are validated inside the provider boundary. No provider-derived CTR, CPC, CPA, ROAS, keyword, search-term, or mutation field is requested.

### Shopify → commerce

| Canonical field | Exact aliases |
| --- | --- |
| `date` | `Created at`, `Paid at`, `Processed at` |
| `order_id` | `Name`, `Order`, `Order name` |
| `currency` | `Currency` |
| `gross_revenue` | `Total`, `Total sales` |

`source_store_id`, `source_store_name`, `net_revenue`, `refunds`, `customers`, and `new_customers` are valid manual commerce targets but have no automatic V1 alias because the representative exports do not supply an evidenced semantic equivalent.

The Shopify API adapter uses one GraphQL `Order` node per canonical observation. `Order.name` maps to `orderId`, the store-local calendar date derived from `createdAt` maps to `date`, and `totalPriceSet.shopMoney` maps to `grossRevenue` plus `currencyCode`. The discovered GraphQL shop ID/name populate store identity. API `netRevenue`, `refunds`, `customers`, and `newCustomers` stay unavailable so the supported CSV/API fixture retains identical business semantics; Shopify customer PII is not requested.

## Mapping outcomes and manual rules

Each provider column is one of:

- `mapped`: one known alias matched.
- `unmapped`: no alias matched; optional columns remain visible.
- `ambiguous`: more than one provider column would populate one canonical field, or a column has multiple candidates. Automatic normalization stops.
- `ignored`: the user deliberately excluded an optional or ambiguous provider column for this transient request.

A proposal is `ready` only when no ambiguity remains and the required provider semantics in [DATA_CONTRACT.md](DATA_CONTRACT.md) are mapped. Otherwise it is `needs_review` with explicit `requiredMissing` semantics. The UI sends manual overrides by column index, not untrusted header keys. It exposes only canonical targets valid for the detected provider domain; an advertising file cannot target `gross_revenue`, and a commerce file cannot target `attributed_revenue`. Duplicate canonical targets and malformed override payloads fail with structured errors.

Mappings exist for this processing request only. Relay stores neither raw CSV data nor mapping reuse rules in Sprint 05.
