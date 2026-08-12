# Sprint 09 - Generic Connector Framework

| Task | Outcome | Relevant files/docs | Acceptance criteria | Status |
| --- | --- | --- | --- | --- |
| T-188 Transport Contract | Lock the provider-neutral connector transport boundary. | `docs/integrations/CONNECTOR_CONTRACT.md` | Connector responsibilities and analytics exclusions are explicit. | Complete |
| T-189 Lifecycle | Define deterministic connection states and transitions. | Connector contract, `lib/connectors/lifecycle.ts` | Every state defines transitions, fetch eligibility, and user action. | Complete |
| T-190 Connection Model | Define a credential-free connection record. | Connector contract, `lib/connectors/types.ts` | Raw tokens are impossible domain fields; any credential reference is opaque. | Complete |
| T-191 Capabilities | Define small read-only reporting capabilities. | Connector contract, connector types | Only discovery/fetch/date-range/pagination capabilities exist. | Complete |
| T-192 Account Discovery | Define provider-neutral external accounts. | Connector contract, connector types | Common useful metadata is optional and discovery errors are structured. | Complete |
| T-193 Account Selection | Validate selected provider account identity. | Connector types/helpers, unit tests | Exactly one provider ID is checked against discovered accounts server-side. | Complete |
| T-194 Fetch Request | Define bounded daily reporting intent. | Connector contract, connector schemas | Provider, account, valid date range, and `daily` grain are accepted. | Complete |
| T-195 Fetch Result | Define provider-bound raw fetch output. | Connector contract, connector types | Pages, records, warnings, account, date range, and provenance are explicit. | Complete |
| T-196 Pagination Contract | Define provider-neutral pagination and limits. | Connector contract, `lib/connectors/pagination.ts` | Provider cursors remain internal and guardrails prevent runaway fetches. | Complete |
| T-197 Retry Model | Define bounded retry categories and policy. | Connector contract, `lib/connectors/retry.ts` | Only explicit retryable failures retry; attempts and delay are bounded/testable. | Complete |
| T-198 Connector Errors | Define stable safe connector errors. | `lib/connectors/errors.ts`, connector contract | Codes, provider, retryability, safe message, and cause category are structured. | Complete |
| T-199 Error Redaction | Add a focused provider-error redaction boundary. | Connector errors, unit tests | Known tokens, headers, URLs, payloads, and sensitive account data do not escape. | Complete |
| T-200 Transport Provenance | Add API-specific canonical provenance. | `lib/normalization/types.ts`, Data Health provenance check | API uses account/fetch/date/record locators without fake CSV fields. | Complete |
| T-201 Canonical Convergence | Keep one canonical downstream contract. | Data/architecture docs, integration tests | Data Health, KPIs, and Change Intelligence need no normal transport branch. | Complete |
| T-202 Semantic Equivalence | Define CSV/API business-semantic equality. | Data/connector contracts, QA docs | Transport-only provenance differs while canonical values/nulls/currency remain equal. | Complete |
| T-203 Connector Types | Implement minimal connector contracts and schemas. | `lib/connectors/types.ts` | Untrusted requests validate with Zod and contracts stay provider-neutral. | Complete |
| T-204 Connector Interface | Define the smallest connector behavior. | `lib/connectors/types.ts` | Status, account discovery, and fetch are explicit; OAuth stays separate. | Complete |
| T-205 Mock Harness | Build a test-only connector harness. | `tests/support/connectors/` | Ready, discovery, selection, pagination, retryable, and terminal cases are deterministic. | Complete |
| T-206 Pagination Helper | Implement generic page coordination. | `lib/connectors/pagination.ts`, unit tests | Completion, maximums, repeated-token, and no-progress cases are enforced. | Complete |
| T-207 Retry Helper | Implement bounded injected-delay retry. | `lib/connectors/retry.ts`, unit tests | No real sleeps or retry of terminal failures occurs. | Complete |
| T-208 Registry | Describe planned providers truthfully. | `lib/connectors/registry.ts` | Providers are framework-known but explicitly not implemented/configured. | Complete |
| T-209 Readiness | Separate existence, configuration, connection, and fetch readiness. | `lib/connectors/readiness.ts`, unit tests | Fetch is allowed only in `ready` with selection and required capability. | Complete |
| T-210 No-Persistence Behavior | State request/test scope honestly. | Connector contract, architecture docs, tests | No browser/server-memory/token persistence is implemented or claimed. | Complete |
| T-211 Security | Strengthen connector security rules. | `docs/integrations/CONNECTOR_SECURITY.md` | Least privilege, OAuth state/redirect, ownership, redaction, revocation, and no writes are explicit. | Complete |
| T-212 Equivalence Fixtures | Add synthetic mock API equivalents. | `fixtures/connectors/mock/` | Fixtures represent existing canonical facts without real-provider compatibility claims. | Complete |
| T-213 Semantic Comparator | Compare only canonical business semantics. | `tests/support/connectors/semantic-equivalence.ts`, tests | Spend, attribution, null/zero, and currency mismatches fail. | Complete |
| T-214 Unit Tests | Cover all generic connector boundaries. | `tests/unit/connectors*.test.ts` | Deterministic lifecycle, schemas, guards, errors, provenance, readiness, and equivalence pass. | Complete |
| T-215 Integration Tests | Prove mock connector through normalization. | `tests/integration/connector-framework.test.ts` | Discovery/selection/fetch/normalize equivalence and failure guards pass without network. | Complete |
| T-216 UI Shell | Keep the UI truthful and minimal. | Existing UI, connector docs | No fake connected state or inert OAuth control is added; omission is documented. | Complete |
| T-217 Connector Skill | Add focused future connector guidance. | `.agents/skills/connector-implementation/SKILL.md` | Progressive workflow enforces read-only, secrets, convergence, current provider docs, and scoped reading. | Complete |
| T-218 Documentation | Align all capability and deferral claims. | Connector/data/architecture/QA docs, `README.md`, `CHANGELOG.md` | Framework readiness is distinguished from live providers/OAuth/persistence. | Complete |
| T-219 Security/Architecture Review | Review trust and semantic boundaries. | Review skills and Sprint diff | No P0/P1 secret, authority, persistence, payload, or semantic finding remains. | Complete |
| T-220 Verification | Run the complete required ladder and exclusions. | Repository commands | Install, lint, typecheck, tests, build, E2E, diff, security, and scope checks are observed. | Complete |
| T-221 Sprint 10 Handoff | Prepare only the Shopify connector boundary. | `SCRATCHPAD.md`, roadmap context | Exact next task preserves secure-persistence uncertainty and does not begin Sprint 10. | Complete |
