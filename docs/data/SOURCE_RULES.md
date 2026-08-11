# Source rules

## Cross-source invariants

- Meta advertising data is not Shopify commerce truth.
- Google Ads advertising data is not Shopify commerce truth.
- Connector and CSV inputs for the same provider must normalize to the same canonical semantics.
- Unknown fields must never map silently.
- Ambiguous mappings may require user confirmation.

Sprint 04 performs no field mapping or normalization. Its rules identify only an intake source and never infer canonical data, KPIs, or revenue meaning.

## CSV source detection

Source detection is deterministic, runs only after CSV validation, and uses normalized header text (trimmed, case-insensitive, internal whitespace collapsed, and BOM removed). It never uses a filename, file contents, an LLM, or fuzzy classification.

The only source values are `meta_ads`, `google_ads`, `shopify`, and `unknown`. `unknown` is a valid outcome for both unsupported and ambiguous data.

Each provider receives the sum of the weights for its distinct matching header concepts. A candidate requires at least six points. A leading candidate wins only when it is at least two points ahead of every other candidate meeting that threshold. A winning score of seven or more has `high` confidence; a score of six has `medium` confidence. Unsupported and ambiguous outcomes have `low` confidence. These are deterministic evidence labels, not statistical probabilities.

| Source | Header concepts and explicit aliases | Weights |
| --- | --- | --- |
| Meta Ads | Campaign: `Campaign`, `Campaign name`; Ad set: `Ad set`, `Ad set name`; spend: `Amount spent`, `Spend`; delivery: `Impressions`; traffic: `Link clicks`, `Clicks`, `Outbound clicks`; purchase count: `Purchases`, `Website purchases`; attributed value: `Purchase conversion value`, `Website purchase conversion value` | 2, 3, 3, 1, 1, 1, 2 |
| Google Ads | Campaign: `Campaign`, `Campaign name`; ad group: `Ad group`, `Ad group name`; cost: `Cost`, `Cost (micros)`; delivery: `Impressions`, `Impr.`; traffic: `Clicks`, `Interactions`; conversion count: `Conversions`, `All conv.`; attributed value: `Conv. value`, `Conversion value`, `All conv. value` | 2, 3, 3, 1, 1, 1, 2 |
| Shopify | Order: `Name`, `Order`, `Order name`; creation: `Created at`, `Paid at`, `Processed at`; total: `Total`, `Total sales`; subtotal: `Subtotal`; payment state: `Financial status`, `Payment status`; customer: `Email`, `Customer email` | 2, 3, 2, 2, 3, 1 |

`matchedSignals` reports the exact supplied headers that contributed to the outcome. For an ambiguous result, `conflictingSignals` identifies the contending provider evidence and the intake status is `needs_review`; Relay does not choose either provider. For an unsupported result, the status is also `needs_review`, with no conflicting signals.

These fixture-backed aliases are intentionally narrow. Future real-world validation can extend them through an explicit contract and regression fixture, not an implicit fallback.
