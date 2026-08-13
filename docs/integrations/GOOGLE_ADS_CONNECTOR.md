# Activation Decision

## B - Transport + normalization implemented; durable live activation deferred

Verified 2026-08-13 against current official Google developer documentation.

Google Ads requires two distinct credential classes: an application-level developer token issued from a Google Ads manager account, and an OAuth 2.0 authorization for the Google user whose accessible customers Relay will inspect. Recurring multi-user use requires offline access and durable encrypted refresh-token, owner, scope, expiry, revocation, and account-context state. Relay has no authenticated owner model or durable server-side credential store, so live OAuth routes and production activation remain deferred. Browser storage, cookies, Markdown, fixtures, per-user environment variables, logs, and server memory are not substitutes.

Relay can still implement and verify the real read-only provider boundary with request-scoped server credentials: accessible-customer discovery, manager hierarchy resolution, server-validated customer selection, paged GAQL reporting, bounded retry/error mapping, canonical normalization, and CSV/API semantic equivalence. Revisit activation after an approved encrypted ownership-aware credential store, production callback surface, disconnect/revocation lifecycle, and an approved developer-token access level exist.

## Google Ads V1 contract

- API: Google Ads API REST `v25`, released 2026-07-22 and scheduled to sunset in August 2027. Reverify monthly during active development, before activation, and before the sunset window.
- Credentials: `developer-token` is application configuration; the OAuth access/refresh token belongs to a user connection. They are never combined into a domain record.
- OAuth scope: `https://www.googleapis.com/auth/adwords`. Google exposes no narrower reporting-only scope, so Relay enforces read-only behavior by implementing only `ListAccessibleCustomers` and `GoogleAdsService.Search`. No mutate endpoint exists in the module.
- Capabilities: `account_discovery`, `reporting_fetch`, `date_range_fetch`, and `pagination`.
- Non-capabilities: campaign, budget, bidding, keyword, ad, audience, conversion-action, account-link, upload, and every other mutation.
- Reporting customer identity: the hyphen-free ten-digit Google Ads customer ID is the authoritative `ExternalAccount.id`. Descriptive name, currency, timezone, status, and manager context are metadata.
- Production access: a developer token is requested from the API Center of a manager account. Test Account Access is limited to test accounts; Explorer and Basic can access production within their operation limits; Standard has additional review/RMF implications. Google may require application review/approval.
- Test limitation: test accounts do not serve ads, so impressions, conversions, and cost reporting remain empty; automated Relay coverage therefore uses labelled synthetic responses rather than claiming live test-account reporting evidence.

## Customer and manager-account model

`CustomerService.ListAccessibleCustomers` returns only customers directly accessible to the OAuth identity and ignores `login-customer-id`. Each directly accessible customer is queried through `FROM customer` to determine whether it is a serving customer or manager.

For a manager root, Relay queries the read-only `customer_client` resource. Google documents that it includes the manager itself plus all direct and indirect clients, with `level` identifying hierarchy distance. Relay excludes managers from selectable reporting accounts because a Google Ads reporting request operates against one customer and does not automatically aggregate descendants. A nested serving client is selectable with the directly accessible manager root retained only inside the provider boundary as its login context.

```text
OAuth identity
  -> directly accessible customer root
  -> manager? customer_client direct + indirect hierarchy
  -> serving reporting customers only
  -> server validates selected customer ID
  -> Search operating customer with discovered login-customer-id when required
```

Directly accessible serving customers omit `login-customer-id`. Customers reached through a manager use that directly accessible manager's hyphen-free ID. If the same serving customer is reachable through multiple authorized roots, Relay chooses direct access first, otherwise the lexicographically lowest discovered manager ID for deterministic behavior. Browser input never supplies or overrides manager context. An undiscovered customer or mismatched selected connection fails with `ACCOUNT_NOT_FOUND` before the report query.

## Authorization boundary

The future multi-user sequence is:

```text
bind short-lived single-use state to an authenticated Relay owner
  -> redirect to Google OAuth with exact allowlisted redirect URI, adwords scope, and offline access
  -> validate callback state/error and exact redirect URI
  -> exchange the code server-side with OAuth client ID/secret
  -> validate scope and obtain access/refresh-token metadata
  -> durably encrypt tokens, owner, scope, expiry, revocation, and selected customer context
  -> ListAccessibleCustomers
  -> resolve manager hierarchy and validate one reporting customer
  -> ready
```

