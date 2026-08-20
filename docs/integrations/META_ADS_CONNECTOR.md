# Activation Decision

## B - Transport + normalization implemented, durable live activation deferred

Verified 2026-08-12 against current official Meta developer documentation.

Meta requires every Marketing API call to carry an access token and explicitly directs applications to store that token securely in a database for later calls, validate it and its granted permissions, handle expiry/revocation, and reauthorize when necessary. Relay has no authenticated owner model or durable server-side credential store. A non-expiring system-user token is suitable only for server-to-server access to business assets assigned to that system user; it does not remove the ownership, asset-assignment, revocation, or secure-storage requirements of Relay's intended multi-client connection model.

Relay can safely implement and test the real read-only transport boundary with a request-scoped server credential: account discovery, validated selection, synchronous Ads Insights fetching, cursor pagination, bounded retry/error mapping, canonical normalization, and CSV/API equivalence. The registry and UI keep live fetching unavailable. Revisit activation only after an approved durable encrypted credential/ownership boundary, production redirect surface, revocation/disconnect lifecycle, and the applicable Meta App Review/business-verification requirements exist.

## Meta V1 contract

- API: Marketing API `v26.0`, explicitly included in every Graph path. Meta says unversioned Marketing API calls are invalid and releases versions approximately every four months, so reverify before activation and at each provider-version review.
- App/access: a Meta business app with the Marketing API product receives Limited Access for development. Full Access is the production tier and requires review/eligibility; access to other people's ad accounts requires advanced access to the requested permission. Business verification applies where access to sensitive data requires it.
- Least-privilege permission: `ads_read`. Meta's current authorization guide lists this for reading ad reports; Relay does not request `ads_management`. The provider connection must verify that `ads_read` was granted before discovery or fetch.
- Capabilities: `account_discovery`, `reporting_fetch`, `date_range_fetch`, and `pagination`.
- Non-capabilities: every campaign, ad-set, ad, budget, bid, audience, creative, catalog, or account mutation.
- Account discovery: `GET /v26.0/me/adaccounts` with only `id`, `account_id`, `name`, `currency`, `timezone_name`, and `account_status`. The Graph `id` in `act_{ad_account_id}` form is Relay's authoritative external ID; the numeric `account_id`, name, currency, timezone, and status are metadata. A submitted ID is matched server-side against the accounts discovered with the current credential.

## Authorization boundary

The future multi-client connection sequence is:

```text
create short-lived single-use state bound to an authenticated Relay owner
  -> redirect to Meta OAuth v26.0 with an exact allowlisted redirect URI and scope=ads_read
  -> validate callback state and error outcome
  -> exchange the code server-side with app ID, exact redirect URI, and app secret
  -> validate token app, user/system-user identity, expiry, and granted ads_read permission
  -> durably encrypt token, owner, scopes, expiry, and revocation metadata
  -> discover accessible /me/adaccounts
  -> bind one server-validated act_{account_id}
  -> ready
```

The app secret and tokens remain server-side. Long-lived user tokens can still expire or be invalidated by password changes or permission revocation. System-user tokens are considered only for a business-owned server integration with explicit asset assignment, not as a shortcut for arbitrary customer authorization. Disconnect must remove Relay's credential binding and make fetch impossible; provider revocation/invalid-token responses move the connection out of ready state. Sprint 11 adds no authorization, callback, account, or fetch routes and no environment keys because state and resulting credentials cannot yet be persisted safely.

## API and dependency decision

Use standards-based server `fetch` with the existing Zod validator. Relay needs two small GET boundaries (`/me/adaccounts` and `/{act_account_id}/insights`), bearer authentication, response headers, and cursor paging. Native fetch keeps API-version construction, fields, retry signals, and injected offline tests explicit without adding the broad Meta Business SDK or an OAuth framework. Revisit an official SDK only if live authorization introduces a demonstrated security or maintenance need.

## Ads Insights query and grain

Relay uses synchronous `GET /v26.0/{act_account_id}/insights` with:

- `level=ad` and `time_increment=1` for canonical daily ad-grain rows;
- inclusive `time_range={since: YYYY-MM-DD, until: YYYY-MM-DD}`;
- `use_unified_attribution_setting=true` so attributed results use the ad set's reporting configuration;
- `limit=100` plus bounded Graph cursor pagination;
- at most 31 inclusive account-timezone calendar days per synchronous request;
- fields `date_start`, `date_stop`, `account_id`, `account_name`, `account_currency`, campaign/ad-set/ad IDs and names, `spend`, `impressions`, `inline_link_clicks`, `actions`, and `action_values`.

No demographic, geographic, placement, device, product, or asset breakdown is requested. Relay does not request provider-derived CTR, CPC, CPA, or ROAS. The normalizer requires `date_start === date_stop`, treats it as the account-timezone calendar day, and validates it against the inclusive requested range. Meta documents that Insights are recorded in the ad account timezone. `ExternalAccount.timezone` preserves that metadata; the current canonical advertising contract retains `sourceTimezone: null` for CSV/API equivalence and does not reinterpret dates through UTC.

Account currency is explicit in discovery and `account_currency`; Relay validates that both match, performs no FX conversion, and never infers currency from locale.

## Conversion and attributed-value semantics

Meta returns `actions` and `action_values` as action-type/value lists. Relay selects only an entry whose `action_type` is exactly `purchase`:

