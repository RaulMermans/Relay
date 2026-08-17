# Relay product UX

## Product loop

Relay is a daily performance dashboard with reporting automation underneath it. The primary loop is:

```text
Workspace
-> Reporting period
-> Data sources
-> Automatic preparation
-> Exceptions, only when action is required
-> Dashboard
-> What Changed
-> Later: report generation
```

The dashboard reflects the freshest data supplied to the active workspace. It is not a claim of real-time connectivity or automatic refresh.

## Primary daily questions

Every primary surface should help a performance marketer answer, in this order:

1. How is performance doing?
2. What changed?
3. What needs attention?
4. How are channels performing?
5. Is the underlying data trustworthy?

Technical ingestion stages are supporting evidence, not primary navigation.

## Information architecture

The V1 product shell contains two destinations:

- **Overview** presents performance, curated changes, channels, attention, and a compact data-quality signal.
- **Data Sources** manages the active Meta Ads, Google Ads, and Shopify inputs without discarding dashboard context.

Reports joins the navigation only when a real report experience exists. Settings, Team, Billing, marketplace, Automations, and AI chat are not present until they have working product surfaces.

## UX principles

### Exception-driven

Relay prepares recognized data automatically. Successful detection, mapping, normalization, and reconciliation require no confirmation screen. When Relay needs help, it states the smallest actionable issue in human language and reveals only the relevant correction.

### Progressive disclosure

Performance is primary after analysis succeeds. Source metadata, mapping detail, and structured Data Health evidence remain available for inspection, but healthy technical stages stay compact. Blocking issues cannot be dismissed into readiness.

### Dashboard-first

The overview orders information as Performance, What Changed, Channels, Attention, then Data quality. Upload and mapping controls never remain above performance once a usable analysis exists.

### Human-readable

The interface uses channel names, dates, money, ratios, percentages, and actions people recognize. Internal enum values and raw fixed-decimal strings stay out of primary presentation.

### Deterministic facts remain authoritative

Presentation may format, rank, group, and explain structured results. It must not recalculate KPIs, alter severity or blocking state, invent causal explanations, merge provider attribution, or turn unavailable values into zero.

### Technical internals are secondary but inspectable

Data Health codes, evidence, mapping origins, formulas, and previous-period facts remain accessible when useful for trust or correction. Presentation copy is deterministic and does not replace the underlying result.

### No false live-data claims

CSV is the usable production transport in Sprint 13. API adapters are implemented but live authorization and automatic synchronization remain unavailable. Workspace state is session-scoped and does not imply saved clients, durable files, or credentials.

## Workspace state boundary

The active browser session may hold a workspace name, reporting period, expected sources, source presentation summaries, targets, analysis status, and compact analysis result. Raw CSV content, canonical observations, credentials, and API tokens are never written to browser storage. Sprint 14 owns durable client and report memory.

## Product language

Use actions such as **Add data**, **Update data**, **Review**, **Try again**, and **View details**. Describe a correction from the user's perspective: “Relay needs help with one field,” not “mapping status required_missing.” Describe freshness as “Through Aug 10,” not “Live.”

## Accessibility and responsive baseline

Primary actions, source updates, mapping corrections, disclosures, and retry controls must be keyboard reachable with visible focus. Status cannot depend on color alone. Charts require a text summary and labelled values. The information order and action hierarchy must remain intact on desktop, tablet, and mobile, with reduced-motion preferences respected.
