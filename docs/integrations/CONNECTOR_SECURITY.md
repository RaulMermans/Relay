# Connector security

- Request least privilege and read-only access wherever possible.
- Never commit tokens or secrets; keep credentials separate from analytical and reporting records.
- Never place secrets in logs.
- Disconnect and revoke behavior are required future capabilities.
- Treat external provider input as untrusted.
- Authentication and token implementation are deferred to connector sprints.
