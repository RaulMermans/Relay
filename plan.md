# Sprint 18 — Vercel Production + Project Closure

| Task | Outcome | Status |
| --- | --- | --- |
| T-583 | Verified Sprint 17 closure merged into authoritative `main` (`e8aff94`) | Complete |
| T-584–586 | Vercel project, access model, and READY production deployment recorded | Complete |
| T-587–593 | Health, synthetic semantic/persistence/report/PDF, cross-browser/mobile, and runtime-log evidence recorded | Complete |
| T-594 | Known-good rollback deployment and procedure recorded | Complete |
| T-595 | Known limitations reviewed and retained | Complete |
| T-596–597 | Case-study README and architecture documentation | Complete |
| T-598 | Synthetic production screenshots | Partial — onboarding/data-preparation captured; dashboard/report recapture blocked by browser upload automation |
| T-599 | Repository hygiene audit | Complete — no tracked build/test/OS artifacts found |
| T-600 | GitHub hygiene | In progress — README/SECURITY complete; license still required |
| T-601 | License decision | Blocked — maintainer must choose a license |
| T-602 | Public security disclosure | Complete |
| T-603 | Architecture invariant verification | Complete — covered by the release suites and semantic smoke |
| T-604 | Final release verification | Complete — all required commands passed |
| T-605 | Release tag/version | Pending — package remains private `0.1.0`; no version policy supports a tag yet |
| T-606–609 | Release notes, case-study material, metrics status, and Vercel documentation | Complete |
| T-610 | Final independent review | Complete — no P0/P1 finding |
| T-611–613 | Closure checklist, release commit, and `RELAY_V1_COMPLETE` | Pending |

## Guardrails

- Relay stays a protected Vercel private beta; no public-access, rate-limit, authentication, database, OAuth, storage, or generative-AI work is introduced in this sprint.
- Only synthetic data may be used for production smoke screenshots.
- Do not add a repository license until the maintainer explicitly selects one.
