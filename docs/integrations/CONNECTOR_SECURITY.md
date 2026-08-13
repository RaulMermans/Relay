# Connector security architecture

## Authorization and credentials

- OAuth client secrets, access tokens, refresh tokens, and auth headers remain server-side only and outside analytical connection/source/report records.
- A domain connection may contain only an opaque `credentialReference`; Sprint 09 implements no credential store or token mechanics.
- Future authorization must use provider-appropriate CSRF/state protection, exact allowlisted redirect URI validation, short-lived authorization state, and server-side callback validation.
- Request least-privilege read-only reporting scopes. No provider write operations are permitted.
- Support explicit disconnect and provider revocation; revoked credentials must make fetch impossible.

## Account authority

- Discover accounts using the authorized server-side session.
- Validate a selected external ID against the current connection's discovered/allowed accounts before fetch.
- Treat display names as informational and never as authority.
- Enforce the future user -> client -> source ownership boundary before discovery, selection, fetch, disconnect, or revocation.
- Do not trust browser-supplied account IDs, provider, scopes, status, or capability claims.

## Provider input and bounds

Provider responses are untrusted. Validate fetch intent and provider output before canonical normalization. Enforce bounded pages, records, attempts, delays, and retry-after. Repeated tokens, no-progress pages, malformed results, or exceeded limits fail closed; do not fabricate completion or missing values.

## Errors, redaction, and logs

- Surface only stable connector codes, provider, retryability, safe user message, and coarse cause metadata.
- Never expose/log raw provider payloads, tokens, secrets, auth headers, full URLs/query strings, stack traces, or unnecessary account/client details.
- Apply the common focused redaction boundary before any provider error is returned. Do not rely on a giant best-effort sanitizer as permission to log raw material.
- Structured provider error objects are not serialized into connector errors. Any future controlled raw diagnostics remain server-local, access-restricted, retention-bounded, and secret-free.
- Rate-limit logs may contain safe provider/category/attempt metadata, not credentials or raw responses.

## Persistence limitation

Relay has no durable server database or authenticated ownership store. Sprint 09 connections and mock credentials are request/test scoped. Never use localStorage, browser-visible JavaScript, ordinary cookies, Markdown, source code, per-user environment variables, or server memory as fake durable credential storage. A live connector that must survive serverless invocation boundaries remains blocked until secure durable persistence and ownership controls are selected.

Sprint 10 applies that gate to Shopify. The provider adapter accepts a request-scoped server credential only through its constructor and never exposes it through a registry entry, route, domain record, fixture, error, or log. Live Shopify authorization is deferred because current public-app offline access tokens rotate and require durable access/refresh token, expiry, installation, scope, revocation, and owner state. Public activation must also add validated authorization state/HMAC handling and mandatory compliance webhooks; none is simulated by the adapter tests.

Sprint 11 applies the same gate independently to Meta Ads. Meta's current authentication guidance requires secure database storage for access tokens used in later calls plus routine validity, permission, expiry, revocation, and reauthorization handling. The request-scoped adapter receives a server credential only through its constructor, uses bearer headers rather than query parameters, and never exposes the token through registry state, routes, domain records, fixtures, errors, logs, pagination URLs, or analytics. A system-user token is not a general multi-client ownership substitute. Live Meta authorization remains deferred until Relay has an authenticated owner boundary, encrypted durable credential storage, reviewed access, and operated redirect/disconnect/revocation flows.

Sprint 12 applies the gate to Google Ads while keeping its credential classes separate. The developer token is application-level server configuration; OAuth access/refresh tokens and selected customer/manager context belong to a user connection. Google's `adwords` scope is not reporting-only, so Relay's least-privilege boundary is enforced by code: the module exposes only `ListAccessibleCustomers` and GAQL `Search`, never a mutate/upload method. Manager context comes only from server discovery, cannot be supplied by the browser, and is revalidated before each request-scoped fetch. Live Google authorization remains deferred until Relay has authenticated ownership, encrypted durable refresh-token state, revocation/disconnect handling, production callbacks, and approved developer access.

## Uploaded files and analytics

CSV uploads and provider payloads remain untrusted and transient. Provider raw records stop at the connector/provider-normalizer boundary. Canonical observations exclude credentials and raw payloads. Data Health, KPIs, Change Intelligence, reports, and future AI never receive secrets or authorization material.

## Review gate

Every provider connector must verify official current scopes/API behavior, read-only design, authorization state/redirect handling, account ownership validation, credential isolation, error/log redaction, pagination/retry bounds, disconnect/revocation behavior, canonical revenue semantics, and CSV/API semantic equivalence before activation.
