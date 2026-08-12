# Regression fixtures

Fixture layout:

- `fixtures/raw/`: clearly labelled synthetic `meta_ads/`, `google_ads/`, and `shopify/` representative/alternate CSVs; `unknown/`, `malformed/`, and focused `failures/` inputs
- `fixtures/normalized/`: independently maintained canonical JSON for each supported representative/alternate export, plus expected structured failure outcomes
- `fixtures/expected/`: independently maintained Data Health, future KPI, and report-relevant output

Sprint 05 regressions compare raw provider input -> validated parsed structure -> source detection -> mapping -> canonical output. The six current goldens cover Meta Ads, alternate Meta, Google Ads, alternate Google (including cost micros), Shopify, and alternate Shopify. Failure fixtures cover missing date, invalid amount, invalid date, ambiguous mapping, duplicate canonical target, duplicate Shopify order IDs, and mixed currencies.

Sprint 06 adds synthetic multi-source raw inputs in `fixtures/raw/data-health/` and manually maintained expected findings in `fixtures/expected/data-health/`. They cover aligned Meta/Google/Shopify data, a partial Shopify period, currency incompatibility, expected-source absence, malformed canonical provenance, advertising duplicate candidates, and attribution-plus-commerce revenue semantics. Expected files are never regenerated from the engine. Future connector tests reuse canonical goldens; future KPI tests also belong in `fixtures/expected/`. Never add fabricated production evidence; label every synthetic fixture explicitly as synthetic.
