# Relay product UX

## Product loop

Relay is a daily performance dashboard with reporting automation underneath it. The primary loop is:

```text
Client
-> Restored dashboard or configured empty workspace
-> Reporting period
-> Data sources
-> Automatic preparation
-> Exceptions, only when action is required
-> Dashboard
-> Performance Summary
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

- **Overview** presents performance, a deterministic Performance Summary, curated changes, channels, attention, and a compact data-quality signal.
- **Data Sources** manages the active Meta Ads, Google Ads, and Shopify inputs without discarding dashboard context.

Reports joins the navigation only when a real report experience exists. Settings, Team, Billing, marketplace, Automations, and AI chat are not present until they have working product surfaces.

## UX principles

### Exception-driven

Relay prepares recognized data automatically. Successful detection, mapping, normalization, and reconciliation require no confirmation screen. When Relay needs help, it states the smallest actionable issue in human language and reveals only the relevant correction.

### Progressive disclosure

Performance is primary after analysis succeeds. Source metadata, mapping detail, and structured Data Health evidence remain available for inspection, but healthy technical stages stay compact. Blocking issues cannot be dismissed into readiness.

### Dashboard-first

The overview orders information as Performance, Performance Summary, What Changed, Channels, Attention, then Data quality. The summary has a headline, one-to-three-sentence synthesis, key developments, needs-attention items, and optional evidence inspection. Upload and mapping controls never remain above performance once a usable analysis exists.

### Human-readable

The interface uses channel names, dates, money, ratios, percentages, and actions people recognize. Internal enum values and raw fixed-decimal strings stay out of primary presentation.

### Deterministic facts remain authoritative

Presentation may format, rank, group, and explain structured results. It must not recalculate KPIs, alter severity or blocking state, invent causal explanations, merge provider attribution, or turn unavailable values into zero.

### Technical internals are secondary but inspectable

Data Health codes, evidence, mapping origins, formulas, and previous-period facts remain accessible when useful for trust or correction. Presentation copy is deterministic and does not replace the underlying result.

### No false live-data or cloud claims

CSV is the usable production transport. API adapters are implemented but live authorization and automatic synchronization remain unavailable. Client configuration, safe mapping decisions, targets, reporting preferences, the latest compact dashboard snapshot, and bounded cycle summaries are saved only in the current browser. This does not imply cloud sync, multi-device access, durable files, or credential storage.

## Workspace state boundary

One versioned, validated browser-local document holds explicitly created clients, source expectations, provider/header mapping memory, existing-contract targets, fixed source-of-truth rules, bounded notes, reporting preferences, a compact authoritative analysis snapshot, and up to 52 cycle summaries per client. Product code reaches it through the persistence boundary rather than direct storage calls.

Raw CSV content, filenames, parsed rows, canonical observations, provider payloads, credentials, authorization headers, and API tokens are never written to browser storage. Clearing site data removes Relay memory; another browser or device cannot see it. A corrupt or unsupported document fails to a reset path instead of being used.

## Return and repeat experience

An existing client opens on its last saved dashboard rather than upload onboarding. The header exposes the active client and lightweight create/rename/delete controls; the dashboard retains its performance-first hierarchy and offers **Update data**. Data-source setup reuses expected sources and compatible exact-header mappings, while targets, rules, notes, and later-report preferences remain in compact disclosure. Incompatible saved mappings return to focused review.

Freshness always describes manually supplied data: each source shows its data-through date and the dashboard uses the oldest included source for its conservative aggregate date/status, plus last analysis time. Deterministic labels are **Current** (0-1 days), **Needs refresh** (2-7 days), or **Old** (8+ days). No label implies background refresh.

## Product language

Use actions such as **Add data**, **Update data**, **Review**, **Try again**, and **View details**. Describe a correction from the user's perspective: “Relay needs help with one field,” not “mapping status required_missing.” Describe freshness as “Through Aug 10,” not “Live.”

## Accessibility and responsive baseline

Primary actions, source updates, mapping corrections, disclosures, and retry controls must be keyboard reachable with visible focus. Status cannot depend on color alone. Charts require a text summary and labelled values. The information order and action hierarchy must remain intact on desktop, tablet, and mobile, with reduced-motion preferences respected.
