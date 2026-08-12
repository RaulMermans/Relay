# Regression fixtures

Fixture layout:

- `fixtures/raw/`: labelled synthetic Meta Ads, Google Ads, Shopify, failure, Data Health, and Change Intelligence CSV inputs
- `fixtures/normalized/`: independently maintained canonical outcomes for supported CSV exports
- `fixtures/expected/`: independently maintained Data Health, KPI, and Change Intelligence expectations
- `fixtures/connectors/mock/`: provider-neutral synthetic API-like records for connector framework tests, with no real-provider compatibility claim
- `fixtures/connectors/shopify/`: labelled synthetic Shopify GraphQL Admin API-shaped shop/order pages and failure cases

Sprint 05 covers representative/alternate provider normalization and invalid mapping/value/date/currency/grain cases. Sprint 06 adds multi-source Data Health/reconciliation fixtures. Sprint 07 adds manual KPI goldens and formula verification. Sprint 08 adds comparison-period inputs plus manual Change Intelligence expectations and revenue-separation cases.

Sprint 09 adds a two-page provider-neutral mock advertising result equivalent to the representative Meta CSV business facts. Integration runs each transport through its own adapter/normalizer and compares canonical semantics while ignoring only provenance/order. Focused negative tests change spend, attributed revenue, null/zero, and currency so semantic drift cannot pass. API attribution remains `attributedRevenue`, never commerce revenue.

Sprint 10 adds a two-page Shopify API fixture equivalent to the representative Shopify CSV, plus synthetic currency/zero, store-local timestamp boundary, malformed page, provider throttle, and duplicate-order cases. The equivalence regression permits store/account identity to differ only when one transport cannot supply it, then rejects revenue, currency, order-count, null/zero, date, and jointly supplied identity drift. No fixture contains a real merchant, customer, shop token, or production response.

Expected artifacts are never regenerated from implementation code. Never add fabricated production evidence, client data, auth material, or real provider payload compatibility claims; label every synthetic fixture explicitly.
