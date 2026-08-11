# Relay V1 architecture snapshot

## 1. System overview

Relay is a single Next.js application deployed on Vercel. It will accept CSV uploads and future provider connections, normalize both into daily canonical observations, compute deterministic facts, support optional grounded commentary with human review, and render a structured report model to PDF. [ADR-005](../decisions/ADR-005-v1-application-stack.md) selects the application stack; [ADR-006](../decisions/ADR-006-vercel-native-deployment-and-deferred-persistence.md) selects Vercel and defers durable persistence. Sprint 03 has no connected database.

## 2. Architecture diagram

```text
                    VERCEL

             Next.js Application
        +-------------------------+
        |       Frontend UI       |
        |                         |
        |   Route Handlers /      |
        |   Server Functions      |
        +-----------+-------------+
                    |
          +---------+----------+
          |                    |
       CSV data         External APIs
                       Meta / Google /
                          Shopify
          |                    |
          +---------+----------+
                    |
              Normalization
                    |
             Canonical Data
                    |
              KPI Engine
                    |
          Change Intelligence
                    |
               AI Layer
                    |
             Report Model
                    |
                  PDF
```

Durable persistence is deferred. When a feature requires it, server/UI logic will use a persistence boundary that targets a demo/local implementation or a future Postgres-compatible durable database; Sprint 03 does not implement either one.

## 3. Components

- **Web/application service:** client/report workflows, server-side routes, authorization boundary, ingestion orchestration, report composition, and PDF rendering.
- **CSV ingestion adapter:** validates files, identifies a provider, parses/mapping-checks input, and creates a raw dataset representation.
- **Connector adapter:** manages future server-side authorization/session state, account discovery, bounded fetches, pagination/retries, and raw provider results.
- **Provider normalizer:** maps either raw representation to canonical observations, provenance, and structured findings.
- **Data Health and reconciliation:** validates coverage, dates, currency, duplicates, mappings, and commerce-versus-attribution caveats.
- **Analytics and change intelligence:** computes deterministic KPIs, comparisons, movers, and risks from validated canonical data.
- **Report composer/renderer:** assembles the structured report model and renders PDF without recalculating facts.
- **Persistence boundary:** deferred until a real feature needs durable state. It will separate UI/server logic from a demo/local implementation or a future Postgres-compatible durable database; it is not an unused TypeScript abstraction in Sprint 03.
- **LLM provider:** optional draft-commentary dependency after structured facts; it is not an analytical authority.

## 4. Domain model

| Entity | Purpose, ownership, and lifecycle | Key conceptual fields and relationships | Does not contain |
| --- | --- | --- | --- |
| User | Future authenticated workspace owner; active/disabled lifecycle. | Identity; owns clients and access scope. | Client metrics, connector tokens, report facts. |
| Client | Reporting subject owned by one workspace/user in V1. | Display identity, reporting timezone/currency context; has source configurations, rules, targets, periods, and reports. | User credentials or raw provider payloads. |
| SourceConfiguration | A client's saved provider/account/reporting configuration for CSV or connector use. | Provider, selected account/store, mapping version, timezone/currency hints; optionally links DataConnection. | Secret tokens or normalized metrics. |
| DataConnection | Optional server-side connector credential linkage for a source configuration. | Provider, connection status, granted scopes, external account references, revocation state. | CSV mapping, client report content, raw analytics values. |
| Ingestion | One upload or connector-fetch attempt. | Client/source configuration, transport, status, time range, findings, provenance references. | Long-lived report presentation or credential material. |
| RawArtifact | Purpose-limited raw-upload/result reference owned by an ingestion. | Content reference/hash, media type, controlled retention state. | Canonical meaning or report rules. |
| NormalizedObservation | Persisted daily advertising or commerce fact from an ingestion. | Canonical domain, date, dimensions, measures, currency, provenance; belongs to client via source configuration. | Mutable commentary, credentials, PDF layout. |
| ReportingPeriod | Client-defined current/comparison date range. | Start/end dates, timezone, comparison reference, status. | Source payloads or derived facts. |
| ClientRule | Versioned client-specific reporting/methodology rule. | Revenue basis, included sources, report methodology, explanatory context. | Provider credentials or authoritative source values. |
| ClientTarget | Client KPI target attached to a rule/period scope. | Metric, target value/unit, applicability, source context. | Observed evidence or model-generated claims. |
| Report | Versioned report artifact for a client and period. | Input/configuration snapshot, structured report-model snapshot, lifecycle/review/render status. | Mutable raw source payloads or connector tokens. |
| ReportInsight | Human-reviewable commentary item owned by a report. | Draft text, structured fact references, reviewer state, edits/removal reason. | Authoritative KPI values or unbounded raw data. |

Campaign/ad entities are dimensions of normalized advertising observations, not independent V1 entities. Authentication and database-column design are deferred to implementation.

## 5. Data architecture

The canonical model is defined in [DATA_CONTRACT.md](../data/DATA_CONTRACT.md). It uses daily observations, source/entity identity, currency-compatible money, fixed-scale analytics, explicit unavailable values, and ingestion provenance. [ADR-001](../decisions/ADR-001-revenue-semantics.md) prevents commerce revenue from becoming paid-attribution revenue. [ADR-003](../decisions/ADR-003-data-retention-and-persistence.md) sets future retention principles. Sprint 03 has no durable canonical or report store; request processing is transient and must not be presented as persistence.

## 6. Interfaces and boundaries

