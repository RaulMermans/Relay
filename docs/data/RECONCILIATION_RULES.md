# Reconciliation rules

## Purpose

Reconciliation follows canonical Data Health. It explains whether the selected source facts can be considered together; it does not aggregate measures, calculate a KPI, perform attribution modelling, or change canonical observations.

## Revenue semantics

- Shopify `grossRevenue`/`netRevenue` is the commerce-side source for store revenue when Shopify is selected as the commerce source.
- Meta Ads and Google Ads `attributedRevenue` remain provider-attributed advertising measures.
- Relay never adds Meta and Google attributed revenue together as total revenue, and never substitutes either value for Shopify commerce revenue.
- A numeric difference between Shopify revenue and advertising attributed revenue is expected attribution context, not a reconciliation error. Sprint 06 has no discrepancy threshold or attribution-accuracy score.
- Reconciliation may state that attribution and commerce values coexist with their semantic separation. It never exposes or derives a combined revenue amount.

## Compatibility findings

Reconciliation produces deterministic Data Health findings for:

- commerce source absent while advertising attribution is present;
- advertising source absent while commerce observations are present;
- commerce and advertising monetary currencies being incompatible;
- participating sources covering different reporting-period ranges; and
- correctly separated provider attribution plus commerce truth.

Currency and date compatibility can block downstream readiness. Source-absence findings are contextual unless the request-scoped expected-source contract independently makes the source required. A revenue difference alone never produces a finding.

## Deferred boundaries

No value conversion, cross-platform attribution deduplication, KPI calculation, persistence, connector, report, or AI behavior is part of reconciliation.
