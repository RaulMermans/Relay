# ADR-001: Revenue semantics

## Status

Accepted for V1 architecture.

## Context

Relay combines Shopify commerce and paid-media data, but it is not an attribution product. Product invariants require store revenue and paid-platform attributed revenue to remain semantically distinct while supporting deterministic ROAS, MER, reconciliation, and client reporting.

## Options considered

### Option A: One revenue field with source metadata

Simple to query, but source metadata is too easy to ignore. It permits accidental mixing of store truth and platform attribution in KPIs and report language.

### Option B: Separate semantic metric fields

Use `gross_revenue` and `net_revenue` only for commerce observations, and `attributed_revenue` only for advertising observations. This is explicit, small, and sufficient for V1 reporting.

### Option C: Typed metric observations or metric namespace

Maximally extensible, but adds a generic metric layer before V1 has a need beyond the three known sources and measures. It would complicate deterministic formulas and mapping review.

## Decision

Adopt Option B. Relay has no generic canonical `revenue` field.

- Total ecommerce revenue is sourced from Shopify/store commerce observations as `gross_revenue` or `net_revenue`.
- Paid-channel attributed revenue is represented as `attributed_revenue` within Meta or Google advertising observations and retains source, account, date, entity, and attribution context.
- ROAS uses `attributed_revenue / spend` only within the same paid-source scope.
- MER uses an explicitly selected commerce revenue basis divided by total selected paid-media spend. The report labels the basis and coverage.
- Reconciliation compares compatible period/currency coverage and warns when commerce revenue and paid attribution differ; the difference is not an error by itself.
- V1 does not sum advertising attributed revenues across Meta and Google into an authoritative total, and does not calculate cross-platform de-duplicated attribution.

## Consequences

Reports can show commerce outcomes and source-specific paid attribution side by side without pretending they reconcile. Any aggregate paid-attribution presentation must be descriptive, labeled as potentially overlapping, and not used as authoritative revenue, MER numerator, or cross-channel ROAS.

## Revisit triggers

Revisit if Relay adds a formally defined attribution product, obtains a trusted non-overlapping attribution source, or needs a generalized metric namespace for additional V1-equivalent domains.

## Validation path

Use synthetic and anonymized fixtures with divergent Shopify, Meta, and Google values. Verify that ROAS and MER select only permitted inputs and that reconciliation differences remain warnings rather than overwritten values.
