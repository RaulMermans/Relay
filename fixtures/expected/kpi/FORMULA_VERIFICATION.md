# KPI formula verification

All values are synthetic and manually calculated. Ratios are raw decimal ratios, not pre-formatted percentages.

| Measure | Inputs | Expected output |
| --- | --- | --- |
| Spend | Meta `100` + Google `100` | `200` |
| Commerce Revenue (gross) | Shopify orders `500` + `300` | `800` |
| Orders | Shopify orders `1` + `1` | `2` |
| Impressions | `2,000` | `2000` |
| Clicks | `100` | `100` |
| Conversions | `10` | `10` |
| Attributed Revenue (Meta only) | `800` | `800` |
| CTR | `100 / 2,000` | `0.05` |
| CPC | `200 / 100` | `2` |
| CPA | `200 / 10` | `20` |
| Meta ROAS | Meta attributed revenue `800 /` Meta spend `200` | `4` |
| MER | Shopify gross revenue `800 /` total compatible paid spend `200` | `4` |
| AOV | Shopify gross revenue `800 /` Shopify orders `2` | `400` |
| Conversion Rate | advertising conversions `10 /` clicks `100` | `0.1` |
| Absolute delta | current `120 -` previous `100` | `20` |
| Percentage delta | `(120 - 100) / 100` | `0.2` |
| Previous-zero percentage | current `10`, previous `0` | `null` |

Meta and Google attributed revenues are deliberately never added in this table. Provider ROAS is separately scoped; Shopify gross revenue is the sole V1 numerator for commerce Revenue, MER, and AOV.