Google access tokens normally expire after one hour. Refresh tokens can expire or be invalidated and must be revoked/deleted on disconnect. Client secrets, developer tokens, authorization headers, access tokens, and refresh tokens remain server-side. Sprint 12 adds no authorize, callback, account, or fetch Route Handler because the state and resulting connection cannot yet be persisted safely.

## REST and dependency decision

Use native server `fetch` plus existing Zod validation. Relay needs one GET method and one paged POST method, and live OAuth is deferred. Direct REST keeps `developer-token`, `login-customer-id`, versioning, GAQL, page tokens, quota metadata, and injected offline tests explicit without adding the official gRPC client libraries or a broad Google Cloud/OAuth package. Search is selected instead of SearchStream because fixed pages allow bounded re-fetch and fit Relay's existing pagination guards. Revisit an official client library only if live OAuth or demonstrated transport maintenance needs justify its dependency cost.

## Reporting query and semantic model

Relay queries `FROM ad_group` and selects only:

- `customer.id`, `customer.descriptive_name`, `customer.currency_code`, `customer.time_zone`;
- `campaign.id`, `campaign.name`;
- `ad_group.id`, `ad_group.name`;
- `segments.date`;
- `metrics.cost_micros`, `metrics.impressions`, `metrics.clicks`, `metrics.conversions`, and `metrics.conversions_value`.

The inclusive request range becomes `segments.date BETWEEN 'start' AND 'end'`; results are ordered by date, campaign ID, and ad-group ID. One Google row is one canonical daily ad-group observation. Relay does not query keyword, search-term, demographic, placement, device, creative, or provider-derived CTR/CPC/CPA/ROAS fields. V1 accepts at most 31 inclusive customer-calendar days per request. Google v24+ limits granular daily lookback to 37 months; the smaller Relay bound is an explicit request/resource guard, not a claim about provider retention.

`metrics.cost_micros` is converted by decimal-string placement through the existing fixed-decimal utility; binary floating point is not used. Customer currency is required, matched to the selected customer, preserved per observation, and never converted or inferred. `segments.date` is kept as the provider/customer calendar date and checked against the inclusive requested range; it is not shifted through UTC. The discovered timezone is validation metadata while canonical `sourceTimezone` remains `null` for the existing CSV/API contract.

`metrics.conversions` maps to canonical `conversions`, matching the existing Google CSV `Conversions` fixture. Google defines this metric from conversion actions included in the Conversions column (`include_in_conversions_metric=true`) and applies configured attribution; it may be fractional. `metrics.conversions_value` maps only to `attributedRevenue`. It is Google advertising attribution, not commerce revenue, Shopify revenue, MER/AOV input, or cross-platform truth. Relay does not segment or sum unrelated conversion-action categories and does not resolve cross-platform attribution overlap.

Provider fields explicitly present as zero remain canonical `"0"`. A selected metric omitted from the REST row remains `null`; Relay does not fabricate zero from absence. Google also omits segmented rows whose selected metrics are all zero, so absence of a row is not converted into a zero observation.

## Pagination, quotas, and errors

Google Ads API v19+ fixes Search pages at 10,000 rows and removes `page_size`. Relay forwards only opaque `nextPageToken`, keeps the GAQL query identical, and caps a fetch at five pages / 50,000 rows. Discovery additionally caps directly accessible roots at 20 and unique serving customers at 1,000. Repeated tokens, empty continuation pages, root/account overflow, or a sixth page fail closed with `PAGINATION_LIMIT_EXCEEDED`; partial data is not returned as complete.

Explorer production usage is limited to 2,880 operations/day and Basic to 15,000; Search and each valid paged retrieval count according to Google's quota rules. `RESOURCE_EXHAUSTED`/HTTP 429 maps to retryable `RATE_LIMITED`. Transient `UNAVAILABLE`, `INTERNAL`, `DEADLINE_EXCEEDED`, `UNKNOWN`, `ABORTED`, network, and 5xx failures use at most three request-scoped attempts with bounded exponential delays and bounded `Retry-After`; tests inject delay and never sleep. Authentication, permission/developer-token, account/login context, malformed query, malformed response, and pagination failures are terminal for the current fetch.

Errors expose only Relay code, provider, retryability, safe message, coarse category, and bounded delay. OAuth/provider messages, request IDs, headers, customer IDs from errors, URLs, response payloads, and credentials never enter the surfaced error.

