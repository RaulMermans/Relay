# Sprint 07 - Deterministic KPI Engine

| Task | Outcome | Relevant files/docs | Acceptance criteria | Status |
| --- | --- | --- | --- | --- |
| T-124 KPI Execution Contract | Gate KPI execution with Data Health. | `docs/data/KPI_DEFINITIONS.md`, `lib/kpi/types.ts`, `lib/kpi/engine.ts` | Blocked returns stable refusal; healthy/review-required execute. | Complete |
| T-125 KPI Result Model | Expose auditable deterministic facts. | `docs/data/KPI_DEFINITIONS.md`, `lib/kpi/types.ts` | Period, metrics, source breakdown, status, inputs, formula, and comparison are explicit. | Complete |
| T-126 KPI Definitions | Lock primitive, derived, and comparison definitions. | `docs/data/KPI_DEFINITIONS.md` | Every KPI documents source, unit, null/zero/currency behavior, and caveats. | Complete |
| T-127 Revenue Semantics | Preserve commerce truth and provider attribution. | `docs/data/KPI_DEFINITIONS.md`, ADR-001, `lib/kpi/engine.ts` | Shopify gross feeds commerce KPIs; same-provider attribution feeds ROAS only. | Complete |
| T-128 Fixed Precision | Calculate without binary floating point. | `lib/kpi/arithmetic.ts`, KPI definitions | Bounded BigInt decimal arithmetic, 12-place half-up division, canonical serialization. | Complete |
| T-129 Primitive Aggregation | Aggregate canonical period facts. | `lib/kpi/engine.ts` | Advertising and commerce primitives aggregate deterministically before ratios. | Complete |
| T-130 Spend | Calculate compatible advertising spend. | `lib/kpi/engine.ts`, unit tests | Period-scoped compatible sum; zero differs from unavailable. | Complete |
| T-131 Commerce Revenue | Calculate authoritative commerce revenue. | KPI definitions, `lib/kpi/engine.ts` | V1 uses documented Shopify gross revenue only. | Complete |
| T-132 Primitive Counts | Calculate orders, impressions, clicks, conversions. | `lib/kpi/engine.ts`, unit tests | Counts are precision-safe and missing never becomes zero. | Complete |
| T-133 CTR | Calculate click-through ratio. | KPI definitions, `lib/kpi/engine.ts` | Clicks/impressions; missing or zero denominator is unavailable. | Complete |
| T-134 CPC | Calculate cost per click. | KPI definitions, `lib/kpi/engine.ts` | Spend/clicks; currency preserved; zero clicks unavailable. | Complete |
| T-135 CPA | Calculate cost per provider conversion. | KPI definitions, `lib/kpi/engine.ts` | Spend/conversions; V1 semantic caveat explicit. | Complete |
| T-136 ROAS | Calculate same-provider attributed ROAS. | KPI definitions, `lib/kpi/engine.ts` | Meta/Google separate; no combined ROAS; zero spend unavailable. | Complete |
| T-137 MER | Calculate commerce efficiency. | KPI definitions, `lib/kpi/engine.ts` | Shopify gross revenue / compatible total advertising spend. | Complete |
| T-138 AOV | Calculate average order value. | KPI definitions, `lib/kpi/engine.ts` | Shopify gross revenue/orders; zero orders unavailable. | Complete |
| T-139 Conversion Rate | Lock advertising click-to-conversion rate. | KPI definitions, `lib/kpi/engine.ts` | Conversions/clicks; never implies site/session rate. | Complete |
| T-140 Source Breakdowns | Expose Meta, Google, and Shopify KPI views. | `lib/kpi/engine.ts`, `lib/kpi/types.ts` | Required provider/source metrics are deterministic. | Complete |
| T-141 Period Filtering | Enforce authoritative date selection. | `lib/kpi/engine.ts`, tests | Inclusive boundaries; no outside observation contributes. | Complete |
| T-142 Comparison Period | Use resolved previous equivalent period. | Data Health period contract, `lib/kpi/engine.ts` | Current/comparison scopes use Data Health resolution. | Complete |
| T-143 Deltas | Calculate mathematical changes. | `lib/kpi/engine.ts`, unit tests | Absolute/percentage deltas; previous zero percentage is null. | Complete |
| T-144 Direction Semantics | Keep interpretation outside KPI Engine. | KPI definitions | Results contain mathematical facts without favorable/unfavorable judgment. | Complete |
| T-145 Server Boundary | Run KPI Engine after Data Health. | `app/api/normalize/csv/route.ts` | Existing route returns compact facts and no canonical/raw rows. | Complete |
| T-146 KPI UI | Show a minimal scorecard. | `app/intake-form.tsx`, `app/globals.css` | Available summary/provider metrics show current, previous, and delta. | Complete |
| T-147 KPI Goldens | Add independent expected KPI cases. | `fixtures/expected/kpi/` | Complete, domain-only, zero, null, previous-zero, and precision cases exist. | Complete |
| T-148 Formula Verification | Make formulas manually inspectable. | `fixtures/expected/kpi/FORMULA_VERIFICATION.md` | Inputs and expected outputs include all formulas. | Complete |
| T-149 Unit Tests | Verify arithmetic, formulas, boundaries, and gate. | `tests/unit/kpi-*.test.ts` | Focused deterministic and edge-case suite passes. | Complete |
| T-150 Integration Tests | Verify raw pipeline through KPI goldens. | `tests/integration/kpi-pipeline.test.ts` | Healthy, review, blocked, and revenue-semantic cases pass. | Complete |
| T-151 E2E | Verify the single-source KPI UI flow. | `tests/e2e/intake.spec.ts` | Supported CSV reaches visible KPI summary. | Complete |
| T-152 Security/Data Integrity | Review trust and semantic boundaries. | `SECURITY.md`, KPI/API files, review skills | No P0/P1 precision, gate, exposure, or revenue issue remains. | Complete |
| T-153 Documentation | Align contracts and product claims. | KPI/data/data-flow/QA docs, README, changelog | Documentation states implemented capability and deferrals only. | Complete |
| T-154 Full Verification | Run the required verification ladder. | `package.json`, repository | Install, lint, typecheck, tests, build, E2E, and diff check pass. | Complete |
| T-155 Sprint 08 Handoff | Expose facts without interpretation. | KPI definitions, `SCRATCHPAD.md` | Exact next boundary is deterministic Change Intelligence. | Complete |
