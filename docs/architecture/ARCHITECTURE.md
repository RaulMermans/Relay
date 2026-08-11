# Conceptual architecture

```text
CSV ingestion ------+
                    +-> Raw dataset -> Source adapter -> Canonical dataset
Connector ingestion -+                                      |
                                                             v
Validation / reconciliation -> KPI engine -> Change intelligence
                                             -> Narrative layer -> Human review
                                             -> Structured report model -> PDF
```

## Hard principles

1. CSV and connector ingestion share downstream logic.
2. Platform-attributed revenue and commerce/store revenue are not automatically interchangeable.
3. KPI calculations are deterministic.
4. LLMs receive computed facts; they do not calculate KPIs or mutate source numbers.
5. Connector permissions should be read-only and least privilege.
6. Provider details remain behind source adapters.
7. Report generation should eventually consume a structured report model.

Implementation stack choices are **to be formally locked in Sprint 02**, not decided here.

## Sprint 02 decision inputs

Sprint 01 does not resolve the following decisions. Sprint 02 should evaluate application stack, deployment model, canonical marketing schema, commerce versus attributed-revenue representation, normalized-data persistence, raw-upload retention, client/report entities, CSV adapter contract, connector adapter contract, connection credential storage, sync/fetch model, report JSON model, LLM service boundary, and test architecture.

### Highest-risk questions from Sprint 01

- How can the canonical model preserve provenance and the distinction between commerce truth and platform attribution while still supporting report-level comparisons?
- What raw-data retention and normalized-data persistence model permits reproducible reports without retaining unnecessary client-sensitive inputs?
- How should CSV and connector adapters converge so equivalent provider data has the same semantics?
- Which client-specific rules belong in structured report memory, and which remain human context?
- How can credential storage and fetch/sync behavior stay least-privilege, observable, and recoverable?
- Where is the boundary between deterministic facts, report JSON, LLM narration, and the test suite that verifies them?
