# Connector contract

## Boundary

A Relay connector owns the provider transport sequence:

```text
server-side authorization/session boundary
  -> connection status
  -> account discovery
  -> server-validated account selection
  -> bounded provider reporting fetch
  -> provider-neutral fetch result
  -> provider normalizer
  -> canonical observations
```

It does not calculate KPIs, decide Data Health, create Change Intelligence, generate reports, or perform AI interpretation. Provider payloads stop at the connector/provider-normalizer boundary. CSV and connectors remain different ingestion interfaces under [ADR-002](../decisions/ADR-002-unified-source-adapter-contract.md); they converge on the canonical contract, not a fake shared raw schema.

Sprint 09 implements only the generic TypeScript contracts, guard helpers, and a synthetic test harness. It implements no provider connector, authorization flow, network request, credential store, or durable connection.

## Read-only capabilities

V1 capabilities are deliberately small: `account_discovery`, `reporting_fetch`, `date_range_fetch`, and `pagination`. A provider may expose only the applicable subset. Relay connectors never expose campaign edits, bid or budget changes, audience mutation, creative publication, or any other write capability.

## Connection lifecycle

Transient fetch failures are connector errors, not credential states. `unavailable` describes connector authorization/configuration availability, not a single failed reporting request.

| State | Meaning | Allowed next states | Fetch | User action |
| --- | --- | --- | --- | --- |
| `not_connected` | No authorization session or connection exists. | `authorization_required` | No | Required |
| `authorization_required` | Authorization must begin or be repeated. | `authorizing`, `disconnected` | No | Required |
| `authorizing` | A server-side authorization exchange is in progress. | `connected`, `authorization_required`, `permission_error`, `unavailable` | No | Not while in progress |
| `connected` | Authorization is valid; fetch readiness is not established. | `account_selection_required`, `ready`, `expired`, `permission_error`, `disconnected` | No | Depends on next state |
| `account_selection_required` | One discovered account must be selected. | `ready`, `expired`, `permission_error`, `disconnected` | No | Required |
| `ready` | Authorization, validated selection, and reporting capability allow fetch. | `expired`, `permission_error`, `account_selection_required`, `disconnected` | Yes | No |
| `expired` | Credentials are no longer valid. | `authorization_required`, `disconnected` | No | Required |
| `permission_error` | Required read-only reporting permission is absent. | `authorization_required`, `disconnected` | No | Required |
| `disconnected` | The connection was revoked or explicitly disconnected. | `authorization_required`, `not_connected` | No | Required to reconnect |
| `unavailable` | The connector cannot currently authorize or be configured. | `authorization_required`, `not_connected` | No | Not necessarily |

## Connection and readiness

A request/test-scoped `Connection` contains provider, lifecycle status, optional selected external account ID/name, granted scopes, connection/fetch timestamps, capabilities, and at most an opaque `credentialReference`. It never contains an access token, refresh token, client secret, authorization header, or provider payload. The credential reference grants no analytical meaning.

Readiness is not one `connected` boolean:

1. `connectorExists`: Relay has an implementation.
2. `connectorConfigured`: required server-side provider configuration exists.
3. `connectionReady`: status is `ready`, a validated account is selected, an opaque credential reference exists, and `reporting_fetch` is granted.
4. `fetchPossible`: all earlier conditions hold for the current request/session.

Sprint 09 registry entries say the framework is ready while every provider implementation remains `not_built` and unconfigured.

## Accounts

`ExternalAccount` contains provider external `id`, display `name`, and optional provider status, currency, and timezone. Providers need not supply every optional field. Account discovery failures use the connector error contract.

Where selection is required, exactly one account is selected by external ID. Names are informational. Server code must match the submitted ID against accounts discovered/allowed for the current connection; browser-supplied arbitrary IDs are rejected. Selection is request/session scoped until secure persistence exists.

## Fetch request and result

`FetchRequest` is strict and provider-neutral: provider, selected external account ID, inclusive valid date range, and `requestedGrain: "daily"`. It exposes no provider fields, grouping DSL, or query language. Provider adapters translate this intent internally.

`ProviderFetchResult` contains provider, selected account, requested date range, pages fetched, provider-specific records, transport provenance, and safe warnings. Records may retain a provider-specific raw representation only inside the provider boundary; no fake universal raw record is required, and raw records never enter analytics.

## Pagination

The generic coordinator calls a provider-supplied page fetcher with an opaque token and returns accumulated records plus page count. Cursor, page-token, and offset details stay inside the connector. Every fetch sets positive maximum pages and records. Repeated tokens, a next-token page with zero records, maximum-page exhaustion, and record overflow fail with `PAGINATION_LIMIT_EXCEEDED`; partial data is not presented as complete.

## Retry

Retryable categories are transient network failure, explicitly retryable provider 5xx/outage, and rate limiting when retry is permitted. Permission denial, expired/invalid authorization, unavailable account, unsupported request, malformed response, and pagination guards are terminal for the current fetch.

Retries are explicit and bounded by `maxAttempts`, exponential-delay category, maximum delay, and optional bounded provider `retry-after`. The delay function is injected so tests never sleep. Sprint 09 adds no queue, worker, scheduler, or background orchestration.

## Errors and redaction

Stable codes are `AUTH_REQUIRED`, `AUTH_EXPIRED`, `PERMISSION_DENIED`, `ACCOUNT_NOT_FOUND`, `ACCOUNT_SELECTION_REQUIRED`, `PROVIDER_UNAVAILABLE`, `RATE_LIMITED`, `FETCH_FAILED`, `INVALID_PROVIDER_RESPONSE`, and `PAGINATION_LIMIT_EXCEEDED`.

Every surfaced error contains code, provider, explicit retryability, and a safe user message; it may contain a coarse internal cause category and bounded retry delay. Raw exceptions, stacks, response payloads, auth headers, secrets, tokens, URLs/query strings, and sensitive account values do not enter the error contract. The focused redactor handles known dangerous string patterns; structured provider errors are not serialized. Raw diagnostic material, if future controlled diagnostics require it, stays server-local and must never be logged with secrets.

## Transport provenance and canonical convergence

CSV provenance carries `transport: "csv"`, transient ingestion ID, safe filename, source row, and mapping origins. API provenance carries `transport: "api"`, provider, validated external account ID, fetch request ID, date range, and optional safe provider record locator. The canonical observation date must fall inside that range; the locator must not contain control characters, URLs, or token/auth-like material. API observations do not invent filenames, source rows, or CSV mapping origins.

```text
CSV adapter -> provider normalizer -----------+
                                               -> canonical observations -> Data Health -> KPI Engine -> Change Intelligence
API connector -> provider normalizer --------+
```

Normal analytics must not branch on transport. Data Health may inspect transport only to validate the appropriate provenance fields.

## Semantic equivalence

Equivalent CSV/API provider datasets must have equal canonical dates, source, account identity where supplied by both inputs, campaign/group/ad or order semantics, primitive measures, currency, null-versus-zero meaning, and revenue domain. Ordering and transport provenance may differ. Expected differences include CSV filename/row/mapping origin versus API fetch request/record locator. A connector equivalence comparator removes only provenance and is confined to connector test support; ordinary equality assertions remain strict.

Advertising API value remains `attributedRevenue`; it never becomes Shopify `grossRevenue` or report-level commerce revenue.

## No persistence

Connection objects and mock credentials are request/test scoped. Relay does not claim survival across browsers, serverless invocations, deployments, or restarts. Do not store per-user provider credentials in localStorage, browser-visible JavaScript, ordinary cookies, Markdown, source code, or environment variables. Live persisted connections remain blocked on a secure durable server-side persistence design.
