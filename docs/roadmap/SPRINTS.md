# Relay roadmap

Each sprint is expanded only when it becomes current.

| Sprint | Objective | Major deliverables | Exit gate |
| --- | --- | --- | --- |
| 00 - Project Operating System | Establish working conventions | Repository contracts, skills, Git baseline | Structure verified and committed |
| 01 - Product Contract + Validation Design | Validate product problem and outcomes | Product contract, research/validation design | Testable product assumptions agreed |
| 02 - Architecture + Data Semantics | Make foundational decisions | ADRs, canonical semantics, architecture | Decisions formally reviewed |
| 03 - Application Scaffold | Create minimal runnable foundation | App skeleton and developer workflow | Scaffold verified |
| 04 - CSV Ingestion | Accept initial source exports | CSV intake and raw datasets | Supported uploads parse reliably |
| 05 - Mapping + Normalization | Canonicalize source fields | Mapping and normalized data | Known exports normalize consistently |
| 06 - Data Health + Reconciliation | Surface data reliability | Validation and reconciliation | Data issues are actionable |
| 07 - KPI Engine | Compute trusted metrics | Deterministic KPI layer | KPI fixtures pass |
| 08 - Change Intelligence | Identify material movement | Comparison and risk logic | Change facts are explainable |
| 09 - Generic Connector Framework | Standardize provider access | Adapter framework | Connector contract proven |
| 10 - Shopify Connector | Add commerce connection | Shopify data adapter | Commerce data normalizes correctly |
| 11 - Meta Ads Connector | Add paid-media connection | Meta adapter | Meta data normalizes correctly |
| 12 - Google Ads Connector | Add paid-media connection | Google Ads adapter | Google data normalizes correctly |
| 13 - Daily Dashboard + Multi-Source Workspace | Productize validated performance for daily use | Transient workspace, combined analysis, exception UX, responsive dashboard | Complete and exception workspace flows are usable and truthful |
| 14 - Client + Report Memory | Persist recurring context | Browser-local clients, configuration, dashboard snapshot, freshness, and bounded cycle history | Reload/repeat/isolation flows are verified without sensitive or cloud persistence |
| 15 - Deterministic Narrative Intelligence + Report Preparation | Explain trusted facts | Evidence-backed deterministic narrative package | No generative model required |
| 16 - Report Composer + PDF | Produce client output | Structured report and browser-native PDF export | Report facts, print boundary, and rendering verified |
| 17 - Security, QA + Private Beta | Prepare real-world validation | Hardening, tests, beta process | Private beta readiness reviewed |
| 18 - Vercel Production + Public Project Closure | Launch and close project | Vercel production and closure record | Production health and closure complete |
