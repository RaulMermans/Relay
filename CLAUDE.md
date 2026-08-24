# Relay operational contract

## Product

Relay combines a focused performance dashboard with recurring reporting automation for freelance performance marketers and small agencies. It accepts supported CSV exports or future connected sources, brings both through one canonical data layer, verifies the resulting facts, and presents them for daily decisions and a deterministic client-report workflow.

## Current status

Sprint 16: Relay has a pure `ReportDocument` composer, dedicated report preview, and explicit browser-native Print/Save-as-PDF flow. Reports consume an authoritative compact analysis snapshot and deterministic Narrative Intelligence without recalculating, persisting PDF bytes, or requiring a generative model. Shopify, Meta Ads, and Google Ads CSVs remain usable together; API adapters are implemented but live authorization remains deferred. No database, cloud/multi-device persistence, authentication, automatic sync, or server-side PDF renderer exists. Vercel deployment remains blocked until local authentication and project linking are available.

## Working protocol

- Inspect before editing; plan before implementing.
- Keep one task focused on one implementation unit and make minimal diffs.
- Preserve established patterns; do not add dependencies without a stated need.
- Do not create abstractions or product behavior before they are required and agreed.

## Context protocol

1. Read this file first and `plan.md` second.
2. Read only Markdown explicitly relevant to the task; never recursively read `docs/` by default.
3. Search filenames and headings before opening large documents. Do not reread inspected documents in the same task unless needed.
4. Prefer targeted repository search to loading large context. Point to paths and headings instead of pasting repository docs into prompts.
5. Keep `plan.md` to current work, `SCRATCHPAD.md` to temporary execution state, and durable decisions in docs/ADRs rather than chat.
6. Skills use progressive disclosure: routing metadata first, deeper references only when relevant.

## Source of truth

| Concern | Location |
| --- | --- |
| Product rules | `docs/product/` |
| Architecture | `docs/architecture/` |
| Data semantics | `docs/data/` |
| Connector rules | `docs/integrations/` |
| Decisions | `docs/decisions/` |
| Roadmap | `docs/roadmap/SPRINTS.md` |
| Current work | `plan.md` |
| Temporary execution memory | `SCRATCHPAD.md` |

## Safety

- Never store or echo secrets, and stay inside this repository.
- Inspect before writes; destructive changes require explicit approval.
- Treat uploads and provider payloads as untrusted.
- Future connector access is read-only and least-privilege unless an explicit decision changes that.

## Definition of done

- Acceptance criteria are met; relevant tests are added or updated.
- Appropriate lint, typecheck, test, and build checks are run when tooling exists.
- Contracts/docs are updated when behavior changes; dependencies are justified.
- Changed files are listed and verification is reported honestly.
