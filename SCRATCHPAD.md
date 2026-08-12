# Current status

- Sprint 08 is complete at baseline `cd9b385`.
- Sprint 09 generic connector framework is complete pending commit; no live provider, OAuth, network request, durable state, or production connector UI was added.

# Sprint 09 decisions

- Transport: connectors own status, discovered/server-validated account selection, bounded read-only daily fetch, pagination, retry classification, and structured provider-bound results. Analytics begins only after canonical normalization.
- Lifecycle/readiness: fetch requires a framework implementation, server configuration, `ready` state, selected account, opaque credential reference, and `reporting_fetch`. Transient fetch errors do not mutate credential state.
- Connection/security: analytical connection records exclude raw credentials. Errors expose stable safe fields only; provider causes/payloads stay out. API record locators reject control, URL, and token/auth-like patterns.
- Provenance: CSV retains request/file/row/mapping lineage; API retains provider/account/fetch/date/optional safe record locator. Data Health validates provider/account identity and observation date within fetch range.
- Equivalence: connector test support ignores only provenance/order. Dates, source/account fields, dimensions, primitive measures, currency, null/zero, and revenue domain remain strict. Advertising API revenue stays `attributedRevenue`.
- Registry/UI: Shopify, Meta Ads, and Google Ads are framework-known but `not_built` and unconfigured. No decorative cards, fake connected state, or inert OAuth controls were added.

# Review and verification

- Data-contract, security-sanity, and PR reviews found no P0/P1 issue. Two P2 API-lineage gaps (observation outside fetch range; secret-bearing locator) were resolved with failing-then-passing regression coverage.
- `npm ci` via pinned npm 11.9.0 and bundled Node 24 added 388/audited 389 with 0 vulnerabilities. The initial attempt failed because child scripts could not resolve `node`; rerun with the bundled Node directory on `PATH` passed.
- `npm run lint` passed with no warnings after two test-support cleanup edits; `npm run typecheck` passed.
- `npm run test` passed 27 files/158 tests; unit passed 19/111; integration passed 8/47.
- `npm run build` passed; Playwright passed 8/8; `git diff --check` passed.
- Dependency diff is empty. Scope checks found no provider/OAuth/database dependency, analytics transport branch, runtime connector network call, raw credential domain field, secret-like connector fixture value, or production mock exposure.
- Connector skill has valid frontmatter/no placeholders and matching UI metadata. The provided `quick_validate.py` could not start because the bundled Python lacks `yaml`; no repository dependency was added for the external validator.

# Blockers and next action

- Live persisted connections remain blocked until Sprint 10 evaluates a secure durable server-side credential/ownership path. Vercel CLI/auth/project linkage remains independently deferred.
- Exact next task: Sprint 10 T-222 — verify current official Shopify authorization, read-only scopes, account/store selection semantics, reporting endpoints, pagination, limits, and secure-persistence options; produce an executable Shopify connector contract and activation decision before implementing OAuth or network code.
