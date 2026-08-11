# Conceptual data flow

1. Receive a CSV export or connector response as a raw dataset, preserving source identity and reporting-period context.
2. Detect the source, map known fields, and ask for confirmation where mapping is ambiguous.
3. Normalize through a source adapter into canonical advertising or commerce semantics.
4. Validate required fields, dates, currencies, duplicates, and source coverage at the canonical boundary.
5. Reconcile compatible datasets while retaining the distinction between advertising attribution and commerce truth.
6. Compute deterministic KPIs and period comparisons from validated canonical data.
7. Derive bounded change facts and risks; a narrative layer may express only those verified facts.
8. Route the structured report model through human review before PDF rendering.

Validation boundaries exist at intake (file/provider trust), mapping (unknown or ambiguous fields), canonicalization (type/semantic integrity), reconciliation (cross-source comparability), KPI calculation (inputs/edge cases), and pre-report review (narrative/report consistency).
