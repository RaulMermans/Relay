# Regression fixtures

Fixture layout:

- `fixtures/raw/`: clearly labelled synthetic `meta_ads/`, `google_ads/`, and `shopify/` representative/alternate CSVs; `unknown/`, `malformed/`, and focused `failures/` inputs
- `fixtures/normalized/`: independently maintained canonical JSON for each supported representative/alternate export, plus expected structured failure outcomes
- `fixtures/expected/`: expected KPI/report-relevant output

Sprint 05 regressions compare raw provider input -> validated parsed structure -> source detection -> mapping -> canonical output. The six current goldens cover Meta Ads, alternate Meta, Google Ads, alternate Google (including cost micros), Shopify, and alternate Shopify. Failure fixtures cover missing date, invalid amount, invalid date, ambiguous mapping, duplicate canonical target, duplicate Shopify order IDs, and mixed currencies. Future connector tests reuse the same canonical goldens; future KPI tests belong in `fixtures/expected/`. Never add fabricated production evidence; label every synthetic fixture explicitly as synthetic.
