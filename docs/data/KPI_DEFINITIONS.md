# KPI definitions

All KPI inputs come from validated canonical observations. Calculations use fixed-scale decimal semantics and preserve availability; an unavailable input does not become zero. Report rules select the period, currency-compatible data set, and any permitted commerce revenue basis.

## Revenue semantics

- Commerce gross and net revenue remain commerce metrics.
- Paid-platform `attributed_revenue` remains scoped to its provider/account/campaign attribution context.
- ROAS uses paid-platform `attributed_revenue` and matching paid-platform spend from the same scope.
- MER uses an explicitly selected commerce revenue basis and total selected paid-media spend. The report must label the commerce basis.
- Relay does not sum Meta and Google attributed revenues into an authoritative total, because cross-platform attribution can overlap.

See [ADR-001](../decisions/ADR-001-revenue-semantics.md) for the decision and reconciliation constraints.

| KPI | Definition | Formula | Source of truth | Edge cases |
| --- | --- | --- | --- | --- |
| Spend | Paid-media cost in the reporting period | Sum of available `spend` in compatible currency | Canonical advertising observations | Missing currency, duplicate rows, partial source coverage |
| Commerce Gross Revenue | Store revenue before report-defined deductions | Sum of `gross_revenue` | Canonical commerce observations | Returns/refund treatment supplied by source |
| Commerce Net Revenue | Store revenue after source-defined deductions | Sum of `net_revenue` | Canonical commerce observations | Source definition must be preserved; not interchangeable with gross |
| Attributed Revenue | Provider-reported conversion value attributed to paid media | Sum of `attributed_revenue` within one provider scope | Canonical advertising observations | Attribution window/overlap; never commerce truth |
| Orders | Commerce orders in the reporting period | Sum of normalized orders | Canonical commerce observations | Refund/cancellation policy and time zone |
| Impressions | Delivered ad impressions | Sum of `impressions` | Canonical advertising observations | Partial source coverage |
| Clicks | Recorded ad clicks | Sum of `clicks` | Canonical advertising observations | Provider click-type definition |
| CTR | Click-through rate | `clicks / impressions` | Canonical advertising observations | Zero or unavailable impressions |
| CPC | Cost per click | `spend / clicks` | Canonical advertising observations | Zero or unavailable clicks |
| CPA | Cost per defined conversion | `spend / conversions` | Canonical advertising observations | Zero/ambiguous conversions |
| ROAS | Paid-platform attributed return on matching ad spend | `attributed_revenue / spend` | Same-source canonical advertising observations | Zero spend, attribution-window mismatch, no cross-platform total |
| MER | Marketing efficiency using commerce revenue | selected commerce revenue basis / selected paid spend | Canonical commerce plus advertising observations | Currency/coverage mismatch; revenue basis must be labeled |
| AOV | Average commerce order value | selected commerce revenue basis / orders | Canonical commerce observations | Zero orders; returns policy |
| Conversion Rate | Conversion share for a defined denominator | `conversions / defined denominator` | Report rule plus canonical advertising data | Denominator ambiguity; unavailable or zero denominator |
