# Regression fixtures

Fixture layout:

- `fixtures/raw/`: provider input; Sprint 04 contains clearly labelled synthetic `meta_ads/`, `google_ads/`, `shopify/`, `unknown/`, and `malformed/` CSVs
- `fixtures/normalized/`: expected canonical output
- `fixtures/expected/`: expected KPI/report-relevant output

Sprint 04 regressions compare raw provider input -> validated parsed structure -> source-detection result. Future regressions should compare raw provider input -> normalized expected output -> expected KPI output. Never add fabricated production evidence; label every synthetic fixture explicitly as synthetic.
