# KPI definitions - preliminary glossary

Formulas are semantic drafts using validated canonical values. Provider-specific conversion and revenue meanings are not defined yet.

| KPI | Definition | Formula | Source of truth | Edge cases |
| --- | --- | --- | --- | --- |
| Spend | Media cost in the reporting period | Sum of `spend` | Canonical advertising data; final rule pending | Missing currency, duplicate rows |
| Revenue | Monetary outcome; must name attributed, gross, or net type | Not a single universal formula | Explicitly selected canonical revenue field | Do not substitute commerce for attributed revenue |
| Orders | Commerce orders in the reporting period | Count/sum as normalized | Canonical commerce data; rule pending | Refunds, cancellations, time zone |
| Impressions | Delivered ad impressions | Sum of `impressions` | Canonical advertising data | Partial source coverage |
| Clicks | Recorded ad clicks | Sum of `clicks` | Canonical advertising data | Click-type definition pending |
| CTR | Click-through rate | `clicks / impressions` | Canonical advertising data | Zero impressions |
| CPC | Cost per click | `spend / clicks` | Canonical advertising data | Zero clicks |
| CPA | Cost per defined conversion | `spend / conversions` | Canonical advertising data; conversion definition pending | Zero/ambiguous conversions |
| ROAS | Attributed return on ad spend | `attributed_revenue / spend` | Canonical advertising data | Zero spend; attribution window mismatch |
| MER | Marketing efficiency ratio | Explicit commerce revenue basis / spend | Explicit commerce field plus spend | Revenue basis and coverage mismatch |
| AOV | Average order value | Explicit commerce revenue basis / orders | Canonical commerce data | Zero orders; returns policy |
| Conversion Rate | Conversion share for a defined denominator | `conversions / denominator` | Definition pending by report rule | Denominator ambiguity; zero denominator |
