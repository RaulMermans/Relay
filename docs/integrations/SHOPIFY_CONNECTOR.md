# Activation Decision

## B - Transport + normalization implementable, durable live activation deferred

Verified 2026-08-12 against Shopify's current official developer documentation.

Shopify requires an installed app and a store-scoped Admin API access token. Public apps created on or after 2026-04-01 must use expiring offline tokens; the access token expires after 3,600 seconds and the rotating refresh token after 90 days. Relay has no authenticated ownership model or durable server-side credential store for installation state, access/refresh tokens, expiries, rotation, revocation, or disconnect. Browser storage, cookies, environment variables per merchant, Markdown, source fixtures, logs, and server memory are not acceptable substitutes.

Relay can still implement and verify a real provider transport boundary: an API-versioned GraphQL query, response validation, cursor pagination, bounded retry/error mapping, store discovery, canonical normalization, and CSV/API semantic equivalence. The registry and UI must keep live fetch unavailable. Relay will revisit activation after an approved durable credential/ownership boundary exists and production callback/webhook endpoints can be operated.

## Shopify V1 contract

- API: GraphQL Admin API stable version `2026-07`; REST Admin is legacy and is not used.
- Access: server-side `X-Shopify-Access-Token`; access tokens and client secrets never enter Relay domain records, browser code, fixtures, errors, or logs.
- Least-privilege scope: `read_orders`. It provides only the latest 60 days by default. `read_all_orders` is separately approved and is not a baseline Relay scope; requests older than the supported installation permission must fail clearly rather than imply completeness.
- Capabilities: `account_discovery`, `reporting_fetch`, `date_range_fetch`, and `pagination`.
- Non-capabilities: every mutation, including product, inventory, order, fulfillment, discount, customer, and store-configuration changes.
- Store identity: Shopify's GraphQL `Shop.id` is the authoritative external account ID. `Shop.name`, `currencyCode`, and `ianaTimezone` are display/reporting metadata. The `.myshopify.com` domain is used only to address a validated server request and is not substituted for the GraphQL ID.
- Account selection: an installation authorizes exactly one shop. Discovery therefore returns one installed shop; Relay still validates the submitted GraphQL shop ID against that result before fetch.

## Authorization boundary

For a future standalone multi-merchant Relay app, the provider boundary is:

```text
validate Shopify installation request HMAC and shop hostname
  -> create short-lived single-use state/nonce server-side
  -> redirect to an allowlisted authorization URL for read_orders
  -> validate callback HMAC, exact state, shop hostname, timestamp, and redirect URI
  -> exchange the authorization code server-side for an expiring offline token
  -> durably store installation, encrypted token/refresh token, expiries, scopes, and owner
  -> discover and bind the authenticated Shop.id
  -> connection ready
```

Shopify-managed installation and token exchange are recommended for embedded apps; authorization code grant remains the supported standalone flow. Relay is not currently a Shopify-admin embedded app, so no embedded session-token surface is assumed. No initiation/callback/status/fetch route is added in Sprint 10 because the state and resulting credential cannot be persisted safely. No Shopify environment variables are added while those routes are deferred.

Public App Store distribution also requires HMAC-verified mandatory compliance webhooks for `customers/data_request`, `customers/redact`, and `shop/redact`. They are activation requirements, not required for the request-scoped adapter tests. An order reporting fetch itself does not require order event webhooks. Custom distribution changes review/distribution rules but does not remove Relay's need for durable credential ownership.

## API and dependency decision

Use standards-based server `fetch` with Zod validation. The V1 adapter needs one GraphQL endpoint, one shop query, and one orders query, while OAuth activation is deferred. Adding `@shopify/shopify-api` or a GraphQL client would add unused auth/webhook/billing surface and dependency weight without reducing the current persistence blocker. Revisit the official library when live authorization is approved because Shopify recommends its security helpers for authorization flows.

## Reporting query and grain

Relay requests only:

- shop: `id`, `name`, `currencyCode`, `ianaTimezone`, and `myshopifyDomain`;
- orders: edge cursor, `id`, `name`, `createdAt`, `totalPriceSet.shopMoney`, and `pageInfo`.

Relay deliberately does not request customer identity, email, phone, address, notes, line items, products, fulfillment, or payment details. One validated GraphQL `Order` node is one normalizer input unit and produces one canonical commerce observation. Duplicate order IDs fail; Relay never expands line items or repeats totals.

`grossRevenue` uses `totalPriceSet.shopMoney`, matching the existing CSV `Total`/`Total sales` gross-order semantic before returns. Although Shopify exposes current totals and refunded totals, V1 does not fetch or emit them: the representative CSV transport leaves `netRevenue` and `refunds` unavailable, and populating API-only values would break the required null/zero semantic equivalence. `netRevenue`, `refunds`, `customers`, and `newCustomers` therefore remain `null`; Relay does not fetch or infer customer data.

