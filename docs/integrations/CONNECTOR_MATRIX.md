# Connector matrix

| Provider | CSV | Generic framework | Provider connector | Configuration/live status | Data role |
| --- | --- | --- | --- | --- | --- |
| Shopify | implemented, fixture-backed | ready | API adapter implemented | live auth deferred: durable credential/ownership storage required | commerce source of truth |
| Meta Ads | implemented, fixture-backed | ready | API adapter implemented | live auth deferred: durable credential/ownership storage and reviewed production access required | paid-media attribution |
| Google Ads | implemented, fixture-backed | ready | API adapter implemented | live auth deferred: durable credential/ownership storage and approved developer-token access required | paid-media attribution |

`framework ready` means provider-neutral lifecycle, accounts, fetch, pagination, retry, errors, provenance, and mock equivalence contracts are implemented and tested. It does not mean OAuth, real account discovery, API fetching, provider configuration, or durable connection state exists.

`Shopify API adapter implemented` means the GraphQL Admin API 2026-07 query, validation, store discovery, bounded cursor fetch, error mapping, and canonical normalizer are exercised against labelled synthetic provider-shaped fixtures. It does not mean Relay has installed a Shopify app, stored a token, contacted a real store, or enabled a live connection.

`Meta Ads API adapter implemented` means Marketing API v26.0 account discovery, minimal synchronous daily Ads Insights fetching, cursor pagination, bounded retry/error mapping, purchase-only normalization, and CSV/API semantic equivalence are exercised against labelled synthetic provider-shaped fixtures. It does not mean Relay has a Meta app approval, stored a token, contacted an ad account, or enabled a live connection.

`Google Ads API adapter implemented` means Google Ads API v25 accessible-customer and manager-hierarchy discovery, server-validated reporting-customer selection, minimal daily ad-group GAQL Search, fixed page-token pagination, cost-micros conversion, bounded retry/error mapping, and CSV/API semantic equivalence are exercised against labelled synthetic provider-shaped fixtures. It does not mean Relay has an approved developer token, stored an OAuth refresh token, contacted a Google Ads account, or enabled a live connection.

Sprint 13 exposes one CSV source slot per provider in the transient workspace. The product UI says **CSV available · API connection unavailable** and provides no Connect action. The three implemented adapters remain production-shaped, test-injected code only; automatic refresh and durable connection state are not implied.
