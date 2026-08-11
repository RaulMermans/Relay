# Architecture decisions

Record one durable, cross-cutting decision per `ADR-###-short-title.md`. Each ADR must compare alternatives, reference Relay constraints, state consequences, include revisit triggers, and define a validation path.

## Accepted V1 architecture ADRs

| ADR | Decision |
| --- | --- |
| [ADR-001](ADR-001-revenue-semantics.md) | Separate commerce gross/net revenue from paid-platform attributed revenue. |
| [ADR-002](ADR-002-unified-source-adapter-contract.md) | Keep CSV and connector transport contracts separate; converge at normalization. |
| [ADR-003](ADR-003-data-retention-and-persistence.md) | Persist canonical/report snapshots and purpose-limit raw retention. |
| [ADR-004](ADR-004-ai-after-deterministic-analysis.md) | Generate AI draft commentary only after deterministic structured facts. |
| [ADR-005](ADR-005-v1-application-stack.md) | Use a single Next.js application with PostgreSQL on Railway for V1. |

Implementation details that do not alter these contracts do not need an ADR.
