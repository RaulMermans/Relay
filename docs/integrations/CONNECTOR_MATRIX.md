# Connector matrix

| Provider | CSV | Generic framework | Provider connector | Configuration/live status | Data role |
| --- | --- | --- | --- | --- | --- |
| Shopify | implemented, fixture-backed | ready | API adapter implemented | live auth deferred: durable credential/ownership storage required | commerce source of truth |
| Meta Ads | fixture-backed | ready | not built | unavailable | paid-media attribution |
| Google Ads | fixture-backed | ready | not built | unavailable | paid-media attribution |

`framework ready` means provider-neutral lifecycle, accounts, fetch, pagination, retry, errors, provenance, and mock equivalence contracts are implemented and tested. It does not mean OAuth, real account discovery, API fetching, provider configuration, or durable connection state exists.

`Shopify API adapter implemented` means the GraphQL Admin API 2026-07 query, validation, store discovery, bounded cursor fetch, error mapping, and canonical normalizer are exercised against labelled synthetic provider-shaped fixtures. It does not mean Relay has installed a Shopify app, stored a token, contacted a real store, or enabled a live connection.
