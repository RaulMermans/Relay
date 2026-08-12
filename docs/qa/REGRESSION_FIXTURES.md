# Regression fixtures

Fixture layout:

- `fixtures/raw/`: clearly labelled synthetic `meta_ads/`, `google_ads/`, and `shopify/` representative/alternate CSVs; `unknown/`, `malformed/`, and focused `failures/` inputs
- `fixtures/normalized/`: independently maintained canonical JSON for each supported representative/alternate export, plus expected structured failure outcomes
- `fixtures/expected/`: independently maintained Data Health and KPI output

Sprint 05 regressions compare raw provider input -> validated parsed structure -> source detection -> mapping -> canonical output. The six current goldens cover Meta Ads, alternate Meta, Google Ads, alternate Google (including cost micros), Shopify, and alternate Shopify. Failure fixtures cover missing date, invalid amount, invalid date, ambiguous mapping, duplicate canonical target, duplicate Shopify order IDs, and mixed currencies.

Sprint 06 adds synthetic multi-source raw inputs in `fixtures/raw/data-health/` and manually maintained expected findings in `fixtures/expected/data-health/`. Sprint 07 adds `fixtures/expected/kpi/` with healthy complete, advertising-only, commerce-only, zero-denominator, previous-zero, null-input, and currency-safe cases plus a manually reviewable formula table.

Sprint 08 adds four comparison-period raw fixtures under `fixtures/raw/change-intelligence/` and ten manual expected cases under `fixtures/expected/change-intelligence/`: commerce growth, efficiency deterioration/improvement, Meta deterioration, Google improvement, target breach/met, previous zero, missing KPI, and revenue semantics. Raw-pipeline integration proves healthy/review/blocked gates and Shopify/provider revenue separation. Expected files are never regenerated from either engine. Future connector tests reuse canonical goldens. Never add fabricated production evidence; label every synthetic fixture explicitly as synthetic.