| Boundary | Contract | Excludes |
| --- | --- | --- |
| CSV ingestion | File validation, source detection, parsing, mapping, raw representation | OAuth/session concerns and analytics logic |
| Connector ingestion | Connection/account/fetch/pagination/retry, raw provider representation | CSV parsing and analytics logic |
| Provider normalizer | Raw representation -> canonical observations, provenance, findings | PDF layout and provider payload exposure downstream |
| Data Health/reconciliation | Canonical observations -> validation/reconciliation findings | Silent repair of unknown/ambiguous data |
| Analytics | Valid canonical data -> deterministic KPIs, changes, movers, risks | Transport/provider-response branching and LLM authority |
| AI commentary | Structured facts/context -> editable draft text with fact references | Authoritative calculations and arbitrary raw-data analysis |
| Report model | Facts/findings/review state -> renderer-neutral report object | PDF-specific layout or metric recalculation |

[ADR-002](../decisions/ADR-002-unified-source-adapter-contract.md) defines the CSV/connector convergence contract. [ADR-004](../decisions/ADR-004-ai-after-deterministic-analysis.md) defines the AI boundary.

## 7. Critical flows

### Flow A: CSV to report

CSV upload -> file/source validation -> mapping confirmation where needed -> raw representation -> provider normalization -> canonical observations -> Data Health/reconciliation -> deterministic analytics -> report facts -> optional draft commentary/review -> report model -> PDF.

### Flow B: Connector to report

Authorized connection/account selection -> bounded provider fetch -> raw result/provenance -> provider normalization -> same canonical, Data Health, analytics, report, and review path as CSV.

### Flow C: Repeat report using saved configuration

This future flow begins only after a feature requires durable client/report state. Client/source configuration, mappings, rules, and targets will be reused for a new reporting period. New ingestion must produce a new canonical snapshot; comparison/report generation must never mutate a prior report snapshot.

### Flow D: AI commentary to human review

Validated structured facts and approved context -> draft commentary with fact references -> reviewer accepts, edits, or removes -> report model stores review state -> PDF uses only the reviewed state.

## 8. Failure handling

| Failure | Behavior |
| --- | --- |
| Malformed CSV | Reject/flag at file or parser boundary; preserve a structured error and controlled raw reference only when permitted. |
| Mapping ambiguity | Stop automatic semantic mapping and request confirmation; Data Health records the ambiguity. |
| Connector unavailable or expired credential | Mark ingestion/connection state, preserve structured/redacted error, allow reconnect/retry; do not fabricate data. |
| Mismatched periods/currencies | Block incompatible aggregate/KPI or issue explicit Data Health warning according to severity. |
| LLM unavailable | Continue with deterministic facts and report model; omit draft commentary and show no invented narrative. |
| PDF rendering failure | Preserve validated report model and render status; permit retry without recomputing or changing facts. |

## 9. Security baseline

Credentials remain server-side, separate from analytics/reporting records, least-privilege, revocable, and absent from logs. Uploads, provider payloads, and AI text are untrusted. Data access is scoped through user-to-client ownership; enterprise RBAC is out of scope. See [CONNECTOR_SECURITY.md](../integrations/CONNECTOR_SECURITY.md) and [SECURITY.md](../../SECURITY.md).

## 10. Observability baseline

Record structured, redacted ingestion status, source/provider, mapping/validation findings, row/observation counts, report lifecycle, render outcome, and connector retry/error category. Do not log credentials, raw secrets, or unnecessary client-sensitive payloads. Track data-quality and report-generation failures separately from product success metrics.

## 11. ADR index

- [ADR-001: Revenue semantics](../decisions/ADR-001-revenue-semantics.md)
- [ADR-002: Unified source adapter contract](../decisions/ADR-002-unified-source-adapter-contract.md)
- [ADR-003: Data retention and persistence](../decisions/ADR-003-data-retention-and-persistence.md)
- [ADR-004: AI after deterministic analysis](../decisions/ADR-004-ai-after-deterministic-analysis.md)
- [ADR-005: V1 application stack](../decisions/ADR-005-v1-application-stack.md)
- [ADR-006: Vercel-native deployment and deferred persistence](../decisions/ADR-006-vercel-native-deployment-and-deferred-persistence.md)

## 12. Sprint 03 implementation implications

Sprint 03 may scaffold, but not implement reporting features:

- **Stack:** Next.js App Router, TypeScript, Node.js 24 LTS, npm, Zod, Vitest, and Playwright Test. Vercel deploys frontend and server-side execution together.
- **Expected layout:** `app/` for routes/UI; `lib/env/` for the server environment boundary; `tests/` for unit/integration/E2E support; existing `docs/` and `fixtures/` remain source-of-truth inputs. Do not create feature or persistence directories before their sprint.
- **Expected base commands after scaffold:** `npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`.
- **Health:** `GET /api/health` returns a non-sensitive deterministic status response; it does not expose credentials, client data, or host details.
- **Environment validation:** server-side code owns the future single environment access boundary. Sprint 03 has no required runtime variables and does not expose server configuration to the browser.
- **Persistence:** no database, Prisma schema, `DATABASE_URL`, migrations, or fake repository abstraction exists in Sprint 03.
- **CI baseline:** install locked dependencies, then lint, typecheck, unit tests, and build. Playwright smoke tests remain runnable locally and can be added to CI when browser-install cost is appropriate; no database-dependent checks exist.

Sprint 03 must not add queues, workers, scheduled sync, additional services, or feature-specific connectors without a new task and evidence-based revisit decision.
