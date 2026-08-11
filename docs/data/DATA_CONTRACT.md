# Canonical data contract

## Purpose and scope

Relay accepts provider-shaped CSV/API inputs but downstream validation, reconciliation, and analytics receive only canonical daily observations. This V1 contract deliberately has two domains instead of one oversized universal record. It establishes data semantics only; it is not a database schema and Sprint 05 keeps all processing transient.

## Exact V1 normalized shapes

```ts
type FixedDecimalString = string; // canonical decimal text: -?\d+(\.\d+)?

type ObservationProvenance = {
  transport: "csv";
  ingestionId: string;
  originalFileName: string;
  sourceRow: number; // one-based CSV row, including the header row in the source file
  mappingOrigins: Partial<Record<CanonicalField, "exact_alias" | "normalized_alias" | "manual">>;
};

type AdvertisingObservation = {
  domain: "advertising";
  source: "meta_ads" | "google_ads";
  sourceAccountId: string | null;
  sourceAccountName: string | null;
  date: "YYYY-MM-DD";
  sourceTimezone: null; // unavailable in the supported fixture-backed CSVs; never guessed as UTC
  campaignId: string | null;
  campaignName: string | null;
  groupId: string | null; // Meta ad set or Google ad group where supplied
  groupName: string | null;
  adId: string | null;
  adName: string | null;
  currencyCode: string | null;
  spend: FixedDecimalString | null;
  impressions: FixedDecimalString | null;
  clicks: FixedDecimalString | null;
  conversions: FixedDecimalString | null;
  attributedRevenue: FixedDecimalString | null;
  provenance: ObservationProvenance;
};

type CommerceObservation = {
  domain: "commerce";
  source: "shopify";
  sourceStoreId: string | null;
  sourceStoreName: string | null;
  orderId: string;
  date: "YYYY-MM-DD";
  sourceTimezone: null;
  currencyCode: string;
  orders: FixedDecimalString; // "1" for each supported Shopify order row
  grossRevenue: FixedDecimalString;
  netRevenue: FixedDecimalString | null;
  refunds: FixedDecimalString | null;
  customers: FixedDecimalString | null;
  newCustomers: FixedDecimalString | null;
  provenance: ObservationProvenance;
};
```

`sourceAccountId`, `sourceStoreId`, campaign/group/ad IDs, and `orderId` are provider identifiers. Their corresponding `Name` fields are display metadata; Relay never substitutes a display name for an available identifier. `orderId` is retained because it protects the supported Shopify order-row grain from accidental duplication.

## Daily grain and aggregation decision

Sprint 05 preserves one normalized observation per input row. It does not aggregate rows that share day, account, campaign, or order dimensions. This is the smallest approach that preserves source-row provenance and avoids hiding duplicate/overlap questions before Sprint 06 Data Health. Downstream aggregation must respect date, currency, dimensions, and Data Health findings.

The date parser accepts an ISO calendar date (`YYYY-MM-DD`) followed optionally by a valid ISO time portion and retains the supplied calendar component without a timezone conversion. It rejects impossible dates and malformed time suffixes. A source timezone remains `null` when the export does not supply one; Relay does not manufacture a timezone.

## Revenue semantics

There is no generic canonical `revenue` field.

- `attributedRevenue` belongs only to `AdvertisingObservation`. Meta purchase value and Google conversion value remain provider-attributed advertising measures.
- `grossRevenue` and `netRevenue` belong only to `CommerceObservation`. Shopify/store revenue remains commerce truth.

The allowed future KPI use of these measures is defined in [ADR-001](../decisions/ADR-001-revenue-semantics.md). Sprint 05 calculates no KPIs, ratios, or revenue aggregates.

## Numeric and currency representation

Money and counts use normalized fixed decimal strings rather than JavaScript numbers. This avoids binary floating-point changes to authoritative values while keeping the V1 contract independent of a currency-exponent table. A money field is paired with the observation's explicit ISO 4217 `currencyCode`.

- Accepted numeric grammar: optional leading minus for money, digits, an optional `.` decimal fraction, and optional correctly grouped `,` thousands separators. The locale is deliberately fixed to period-decimal/comma-thousands.
- Canonicalization removes thousands separators and insignificant fractional zeroes (`1,234.500` becomes `"1234.5"`; `0.00` becomes `"0"`). It never uses floating-point arithmetic.
- Google `Cost (micros)` is converted by decimal-string placement, not floating-point division.
- Empty optional cells become `null`; empty required row values fail normalization. Numeric text that does not match the grammar fails with a structured error and never becomes zero.
- Negative money is preserved for provider-reported reversals or adjustments. Counts must be non-negative.
- Currency codes are uppercased only after validating three ASCII letters. If a row has a monetary value but no currency, normalization fails.

Mixed currencies are preserved per record and produce a `MIXED_CURRENCIES` warning. Sprint 05 never combines or converts them; Sprint 06 will decide affected Data Health eligibility.

## Availability, required semantics, and Shopify grain

`null` means unavailable/not supplied; `"0"` means the provider supplied an actual zero. Missing dimensions are not replaced by synthetic labels.

| Provider domain | Mapping requirements | Row requirements |
| --- | --- | --- |
| Meta Ads / Google Ads | `date`; at least one account/campaign/group/ad context; at least one primitive measure; `currency` when `spend` or `attributedRevenue` is mapped | Date, context, and at least one measure must have a value. Currency is required when a monetary value is present. |
| Shopify | `date`, `orderId`, `grossRevenue`, and `currency` | Every supported row must contain those values. |

V1 Shopify support is intentionally limited to order-row exports: one row per order ID and a `Total`/`Total sales` gross-revenue value. A repeated order ID fails with `UNSUPPORTED_SHOPIFY_EXPORT_GRAIN`; Relay does not guess whether line-item totals are safe to sum. Customer email is not normalized and does not create a customer metric.

## Mapping and provenance

Provider-specific aliases are defined in [SOURCE_RULES.md](SOURCE_RULES.md). Mapping is deterministic and reports `mapped`, `unmapped`, `ambiguous`, or manually `ignored` columns. The only mapping origins are `exact_alias`, `normalized_alias`, and `manual`; Relay does not emit fake percentage confidence.

Provenance retains the transient request ID, safe original filename, source-row reference, transport, and mapping origin. It intentionally excludes raw rows, unselected customer fields, and raw CSV content. Raw uploads and parsed rows are not persisted or logged.

## Connector equivalence preparation

Future Meta, Google, and Shopify connectors must produce these same shapes and semantics for reporting-equivalent provider data. The synthetic files in `fixtures/normalized/` are independent golden outcomes for that future connector-contract work. Transport-specific provenance may differ only in the transport locator; analytics must not branch on CSV versus connector payload shape.
