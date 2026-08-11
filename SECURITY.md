# Security policy

- Never commit secrets. `.env` is ignored, and `.env.example` contains names/comments only.
- Treat user-uploaded files, external API payloads, and AI output as untrusted until validated.
- Use least-privilege connector access and minimize sensitive client data.
- Keep credentials separate from analytical and reporting records; do not expose them in logs.
- Keep connector tokens server-side, least-privilege, revocable, and outside client-visible analytics/reporting records.
- Apply user-to-client ownership boundaries before reading or changing client data; enterprise RBAC is not a V1 requirement.
- Validate untrusted uploads for size/type/filename/parser safety and account for CSV-injection risk before downstream processing.
- Review destructive operations before execution.
- Document vulnerabilities and mitigations rather than silently working around them.
