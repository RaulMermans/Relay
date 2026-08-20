# ADR-007: Demo persistence and future database boundary

## Status

Accepted for Sprint 14 browser-local product memory.

## Context

Relay now needs recurring client configuration and compact dashboard-cycle memory, but it has no production database, authentication, shared ownership model, or secure durable credential store. Sprint 14 intentionally excludes raw uploads and canonical observation datasets, so the retained data is small structured configuration plus bounded derived summaries.

The evaluated options are:

- **localStorage:** zero dependency, synchronous, simple to validate and migrate, and sufficient for bounded configuration and compact snapshots; limited to one browser/device and inappropriate for large or sensitive data.
- **IndexedDB:** supports larger structured datasets and asynchronous access, but adds migration, testing, and browser-state complexity that the deliberately compact Sprint 14 data does not require.
- **External free database:** could enable shared/cloud state, but would introduce operations, ownership, authentication, and data-governance questions the product owner has explicitly deferred. A free tier does not remove those architectural obligations.

## Decision

Use one namespaced `localStorage` document behind a small `RelayMemoryStore` boundary. The document is versioned, validated with Zod on every load, bounded before save, and replaceable by a future server-side implementation. Product components do not access `localStorage` directly.

Browser-local memory may contain:

- client identity and timestamps;
- expected source and preferred CSV transport configuration;
- bounded provider/header/canonical mapping decisions;
- existing-contract KPI targets;
- fixed source-of-truth rules and bounded attribution notes;
- reporting cadence and section preferences;
- one compact authoritative dashboard snapshot per client;
- bounded report-cycle summary history and safe local workflow counters/timestamps.

Browser-local memory must not contain:

- raw CSV content, parsed rows, filenames, or uploaded `File` objects;
- canonical observation arrays or provider raw payloads;
- OAuth access/refresh tokens, authorization headers, provider secrets, credentials, or sensitive authentication state;
- unbounded arbitrary blobs or report/PDF artifacts.

No demo client is seeded automatically. A first-time user creates an explicitly named local client, avoiding fake performance data that could be mistaken for real analysis.

## Limits and user-visible truth

Memory belongs to this browser. Clearing site data removes it, another device cannot see it, and Relay performs no background refresh or cloud synchronization. Source freshness reflects the last manually supplied CSV data. The implementation caps clients at 50, history at 52 cycles per client, existing-contract targets at 10, mapping decisions at 128, attribution notes at 20, and the serialized Relay document at 2,000,000 characters.

## Future migration path

```text
Product logic
    -> RelayMemoryStore
    -> LocalBrowserMemory (Sprint 14)

Future authenticated product
    -> server/API boundary
    -> PostgresMemoryStore
```

The future implementation may preserve conceptual client/configuration/snapshot contracts while adding authenticated ownership, server validation, transactions, retention, and database migrations. It must not upload an existing browser document automatically or treat browser IDs as authenticated ownership. Credential storage remains a separate server-side security boundary.

ADR-007 refines ADR-006 now that a real local-memory feature exists; it does not supersede ADR-006's Vercel or deferred production-database decision.

## Revisit triggers

Revisit this decision before Relay supports multiple devices, multiple users, shared agency clients, real authentication, durable OAuth connections, scheduled refresh, cloud report history, or a production beta requiring server-owned durability.

## Consequences

Relay gains a useful return workflow with no runtime dependency or infrastructure cost. Local parsing remains synchronous but bounded. Browser storage is untrusted and recoverable through a Relay-only reset. If storage is unavailable, the current product session continues ephemerally with a visible warning. Cloud persistence, shared ownership, durable credentials, and automatic synchronization remain unavailable and must not be implied.
