# Agent guidance

Start by reading `CLAUDE.md`, then `plan.md`, then use filename/heading search to locate only the contracts governing the task. Orient with `git status` and inspect relevant code before changing it.

Work in this order: inspect -> plan -> implement -> verify. Keep a small change budget: make the smallest coherent change, preserve local conventions, and avoid broad refactors or dependency sprawl.

Do not silently alter data semantics, reconciliation behavior, or provider meaning. Propose an ADR for cross-cutting architecture changes. Never claim a command or test ran unless its output was observed. Record durable decisions in `docs/decisions/`, not in chat or temporary notes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
