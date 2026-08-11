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
