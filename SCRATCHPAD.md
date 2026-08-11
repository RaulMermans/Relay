# Current status

- Sprint 03 is complete. Production deployment remains externally blocked/deferred: Vercel CLI, authentication, and project linkage are unavailable locally.
- Sprint 04 implemented a transient single-file CSV intake boundary: server validation, parsing, deterministic detection, redacted logging, and a minimal upload UI. It excludes mapping, normalization, KPIs, connectors, persistence, AI, and reports.

# Decisions and fixtures

- Parser: `csv-parse` 7.0.2, selected over hand-written parsing for quoted cells, escaped quotes, CRLF/LF, empty cells, BOMs, and malformed records. The sole new dependency is locked in `package-lock.json`.
- Limits: 5 MiB per upload and 50,000 data rows. The server rejects overflow rather than truncating it; no raw CSV or parsed rows are retained or logged.
- Source signatures: explicit weighted header evidence for Meta Ads, Google Ads, and Shopify; insufficient or close competing evidence stays `unknown` and returns `needs_review`.
- Fixtures: clearly labelled synthetic representative/alternate provider files, unknown and ambiguous cases, and malformed/empty/headers-only cases under `fixtures/raw/`.

# Commands and findings

- Targeted Vitest parser, detector, validation, intake, API, and fixture checks passed; the combined unit/integration run reported 30 passing tests before the row-limit regression was added.
- Targeted Playwright checks passed: 4 tests covering the root page, health endpoint, Meta upload, and unknown-source review.
- Full verification with the temporary pinned Node 24.14.0/npm 11.9.0 runtime passed: `npm ci` (388 packages, 0 vulnerabilities), `npm run lint`, `npm run typecheck`, `npm run test` (8 files, 31 tests), `npm run test:unit` (6 files, 23 tests), `npm run test:integration` (2 files, 8 tests), `npm run build`, and `npm run test:e2e` (4 tests).
- `npm audit --omit=dev --audit-level=high` reported 0 production vulnerabilities. Security review found no P0/P1 issue; the row limit addresses the residual synchronous-parser resource-risk concern.
- Early verification failures: the system PATH lacks npm; Vite needs sandbox-external child-process permission; `Array.prototype.at` was incompatible with the ES2020 target and was replaced with indexed access.

# Sprint 05 handoff

- Parsed input available for mapping: original `headers`, minimally parsed string rows, `rowCount`, delimiter, and parse warnings. The API exposes headers/counts but never rows.
- Detection output available: `source` (`meta_ads`, `google_ads`, `shopify`, `unknown`), semantic confidence, matched signals, and conflicting signals. Known header aliases are in `docs/data/SOURCE_RULES.md`.
- Mapping persistence remains deferred; there is no database, mapping store, canonical observation, or provider normalizer.
- Sprint 05 should map the detected provider shape to the canonical daily observation requirements in `docs/data/DATA_CONTRACT.md`: provider/account identity, date/timezone, dimensions, currency, and the distinct advertising `attributed_revenue` or commerce `gross_revenue`/`net_revenue` semantics.
- Reuse the synthetic raw fixtures as mapping inputs and add expected normalized fixtures only when mappings are explicit. Preserve `unknown`/ambiguous source outcomes and decide how a user confirms mapping without silently guessing.

# Next action

- Sprint 04 is ready to commit. Sprint 05 must begin with explicit field mapping and canonical normalization; it must not add persistence implicitly.
