# ADR-003: Data retention and persistence

## Status

Accepted for V1 architecture.

## Context

Relay needs report history, reproducibility, debugging, and connector-equivalence testing while minimizing retention of sensitive uploads and provider payloads. Raw data is useful for diagnosis but is not the analytical source of truth after normalization.

## Options considered

### Option A: Parse and discard all raw inputs

Minimizes retained sensitive data but weakens failed-ingestion diagnosis, mapping support, and fixture-based reproducibility.

### Option B: Temporarily retain purpose-limited raw artifacts and persist canonical data

Retains raw inputs only while needed for ingestion finalization, explicit support/audit investigation, or user-approved troubleshooting. Persists canonical daily observations, ingestion metadata/provenance, rule snapshots, and structured report-model snapshots.

### Option C: Persist all raw artifacts and provider responses indefinitely

Improves forensic access but has disproportionate privacy, storage, and breach exposure for V1.

## Decision

Adopt Option B.

- CSV uploads may be temporarily retained as encrypted raw artifacts only for their declared ingestion/debugging purpose; deletion is triggered by completion of that purpose, user deletion/revocation, or a future documented retention policy. No arbitrary day count is set in this ADR.
- Raw API responses are not persisted by default. Persist redacted request/response metadata, response hashes, pagination references, and structured errors; transient payload retention requires an explicit debugging need.
- Persist validated canonical daily observations, ingestion/provenance metadata, saved mappings/configuration, client rules/targets, and structured report-model snapshots for V1 report history and reproducibility.
- Canonical data and report snapshots, not raw payloads, are the V1 basis for re-rendering/auditing a report.

## Consequences

V1 supports repeat reporting and report history without treating full raw payload storage as a default. Support tooling must work with provenance, hashes, mapping versions, and controlled raw-artifact access. Storage encryption, deletion mechanics, and authorization enforcement are Sprint 03 implementation requirements.

## Revisit triggers

Revisit when empirical debugging/audit needs show temporary retention is insufficient, when a provider requires response replay for correctness, or when upload size/format requires object storage with comparable controls.

## Validation path

Exercise a report re-render from persisted canonical observations and report snapshot after raw-artifact deletion. Verify user deletion/revocation removes controlled raw artifacts and that API fixtures can establish connector/CSV equivalence without retaining production payloads.
