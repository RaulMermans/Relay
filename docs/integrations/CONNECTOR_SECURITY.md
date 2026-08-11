# Connector security architecture

## Credentials

- Connector tokens remain server-side and never enter client-visible analytics/reporting records.
- Tokens, refresh material, and raw secrets are never logged or stored in Markdown.
- Connections request least-privilege, read-only scopes and support disconnect/revocation.
- Credential material is separate from source configuration, normalized observations, reports, and report insights.

## Uploaded files and provider input

Uploads and provider payloads are untrusted. Sprint 03 must add size limits, type validation, safe filename handling, parser-failure handling, and CSV-injection awareness. Inputs are validated before normalization; malformed or ambiguous input yields structured findings rather than guessed values.

## AI and logs

Generated text is untrusted until reviewed. Logs may retain redacted lifecycle/error metadata, but never tokens, raw secrets, or unnecessary client-sensitive data.

## Data access

The future ownership boundary is user -> client -> source configuration/ingestion/report. Access controls must enforce that boundary before client data is read or changed. Enterprise RBAC is out of scope; the V1 requirement is isolation between user-owned client records.

## Implementation boundary

Authentication and token mechanics are deferred to connector/application sprints. Their implementation must satisfy this architecture and [ADR-003](../decisions/ADR-003-data-retention-and-persistence.md).
