# Current status

- Sprint 11 is complete at baseline `87f051b`.
- Sprint 12 activation decision: B - Google Ads transport/normalization implemented; durable live activation deferred.
- Official Google Ads API requirements verified 2026-08-13; the adapter is pinned to REST `v25`.
- Developer token: application-level server credential from a manager API Center; production availability depends on its Test/Explorer/Basic/Standard access and review status.
- OAuth: `https://www.googleapis.com/auth/adwords`, one-hour access tokens, offline refresh-token flow for recurring access, and encrypted durable owner/scope/expiry/revocation state required.
- Customer model: directly accessible OAuth roots -> customer/customer_client hierarchy -> serving reporting customer; manager login context is derived and validated server-side.
- Query: daily `ad_group` GAQL with customer/campaign/ad-group identity plus cost micros, impressions, clicks, primary conversions, and conversions value.
- Semantics: cost micros uses fixed decimal placement; conversions value is Google-attributed revenue only; explicit zero differs from omitted metric.
- Dependency decision: native server `fetch` plus existing Zod; no Google SDK, OAuth framework, database, Prisma, or new package.
- Persistence blocker: Relay cannot durably own/encrypt refresh tokens, selection context, revocation, or disconnect state and has no production callback surface.

# Verification

- Clean Sprint 11 baseline: 31 files / 225 tests passed before edits.
- Google focused red observed for missing provider modules; focused green: 2 files / 29 tests.
- Registry focused red observed; focused green with Google suites: 3 files / 37 tests.
- Typecheck and lint passed after the provider implementation pass.
- Sprint-close verification: npm 11.9.0 `ci` completed with 0 vulnerabilities; lint, typecheck, test, unit, integration, build, and E2E passed.

# Next action

- Sprint 12 is ready to commit; no unresolved P0/P1 security, data-contract, or PR-review finding remains.

# Sprint 13 handoff

- Build Product UX + Multi-Source Workspace around `Client -> Reporting Period -> Data Sources -> Automated preparation -> Exceptions requiring attention -> Performance -> What Changed -> Generate Report`.
- Combine Meta Ads, Google Ads, and Shopify API/CSV inputs in one reporting cycle without downstream transport branches.
- Use exception-driven progressive disclosure: show compact ready/needs-attention source states and reveal mapping/Data Health detail only when user action is required.
- Treat Sprint 13 as the major product UX/UI redesign: information architecture, workspace shell, source management, smart intake, correction/health states, KPI and What Changed hierarchy, loading/error/empty states, responsive accessibility, and an editorial strategy-report visual system.
