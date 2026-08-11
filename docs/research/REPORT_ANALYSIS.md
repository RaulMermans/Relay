# Report reverse-engineering framework

## Per-report record

Assign each analyzed report an ID (`REP-001`, `REP-002`, and so on), linked to an anonymized participant ID. Capture the reporting period, source platforms, format, page/slide count, sections, KPIs, charts, tables, written commentary, recommendations, attribution caveats, repeated explanations, client-specific targets, source-of-truth decisions, screenshots, manual calculations, manual data enrichment, raw data excluded from the final report, and information that cannot be derived from source exports.

## Analysis procedure

1. Inventory report elements without assuming they are product requirements.
2. Trace each metric, claim, and recommendation to its stated or observed source of truth.
3. Mark every element as common, configurable, human-context dependent, or unresolved.
4. Record manual work and exclusions that alter the report's final meaning.

## Cross-report comparison matrix

Use one row per dimension and one column per report ID. Record evidence or `not present`; do not infer missing source rules.

| Dimension | REP-001 | REP-002 | REP-003 | Pattern / implication |
| --- | --- | --- | --- | --- |
| Source platforms and cadence | Record | Record | Record | Compare recurring source combinations |
| Sections, KPIs, charts, and tables | Record | Record | Record | Identify reusable report structure |
| Commentary, recommendations, and caveats | Record | Record | Record | Identify repeated vs judgment-dependent language |
| Targets and source-of-truth decisions | Record | Record | Record | Identify configurable reporting rules |
| Screenshots, calculations, enrichment, and exclusions | Record | Record | Record | Identify automation gaps and human work |
| Information unavailable in exports | Record | Record | Record | Identify human-context boundary |

## Interpretation layers

### Common layer

Elements repeated across reports that Relay may standardize, subject to evidence.

### Configurable layer

Client-varying targets, reporting rules, explanations, and presentation preferences that may become report memory.

### Human-context layer

Strategy, client history, non-platform context, and other information Relay cannot reliably derive from source data.

This framework tests whether workflows are similar enough to productize without assuming they are.
