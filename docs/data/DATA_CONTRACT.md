# Canonical data contract - initial draft

This is a semantic draft pending real exports and Sprint 02 architecture work; it is not a complete schema.

## Advertising performance

- Identity/dimension: source, account, campaign, ad set or group, ad or creative, date
- Measures: spend, impressions, clicks, conversions, attributed revenue

## Commerce

- Dimension: date
- Measures: orders, gross revenue, net revenue, customers, and new customers when available

## Invariant

`attributed_revenue` and store/commerce revenue must remain separately identified. Combining or comparing them requires explicit report rules and provenance.