## Date range and timezone semantics

The provider query uses `created_at` with an inclusive store-local calendar range translated to an inclusive UTC lower bound and exclusive UTC upper bound. Translation uses the discovered store's IANA timezone. The order `createdAt` timestamp is converted back to that same store timezone before taking `YYYY-MM-DD`; this avoids treating UTC dates as store-local dates.

The request remains provider-neutral and inclusive (`start` through `end`). The provider query uses `sortKey: CREATED_AT` and an explicit created-time filter. Relay validates every normalized date against the request range. Invalid IANA zones, timestamps, or boundary results fail as invalid provider responses.

## Pagination, throttling, and failures

Shopify cursors remain inside the provider module. Each page requests at most 100 orders and passes `pageInfo.endCursor` to the Sprint 09 generic pagination coordinator. Fetches are capped at 100 pages and 10,000 orders; repeated cursors, no-progress pages, page exhaustion, and record overflow fail closed. When Shopify returns GraphQL cost metadata, Relay calculates a bounded retry delay from `requestedQueryCost`, `currentlyAvailable`, and `restoreRate` rather than assuming a one-point request.

GraphQL Admin API throttling is cost-based per app/store. HTTP `429` and GraphQL `THROTTLED` errors map to retryable `RATE_LIMITED`. Relay derives a bounded delay from GraphQL `extensions.cost.requestedQueryCost` and `throttleStatus`; all retries remain request-scoped and use the generic injected-delay helper. HTTP 5xx/network failures map to retryable provider unavailability. Authentication, permission, unavailable shop, malformed response, GraphQL terminal errors, and pagination failures map to stable redacted connector errors. Raw payloads and query URLs never escape the provider boundary.

## Provenance and lifecycle

Every canonical observation carries `transport: "api"`, `provider: "shopify"`, the validated GraphQL shop ID, fetch request ID, inclusive requested range, and a bounded safe order GID locator. API observations never fabricate CSV filenames, rows, or mapping origins.

The Shopify adapter is `implemented` in the registry, while `configured` remains `false` and its connector instance remains unavailable from production runtime wiring. Readiness therefore reports `connector_not_configured`; the UI states that the API adapter exists but live connection is not yet available. Shopify CSV remains a permanent supported transport.

## Official documentation record

| Topic | Official source | Verified | Relay decision |
| --- | --- | --- | --- |
| Authentication and app models | https://shopify.dev/docs/apps/build/authentication-authorization | 2026-08-12 | Standalone authorization code grant is the relevant future flow; installation and server-side credentials are required. |
| Authorization callback checks | https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant | 2026-08-12 | Validate HMAC, state/nonce, shop hostname, and allowlisted redirect before token exchange. |
| Offline token rotation | https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/offline-access-tokens | 2026-08-12 | Public apps use expiring offline access/refresh tokens; durable secure storage is an activation blocker. |
| App distribution | https://shopify.dev/docs/apps/launch/distribution | 2026-08-12 | Public/custom distribution affects installation/review, not Relay's persistence requirement. |
| Admin API versioning | https://shopify.dev/docs/api/usage/versioning | 2026-08-12 | Pin stable `2026-07`; audit quarterly and before its 2027-07-16 support end. |
| REST status | https://shopify.dev/docs/api/admin-rest | 2026-08-12 | REST Admin is legacy; use GraphQL Admin API. |
| Orders query/pagination | https://shopify.dev/docs/api/admin-graphql/2026-07/queries/orders | 2026-08-12 | Use created-time filtering, `CREATED_AT` sorting, edges, and `pageInfo.endCursor`. |
| Order financial fields | https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Order | 2026-08-12 | Preserve original total as gross; defer current/refunded totals until both transports have equivalent optional-field semantics. |
| Shop identity/timezone | https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Shop | 2026-08-12 | GraphQL shop ID is authority; name, currency, timezone, and domain are metadata/addressing. |
| Order scopes/history | https://shopify.dev/docs/api/usage/access-scopes#orders-permissions | 2026-08-12 | Request `read_orders`; older-than-60-day access needs separately approved `read_all_orders`. |
| GraphQL limits | https://shopify.dev/docs/api/usage/limits | 2026-08-12 | Use bounded cursor pages and request-scoped retry informed by cost/throttle metadata. |
| Compliance webhooks | https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance | 2026-08-12 | Public activation must implement mandatory HMAC-verified privacy webhooks; no reporting webhook is needed for manual fetch. |
| Development stores | https://shopify.dev/docs/apps/build/dev-dashboard/stores | 2026-08-12 | Future live integration testing uses a Shopify dev store; automated tests stay synthetic and offline. |