## Provenance, lifecycle, and CSV equivalence

Every canonical API observation carries `transport: "api"`, `provider: "google_ads"`, the validated reporting customer ID, fetch request ID, inclusive date range, and a bounded locator of `date:campaignId:adGroupId`. It never fabricates CSV filenames, row numbers, or mapping origins.

The representative synthetic API fixture normalizes to the same business facts as `fixtures/raw/google_ads/representative-export.csv`. Equivalence ignores only provenance/order and identity fields unavailable in the CSV; jointly available campaign/ad-group names, dates, primitive metrics, currency, null/zero, and revenue domain remain strict. API observations pass through existing Data Health, KPI, and Change Intelligence without a transport branch. The registry says implemented but unconfigured, readiness remains `connector_not_configured`, the UI exposes no Connect control, and Google CSV remains permanent.

## Official documentation record

| Topic | Official source | Verified | Relay decision |
| --- | --- | --- | --- |
| Version and sunset | https://developers.google.com/google-ads/api/docs/sunset-dates | 2026-08-13 | Pin REST `v25`; reverify before activation and well before August 2027 sunset. |
| Developer token | https://developers.google.com/google-ads/api/docs/api-policy/developer-token | 2026-08-13 | Treat as application-level server configuration obtained from a manager API Center. |
| Access levels | https://developers.google.com/google-ads/api/docs/api-policy/access-levels | 2026-08-13 | Test/Explorer/Basic/Standard status and review determine usable accounts and quotas; no production readiness is claimed. |
| Test accounts | https://developers.google.com/google-ads/api/docs/best-practices/test-accounts | 2026-08-13 | Test accounts are isolated and do not produce serving metrics; automated reporting fixtures stay synthetic. |
| OAuth scope/offline access | https://developers.google.com/google-ads/api/docs/oauth/internals | 2026-08-13 | Use `adwords` scope and offline access for future recurring connections; enforce read-only in Relay code. |
| Web-server OAuth/state | https://developers.google.com/identity/protocols/oauth2/web-server | 2026-08-13 | Future callback requires state, exact registered redirect, server exchange, secure refresh-token handling, and revocation. |
| Credential management | https://developers.google.com/google-ads/api/docs/oauth/credential-management | 2026-08-13 | Encrypt user credentials at rest, handle expiry/revocation, and delete on disconnect; this blocks live activation today. |
| Call/login structure | https://developers.google.com/google-ads/api/docs/concepts/call-structure | 2026-08-13 | Send OAuth and developer-token headers; use discovered manager as `login-customer-id` only when required. |
| Accessible customers | https://developers.google.com/google-ads/api/docs/account-management/listing-accounts | 2026-08-13 | Start with directly accessible OAuth roots; never trust a submitted customer ID. |
| Hierarchy/customer client | https://developers.google.com/google-ads/api/fields/v25/customer_client | 2026-08-13 | Use read-only direct/indirect hierarchy metadata and exclude managers from reporting selection. |
| Search versus SearchStream | https://developers.google.com/google-ads/api/rest/common/search | 2026-08-13 | Use paged Search for bounded, restartable REST collection. |
| Paging | https://developers.google.com/google-ads/api/docs/reporting/paging | 2026-08-13 | Accept fixed 10,000-row pages, no `page_size`, with strict token/page/record guards. |
| Date segmentation/range | https://developers.google.com/google-ads/api/docs/reporting/segmentation | 2026-08-13 | Select `segments.date` with a finite inclusive range; keep daily customer-calendar grain. |
| Zero metrics | https://developers.google.com/google-ads/api/docs/reporting/zero-metrics | 2026-08-13 | Preserve explicit zero, do not invent rows/zeroes for omitted all-zero segmented results. |
| Conversion reporting | https://developers.google.com/google-ads/api/docs/conversions/reporting | 2026-08-13 | Use `conversions` and `conversions_value`; keep configured provider attribution caveats explicit. |
| Quotas | https://developers.google.com/google-ads/api/docs/best-practices/quotas | 2026-08-13 | Bound operations/pages and map quota exhaustion to bounded retry. |
| Error handling | https://developers.google.com/google-ads/api/docs/best-practices/understand-api-errors | 2026-08-13 | Parse standard/GoogleAdsFailure categories, retry only transient classes, and redact diagnostics. |