- `actions[purchase].value` becomes canonical `conversions`;
- `action_values[purchase].value` becomes canonical `attributedRevenue`;
- unrelated actions, including link clicks, leads, add-to-cart, view content, and differently named purchase variants, do not contribute;
- no exact purchase entry means `null`/unavailable, while an explicit purchase entry with value `"0"` remains canonical `"0"`;
- duplicate exact purchase entries are malformed rather than summed.

Canonical `clicks` uses Meta `inline_link_clicks`, matching the existing CSV `Link clicks` semantic. Relay does not substitute Meta's broader all-ad `clicks` field.

This deliberately matches the existing Meta CSV fields `Purchases` and `Purchase conversion value` without claiming a universal Meta conversion definition. The values remain Meta-reported attribution under the ad set/account reporting configuration. Relay does not independently verify Meta attribution, combine it with Google attribution, resolve cross-platform overlap, or use it as Shopify commerce revenue, report-level commerce revenue, MER numerator, or total business revenue.

## Pagination, sync/async, rate limiting, and failures

Graph `paging.cursors.after` remains inside the provider module; Relay never follows or returns `paging.next`, which may contain credentials. Account discovery is capped at 10 pages/1,000 accounts and Insights at 100 pages/10,000 rows. Repeated cursors, no-progress pages, maximum-page exhaustion, and record overflow fail closed through the generic paginator.

Meta recommends starting with synchronous Insights and switching to asynchronous jobs when synchronous requests time out or a large query requires it. Relay's bounded V1 uses narrow fields, no breakdowns, and a maximum 31-day inclusive date range, so it starts synchronously. Longer ranges fail before a provider call. Async report jobs are deferred until representative use produces a concrete timeout/volume requirement; no generic job engine, worker, queue, or polling state is added.

Marketing/Insights limits apply at app and ad-account/business-use-case levels. Relay recognizes documented rate-limit codes (`4`, `17`, `613`, and `80000`/`80003`/`80004`/`80014`) plus HTTP `429`; it retains no raw header/payload data. Meta's usage headers remain documented context but are not retained or surfaced by this request-scoped V1. Only a valid bounded `Retry-After` supplies provider-directed delay; otherwise retry uses the existing exponential helper with three attempts and injected delay.

Invalid/expired token errors map to `AUTH_EXPIRED`; missing credentials to `AUTH_REQUIRED`; permission failures to `PERMISSION_DENIED`; inaccessible accounts to `ACCOUNT_NOT_FOUND`; documented throttles to retryable `RATE_LIMITED`; transient/network/5xx failures to retryable `PROVIDER_UNAVAILABLE`; malformed JSON/schema/action rows to `INVALID_PROVIDER_RESPONSE`; and cursor guards to `PAGINATION_LIMIT_EXCEEDED`. Raw Meta errors, bodies, URLs, headers, tokens, app secrets, account details, and trace IDs never escape the provider boundary.

## Provenance and lifecycle

Every canonical observation carries `transport: "api"`, `provider: "meta_ads"`, the validated `act_{account_id}`, fetch request ID, inclusive date range, and a safe bounded locator composed from the calendar date and ad ID. It invents no CSV filename, row, ingestion, or mapping origin.

The Meta adapter is implemented in the registry while `configured` remains `false` and the production connector instance remains `null`. Readiness therefore reports `connector_not_configured`; the UI states that the API adapter exists but live connection is not yet available. Meta CSV remains a permanent supported transport.

## Official documentation record

| Topic | Official Meta source | Verified | Relay decision |
| --- | --- | --- | --- |
| Marketing API overview | https://developers.facebook.com/documentation/ads-commerce/marketing-api | 2026-08-12 | Use the Marketing API only for read-only account/reporting access. |
| Authorization/access levels | https://developers.facebook.com/documentation/ads-commerce/marketing-api/get-started/authorization | 2026-08-12 | Marketing API product, `ads_read`, Limited development access, and reviewed Full/advanced access govern the integration; request no write permission. |
| Authentication/tokens | https://developers.facebook.com/documentation/ads-commerce/marketing-api/get-started/authentication | 2026-08-12 | Exchange and validate tokens server-side; secure database storage and expiry/revocation handling make durable activation deferred. |
| API versioning | https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/versioning | 2026-08-12 | Pin current `v26.0`; never make an unversioned call and reverify frequently. |
| Ad account reference | https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/ad-account | 2026-08-12 | `id` (`act_{ad_account_id}`) is authority; request only name, currency, timezone, and status metadata. |
| Ads Insights overview | https://developers.facebook.com/documentation/ads-commerce/marketing-api/insights | 2026-08-12 | Use the ad-account Insights edge with `ads_read` and explicit minimal fields. |
| Ad account Insights reference | https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/ad-account/insights | 2026-08-12 | Use `level=ad`, inclusive `time_range`, `time_increment=1`, action-type lists, account currency, and cursor paging. |
| Insights limits/best practices | https://developers.facebook.com/documentation/ads-commerce/marketing-api/insights/best-practices | 2026-08-12 | Start synchronous, reduce fields/range on timeouts, use account-timezone boundaries, and defer async until required. |
| Marketing API rate limiting | https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/rate-limiting | 2026-08-12 | Recognize documented error codes and HTTP 429; retain no usage headers; use bounded backoff and no unbounded scheduling. |
