# Security policy

- Never commit secrets. `.env` is ignored, and `.env.example` contains names/comments only.
- Treat user-uploaded files, external API payloads, and AI output as untrusted until validated.
- Use least-privilege connector access and minimize sensitive client data.
- Keep credentials separate from analytical and reporting records; do not expose them in logs.
- Review destructive operations before execution.
- Document vulnerabilities and mitigations rather than silently working around them.
