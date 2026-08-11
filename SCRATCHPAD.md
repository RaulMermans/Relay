# Current status

- Sprint 04 is complete at baseline `41dc9f6`.
- Sprint 05 implementation and verification are complete: transient CSV mapping and canonical daily normalization cover synthetic representative Meta Ads, Google Ads, and Shopify exports. Production deployment remains deferred because local Vercel CLI/auth/project linkage are unavailable.

# Decisions and fixtures

- Canonical data uses separate row-level `advertising` and `commerce` observations. Meta/Google conversion value is `attributedRevenue`; Shopify totals are `grossRevenue`. No KPI or reconciliation logic exists.
- Money and counts are canonical fixed decimal strings with explicit ISO currency, preserving null versus `"0"`. Invalid text does not coerce. Google micros use decimal-string placement.
- Mapping is provider-specific and deterministic: exact/normalized alias, manual, unmapped, ambiguous, or ignored. Manual selection is limited to the detected domain and lives only in the current request.
- Supported Shopify grain is one order row per order ID. Duplicate IDs fail rather than risking line-item double-counting.
- Synthetic raw inputs, failure inputs, and independent canonical JSON are under `fixtures/raw/` and `fixtures/normalized/`.

# Commands and findings

- Full verification passed: `npm ci` (388 packages), lint, typecheck, `npm run test` (13 files/69 tests), `npm run test:unit` (9 files/46 tests), `npm run test:integration` (4 files/23 tests), production build, and `npm run test:e2e` (7 tests).
- Targeted Vitest mapping, values, provider-normalizer, raw-to-golden, API, and parser-boundary tests passed after test-first implementation. Targeted Playwright mapping/normalization, required-field correction, and manual-ambiguity flows also passed.
- Initial clean-install attempts hit a Windows `ENOTEMPTY` generated-directory cleanup race and a wrapper PATH propagation issue. Triage found no lingering Node/npm process; removing the exact generated dependency directory and running cached npm 11.9 with inherited Node path produced the successful clean install. No project dependency changed.
- Initial typecheck exposed ES2020 `replaceAll` incompatibility and narrow type-model issues; focused fixes restored clean lint/typecheck. An initial E2E selector became ambiguous after the mapping table was added and was narrowed to the pre-existing header list.
- The default shell lacks `npm`; use the bundled Node 24.14.0 executable with the cached npm 11.9 CLI. Vitest/Playwright require normal child-process permission in this environment.

# Sprint 06 handoff

- Input: row-level `AdvertisingObservation`/`CommerceObservation`, fixed-decimal values, explicit per-row currency, source-row provenance, mapping origin, and `MIXED_CURRENCIES` findings.
- Data Health should evaluate date coverage/alignment, currency compatibility, duplicate candidates beyond Shopify order IDs, missing/unavailable required analysis inputs, and provenance/mapping findings.
- Reconciliation must compare compatible coverage only and present Shopify commerce revenue beside, never as a replacement for, Meta/Google attributed revenue. It must not implement cross-platform attribution deduplication.

# Next action

- Sprint 06 should first define and test a canonical Data Health finding model for date coverage/alignment, per-row currency compatibility, mapping/provenance review, and duplicate candidates. Do not implement reconciliation/KPIs in that first task.
