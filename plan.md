# Sprint 02 - Architecture + Data Semantics

### T-020 Canonical Data Semantics

**Outcome:** Define daily, provenance-preserving canonical advertising and commerce observations.

**Relevant docs:** `docs/data/DATA_CONTRACT.md`, `docs/data/KPI_DEFINITIONS.md`.

**Acceptance criteria:** Optionality, currency, precision, null/zero, identifiers, names, and source provenance are explicit; revenue is not ambiguous.

**Status:** Complete.

### T-021 Revenue Semantics ADR

**Outcome:** Decide permitted representation and KPI use of commerce versus paid-attribution revenue.

**Relevant docs:** `docs/decisions/ADR-001-revenue-semantics.md`, `docs/data/KPI_DEFINITIONS.md`.

**Acceptance criteria:** ROAS, MER, reconciliation, overlap, and no-authoritative-cross-platform-sum rules are explicit.

**Status:** Complete.

### T-022 Core Domain Model

**Outcome:** Define V1 entity ownership, lifecycle, relationships, and exclusions.

**Relevant docs:** `docs/architecture/ARCHITECTURE.md`.

**Acceptance criteria:** Every chosen entity is V1-justified without database-column design.

**Status:** Complete.

### T-023 Ingestion Architecture

**Outcome:** Define CSV, connector, and shared downstream convergence boundaries.

**Relevant docs:** `docs/architecture/ARCHITECTURE.md`, `docs/architecture/DATA_FLOW.md`.

**Acceptance criteria:** Analytics is transport/provider-payload agnostic after normalization.

**Status:** Complete.

### T-024 Source Adapter ADR

**Outcome:** Decide the semantic source-adapter contract.

**Relevant docs:** `docs/decisions/ADR-002-unified-source-adapter-contract.md`, `docs/integrations/CONNECTOR_CONTRACT.md`.

**Acceptance criteria:** CSV/API convergence, structured errors, provenance, and revisit triggers are documented without code interfaces.

**Status:** Complete.

### T-025 Data Persistence ADR

**Outcome:** Decide raw-retention and canonical/report persistence strategy.

**Relevant docs:** `docs/decisions/ADR-003-data-retention-and-persistence.md`.

**Acceptance criteria:** Privacy, reproducibility, debugging, and retention principles are explicit without arbitrary policies.

**Status:** Complete.

### T-026 Report Model

**Outcome:** Define the renderer-neutral structured report boundary.

**Relevant docs:** `docs/architecture/REPORT_MODEL.md`, `docs/architecture/ARCHITECTURE.md`.

**Acceptance criteria:** Facts, health, insights, review, methodology, and PDF boundary are structured and AI is not arbitrary report HTML.

**Status:** Complete.

### T-027 AI Boundary ADR

**Outcome:** Formalize deterministic analysis before AI commentary.

**Relevant docs:** `docs/decisions/ADR-004-ai-after-deterministic-analysis.md`.

**Acceptance criteria:** Allowed inputs, suggestion-only output, grounding, review, and validation path are explicit.

**Status:** Complete.

### T-028 Stack Evaluation

**Outcome:** Compare single-application and split-service options against V1 needs.

**Relevant docs:** `docs/decisions/ADR-005-v1-application-stack.md`.

**Acceptance criteria:** Speed, connectors, CSV, PDF, testing, Railway operations, future sync, and maintainability are considered.

**Status:** Complete.

### T-029 Stack ADR

**Outcome:** Select the V1 implementation stack.

**Relevant docs:** `docs/decisions/ADR-005-v1-application-stack.md`, `docs/architecture/ARCHITECTURE.md`.

**Acceptance criteria:** One stack, alternatives, consequences, revisit triggers, and validation plan are documented without installation.

**Status:** Complete.

### T-030 Deployment Architecture

**Outcome:** Define minimal Railway topology and deployment expectations.

**Relevant docs:** `docs/operations/DEPLOYMENT.md`.

**Acceptance criteria:** One application service plus PostgreSQL, health, migration, rollback, logging, and future-service triggers are explicit.

**Status:** Complete.

### T-031 Security Architecture

**Outcome:** Define credential, upload, AI, logging, and data-access boundaries.

**Relevant docs:** `docs/integrations/CONNECTOR_SECURITY.md`, `SECURITY.md`, `docs/architecture/ARCHITECTURE.md`.

**Acceptance criteria:** Least privilege, server-side credentials, untrusted input/output, and user-to-client ownership are explicit.

**Status:** Complete.

### T-032 Test Architecture

**Outcome:** Define deterministic testing layers and connector equivalence coverage.

**Relevant docs:** `docs/qa/TEST_STRATEGY.md`, `docs/architecture/DATA_FLOW.md`.

**Acceptance criteria:** Unit, integration, contract, E2E, regression, fixtures, tooling, and CI expectations are explicit.

**Status:** Complete.

### T-033 Architecture Snapshot

**Outcome:** Finalize the executable V1 architecture snapshot.

**Relevant docs:** `docs/architecture/ARCHITECTURE.md`, `docs/decisions/README.md`.

**Acceptance criteria:** Components, entities, flows, failure handling, security, observability, ADR index, and Sprint 03 implications agree.

**Status:** Complete.

### T-034 Data Flow

**Outcome:** Define validation responsibilities and failure behavior at every data boundary.

**Relevant docs:** `docs/architecture/DATA_FLOW.md`.

**Acceptance criteria:** External source through renderer is explicit and CSV/API converge before analytics.

**Status:** Complete.

### T-035 Sprint 03 Handoff

**Outcome:** Define the bounded application foundation Sprint 03 may scaffold.

**Relevant docs:** `docs/architecture/ARCHITECTURE.md`, `docs/operations/DEPLOYMENT.md`, `docs/qa/TEST_STRATEGY.md`.

**Acceptance criteria:** Stack, layout, package manager, runtime, persistence, validation/tests, commands, health, environment validation, and CI baseline are explicit.

**Status:** Complete.
