# Canonical data contract

## Purpose and scope

This contract defines the minimum semantic model for Relay reporting. It is not a provider-field catalog or database schema. Meta Ads, Google Ads, and Shopify CSV/API inputs normalize into this model before validation, reconciliation, analytics, or report generation.

## Canonical observation envelope

Every normalized observation has these conceptual parts:

- `domain`: `advertising` or `commerce`.
- `source`: the provider and ingestion path identity; V1 providers are Meta Ads, Google Ads, and Shopify.
- `source_account`: provider account/store identifier and separate display name when available.
- `date`: one local calendar day in the source reporting timezone, plus the timezone used for that date.
- `dimensions`: optional provider entity identifiers and display names at the granularity supplied.
- `measures`: domain-specific reported values with explicit availability.
- `currency_code`: ISO 4217 code for all monetary measures in the observation.
- `provenance`: ingestion identifier, source reference, raw-artifact reference when retained, mapping version, and normalization version.

Canonical observations are daily. A source artifact that contains only an arbitrary-period aggregate must not be fabricated into daily rows; it is unsupported for daily normalization until a daily extract is obtained. Daily grain makes reporting-period comparison, reaggregation, and reconciliation safer.

## Advertising performance observation

An advertising observation represents one day for a source account and the most specific available paid-media dimensions:

- Required identity: source, source account, and date.
- Optional dimensions: campaign, ad group/ad set, and ad/creative. Each dimension retains provider identifier separately from display name when supplied.
- Measures: spend, impressions, clicks, conversions, and `attributed_revenue`.

No source is required to populate every optional dimension or measure. A missing campaign is not a synthetic "unknown campaign" value; it remains unavailable at that grain and is surfaced through Data Health where it affects analysis.

## Commerce performance observation

A commerce observation represents one day for a store/account:

- Required identity: source, source account/store, and date.
- Measures: orders, gross revenue, net revenue, refunds when available, customers when available, and new customers when available.

Commerce observations do not contain advertising `attributed_revenue`. Advertising observations do not contain Shopify/store gross or net revenue.

## Semantic rules

### Source identity and external identifiers

Every record preserves provider, provider account/store ID, and source entity IDs where available. Identifiers are stable references; human-readable names are display metadata and may change without changing identity.

### Currency and numeric precision

Monetary values are represented as integer minor units paired with an ISO 4217 currency code. Persisted and computed non-money ratios use fixed-scale decimal semantics, not binary floating point. Currency conversion is out of scope for V1: incompatible currencies cannot be silently combined and must block the affected aggregate or produce a Data Health warning.

### Null, unavailable, and zero

An actual value of `0` is meaningful. An unavailable metric is represented as unavailable/null with an optional reason; it must never normalize to zero. For example, zero reported conversions differs from conversion data not supplied by the source.

### Provenance and deduplication

Each normalized observation remains traceable to source plus ingestion event. Adapters supply the source reference or row/page locator needed for diagnosis without leaking provider payload structures into analytics. Deduplication uses the observation's provider identity, daily grain, available dimensions, and ingestion provenance; ambiguous duplicates are a validation concern, not an overwrite rule.

### Revenue invariant

There is no ambiguous canonical `revenue` field. `gross_revenue` and `net_revenue` are commerce measures. `attributed_revenue` is a paid-platform measure. Their permitted KPI use is defined in [ADR-001](../decisions/ADR-001-revenue-semantics.md).

## Normalization result

Each adapter produces canonical observations, provenance, and structured validation findings. Unknown fields, ambiguous mappings, unsupported period aggregates, missing currency, and duplicate candidates remain explicit findings for Data Health; adapters do not silently guess.
