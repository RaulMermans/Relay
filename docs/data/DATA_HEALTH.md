# Data Health contract

## Scope

Sprint 06 adds a pure, request-scoped trust layer after canonical normalization and before any future analytics. It consumes canonical observations plus reporting context, detects data-quality and compatibility concerns, and returns safe findings, a source-coverage summary, and a deterministic readiness status. It never stores, changes, fills, aggregates, converts, or deletes canonical observations.

## Finding contract

Every finding has this logical shape:

```ts
type DataHealthFinding = {
  id: string; // deterministic from the rule and safe scope
  code: string;
  category: "structure" | "mapping" | "dates" | "currency" | "duplicates" | "provenance" | "source_coverage" | "reconciliation";
  severity: "info" | "warning" | "error";
  status: "open";
  source?: "meta_ads" | "google_ads" | "shopify";
  field?: string;
  period?: { start: "YYYY-MM-DD"; end: "YYYY-MM-DD" };
  message: string;
  evidence: Record<string, string | number | boolean | string[]>;
  blocking: boolean;
};
```

Evidence contains only safe metadata such as provider identifier, dates, counts, canonical-field names, mapping origin, and currency code. Findings never expose a raw row, a raw CSV value, a source row's complete identity, a filename, an ingestion ID, or customer data.

`info` is explanatory and never blocks. `warning` requires human awareness but does not block. `error` is unsafe for downstream analytics and is always blocking. Findings initially have `open` status because Relay has no persistence. The UI can acknowledge warnings only in its transient local state; it cannot acknowledge a blocking error away.

## Summary and gate

```ts
type DataHealthResult = {
  status: "healthy" | "review_required" | "blocked";
  counts: { info: number; warning: number; error: number };
  checksRun: string[];
  findings: DataHealthFinding[];
  sourceCoverage: SourceCoverage[];
  reportingPeriod: ResolvedReportingPeriod;
};
```

- `healthy`: no warning or error finding.
- `review_required`: one or more warnings and no blocking finding.
- `blocked`: one or more blocking errors.

Sprint 07 may receive canonical observations, this result, and its reporting period only when status is `healthy` or `review_required`. It must not run for `blocked`. A warning acknowledgement is a UI readiness affordance, not a change to the server result.

## Reporting period

Reporting context is transient. It contains a current date range and an optional comparison range. Dates are ISO calendar dates. When comparison is omitted, Relay derives the immediately preceding calendar range with the same inclusive length. A supplied comparison range must be equally long and immediately precede the current range; a structurally malformed range is rejected by the server, while an incompatible but well-formed comparison produces a blocking health finding.

Source coverage is reported as the earliest and latest canonical observation date, plus count, currencies, and a readiness label. An advertising source has meaningful daily coverage: an interior missing calendar day is a warning. Shopify's supported order-row grain does not imply that an order must occur every day, so its missing days are neither zeroes nor coverage gaps. Data outside the current/comparison ranges is a warning. A required source with no current-period observations, or a received source entirely outside the current period, blocks readiness. Partial current-period coverage is a warning for human review.

## Compatibility rules

- `expectedSources` is request-scoped and may be any non-empty unique subset of Meta Ads, Google Ads, and Shopify. Relay never assumes all three sources are required.
- A missing expected source or an expected source with no usable current-period observations is a blocking error. Multiple ingestions of the same source are warnings; Relay does not merge or deduplicate them.
- Within-source mixed currency and cross-source mismatched monetary currency are blocking errors. Relay performs no FX conversion. A source with only non-monetary advertising measures does not require a currency.
- A manual mapping is an info finding, not an error. Ignored columns and unresolved optional columns are informational. Required or conflicting mappings are blocking errors.
- Required provenance is source/provider identity, CSV transport, non-empty safe filename and request identity, one-based data-row locator, and mapping origin for the canonical fields that supplied data. Missing provenance is a blocking error.
- A repeated Shopify order ID is a confirmed duplicate and blocks. A repeated advertising canonical key (same source/date/account and available entity IDs) is a warning candidate only. Detection never removes observations.

## Reconciliation rules

Reconciliation implements [RECONCILIATION_RULES.md](RECONCILIATION_RULES.md) and [ADR-001](../decisions/ADR-001-revenue-semantics.md). It checks source presence, compatible source periods/currencies, and the explicit coexistence of commerce truth with provider attribution. It never compares revenue totals by threshold and never calculates, sums, or converts revenue.

## Sprint 07 boundary

The next deterministic KPI layer may use: canonical observations, a non-blocked Data Health result, and this resolved reporting period. Expected KPI scope is spend, revenue, orders, impressions, clicks, CTR, CPC, CPA, ROAS, MER, AOV, conversion rate, and current-versus-previous deltas. Sprint 06 implements none of them.
