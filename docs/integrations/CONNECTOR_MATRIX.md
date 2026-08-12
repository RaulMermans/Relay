# Connector matrix

| Provider | CSV | Generic framework | Provider connector | Configuration/live status | Data role |
| --- | --- | --- | --- | --- | --- |
| Shopify | fixture-backed | ready | not built | unavailable | commerce source of truth |
| Meta Ads | fixture-backed | ready | not built | unavailable | paid-media attribution |
| Google Ads | fixture-backed | ready | not built | unavailable | paid-media attribution |

`framework ready` means provider-neutral lifecycle, accounts, fetch, pagination, retry, errors, provenance, and mock equivalence contracts are implemented and tested. It does not mean OAuth, real account discovery, API fetching, provider configuration, or durable connection state exists.
