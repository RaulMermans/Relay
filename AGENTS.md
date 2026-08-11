# Agent guidance

Start by reading `CLAUDE.md`, then `plan.md`, then use filename/heading search to locate only the contracts governing the task. Orient with `git status` and inspect relevant code before changing it.

Work in this order: inspect -> plan -> implement -> verify. Keep a small change budget: make the smallest coherent change, preserve local conventions, and avoid broad refactors or dependency sprawl.

Do not silently alter data semantics, reconciliation behavior, or provider meaning. Propose an ADR for cross-cutting architecture changes. Never claim a command or test ran unless its output was observed. Record durable decisions in `docs/decisions/`, not in chat or temporary notes.
