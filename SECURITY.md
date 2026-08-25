# Security policy

## Supported status and reporting

Relay V1 is a protected private beta, not a public multi-tenant service. Report suspected vulnerabilities privately: use GitHub's **Report a vulnerability** flow for this repository when it is available, or contact [@RaulMermans](https://github.com/RaulMermans) privately with a minimal redacted reproduction. Do not open a public issue with exploit steps, production URLs containing access parameters, source exports, client data, cookies, credentials, or tokens.

Relay's current security boundary is intentionally limited. A report that would require public access, durable client storage, live OAuth, or application identity should be treated as a product-scope decision as well as a security finding.

- Never commit secrets. `.env` is ignored, and `.env.example` contains names/comments only.
- Treat user-uploaded files and external API payloads as untrusted until validated.
- Use least-privilege connector access and minimize sensitive client data.
- Keep credentials separate from analytical and reporting records; do not expose them in logs.
- Keep connector tokens server-side, least-privilege, revocable, and outside client-visible analytics/reporting records.
- Apply user-to-client ownership boundaries before reading or changing client data; enterprise RBAC is not a V1 requirement.
- Validate untrusted uploads for size/type/filename/parser safety and account for CSV-injection risk before downstream processing.
- Review destructive operations before execution.
- Document vulnerabilities and mitigations rather than silently working around them.

## Browser-local product memory

- Relay stores one versioned, Zod-validated, size-bounded `relay.memory.v1` document through a centralized persistence boundary.
- Allowed data is limited to local client identity/configuration, exact provider-header mapping decisions, existing-contract targets, fixed source-of-truth rules, bounded notes/preferences, compact structured dashboard snapshots, cycle summaries, and local workflow counters.
- Raw CSV content, filenames, parsed/canonical observation arrays, provider payloads, customer PII, credentials, tokens, authorization headers, and provider secrets are excluded from the schema and must never enter browser storage.
- Stored JSON is untrusted. Loads and saves reject unknown schema fields, unsupported versions, oversized documents, dangerous prototype keys, invalid client references, and over-limit collections. React renders stored text with normal escaping; no raw HTML rendering is used.
- Client deletion removes that client's configuration, snapshot, and history. Reset removes only Relay's namespaced key. Browser storage provides no encryption, authenticated ownership, cross-device sync, or credential security, so live OAuth remains deferred.

## Report export

- The report composer accepts compact snapshot facts and deterministic narrative only; raw CSVs, canonical rows, provider payloads, credentials, arbitrary HTML, and PDF bytes are excluded.
- React escapes report text normally. Browser print receives no server file path or serialized report URL.
- The suggested filename is bounded and normalized to an ASCII slug, preventing path separator and control-character use.
- A stale preview cannot invoke the print boundary; it must be explicitly recomposed from the newer analysis snapshot. Relay has no PDF blob, download, server-renderer, or arbitrary-file export path.
