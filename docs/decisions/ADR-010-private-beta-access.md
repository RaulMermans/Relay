# ADR-010: deployment-gated private beta without application accounts

## Status

Accepted for Sprint 17 private beta.

## Context

Relay has no accounts, database, cloud client records, live OAuth, teams, or billing. Browser-local client configuration is not an identity boundary. A browser-only password would not protect server routes and would create misleading security claims.

## Decision

Use Vercel deployment protection with Vercel Authentication for a deliberately small beta, granting access only to invited testers. Do not expose a public production domain unless the selected Vercel plan supports protected production access and it is explicitly configured. Application authentication remains deferred.

## Alternatives

- Public beta without deployment protection: rejected; upload routes could be abused.
- Minimal in-app password: rejected; it is not an authoritative server access boundary.
- Full application authentication: deferred; it requires ownership, session, recovery, and persistence decisions outside V1.

## Consequences and revisit triggers

Testers need authorised Vercel access. The beta does not establish product identities. Revisit before public exposure, live OAuth, durable client data, teams, billing, or when deployment protection cannot gate the intended environment.
