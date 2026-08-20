# Architecture decisions

Record one durable, cross-cutting decision per `ADR-###-short-title.md`. Each ADR must compare alternatives, reference Relay constraints, state consequences, include revisit triggers, and define a validation path.

## Accepted V1 architecture ADRs

| ADR | Decision |
| --- | --- |
| [ADR-001](ADR-001-revenue-semantics.md) | Separate commerce gross/net revenue from paid-platform attributed revenue. |
| [ADR-002](ADR-002-unified-source-adapter-contract.md) | Keep CSV and connector transport contracts separate; converge at normalization. |
| [ADR-003](ADR-003-data-retention-and-persistence.md) | Persist canonical/report snapshots and purpose-limit raw retention. |
| [ADR-004](ADR-004-deterministic-narrative-intelligence.md) | Generate deterministic evidence-backed narrative from structured facts. |
| [ADR-005](ADR-005-v1-application-stack.md) | Use a single Next.js application; deployment and immediate persistence are superseded by ADR-006. |
| [ADR-006](ADR-006-vercel-native-deployment-and-deferred-persistence.md) | Deploy one Next.js application on Vercel and defer durable persistence until a real feature requires it. |

Implementation details that do not alter these contracts do not need an ADR.
