# Regression fixtures

Fixture layout:

- `fixtures/raw/`: provider input
- `fixtures/normalized/`: expected canonical output
- `fixtures/expected/`: expected KPI/report-relevant output

Future regressions should compare raw provider input -> normalized expected output -> expected KPI output. Never add fabricated production evidence; label every synthetic fixture explicitly as synthetic.
