# Canonical data contract

## Purpose and scope

Relay accepts provider-shaped CSV/API inputs but downstream validation, reconciliation, and analytics receive only canonical daily observations. This V1 contract deliberately has two domains instead of one oversized universal record. It establishes data semantics only; it is not a database schema and Sprint 05 keeps all processing transient.

## Exact V1 normalized shapes

```ts
type FixedDecimalString = string; // canonical decimal text: -?\d+(\.\d+)?

type CsvObservationProvenance = {
  transport: "csv";
  ingestionId: string;
  originalFileName: string;
  sourceRow: number; // one-based CSV row, including the header row in the source file
  mappingOrigins: Partial<Record<CanonicalField, "exact_alias" | "normalized_alias" | "manual">>;
};

type ApiObservationProvenance = {
  transport: "api";
  provider: "meta_ads" | "google_ads" | "shopify";
  externalAccountId: string; // server-validated provider account/store ID
  fetchRequestId: string;
  dateRange: { start: "YYYY-MM-DD"; end: "YYYY-MM-DD" };
  providerRecordLocator?: string; // safe, non-secret provider record/page locator
};

type ObservationProvenance = CsvObservationProvenance | ApiObservationProvenance;

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

Sprint 07 uses Shopify `grossRevenue` as V1 report-level `commerce_revenue` and as the MER/AOV numerator because it is required at the supported order-row boundary; optional `netRevenue` remains separate and unavailable where the source omits it. Provider-specific ROAS uses only same-provider `attributedRevenue` and spend. Relay never creates a generic canonical revenue field or a combined Meta-plus-Google attributed total. Exact formulas are defined in [KPI_DEFINITIONS.md](KPI_DEFINITIONS.md) and [ADR-001](../decisions/ADR-001-revenue-semantics.md).

## Numeric and currency representation

Money and counts use normalized fixed decimal strings rather than JavaScript numbers. This avoids binary floating-point changes to authoritative values while keeping the V1 contract independent of a currency-exponent table. A money field is paired with the observation's explicit ISO 4217 `currencyCode`.

- Accepted numeric grammar: optional leading minus for money, digits, an optional `.` decimal fraction, and optional correctly grouped `,` thousands separators. The locale is deliberately fixed to period-decimal/comma-thousands.
- Canonicalization removes thousands separators and insignificant fractional zeroes (`1,234.500` becomes `"1234.5"`; `0.00` becomes `"0"`). It never uses floating-point arithmetic.
- Google `Cost (micros)` is converted by decimal-string placement, not floating-point division.
- Empty optional cells become `null`; empty required row values fail normalization. Numeric text that does not match the grammar fails with a structured error and never becomes zero.
- Negative money is preserved for provider-reported reversals or adjustments. Counts must be non-negative.
- Currency codes are uppercased only after validating three ASCII letters. If a row has a monetary value but no currency, normalization fails.

Mixed currencies are preserved per record. Data Health treats within-source mixed currency and cross-source monetary currency mismatch as blocking; it never combines or converts them.

KPI arithmetic consumes this canonical text with bounded `BigInt` fixed-decimal operations. Division rounds half up to at most 12 fractional digits; serialized KPI values remain canonical decimal strings. Binary floating-point is not authoritative.

## Availability, required semantics, and Shopify grain

`null` means unavailable/not supplied; `"0"` means the provider supplied an actual zero. Missing dimensions are not replaced by synthetic labels.

| Provider domain | Mapping requirements | Row requirements |
| --- | --- | --- |
| Meta Ads / Google Ads | `date`; at least one account/campaign/group/ad context; at least one primitive measure; `currency` when `spend` or `attributedRevenue` is mapped | Date, context, and at least one measure must have a value. Currency is required when a monetary value is present. |
| Shopify | `date`, `orderId`, `grossRevenue`, and `currency` | Every supported row must contain those values. |

V1 Shopify support is intentionally limited to order-row exports: one row per order ID and a `Total`/`Total sales` gross-revenue value. A repeated order ID fails with `UNSUPPORTED_SHOPIFY_EXPORT_GRAIN`; Relay does not guess whether line-item totals are safe to sum. Customer email is not normalized and does not create a customer metric.

## Mapping and provenance

Provider-specific aliases are defined in [SOURCE_RULES.md](SOURCE_RULES.md). Mapping is deterministic and reports `mapped`, `unmapped`, `ambiguous`, or manually `ignored` columns. The only mapping origins are `exact_alias`, `normalized_alias`, and `manual`; Relay does not emit fake percentage confidence.

CSV provenance retains the transient request ID, safe original filename, source-row reference, and mapping origin. API provenance retains provider, validated account/store ID, fetch request ID, requested date range, and an optional safe provider record locator. API records never invent filenames, source rows, or mapping origins. Data Health validates the transport-specific lineage and blocks downstream readiness if required provenance is absent, invalid, inconsistent with canonical source/account identity, or places the observation date outside the declared fetch range. Record locators exclude control characters, URLs, and token/auth-like material. Provenance intentionally excludes raw rows/payloads, credentials, auth headers, and unselected customer fields. Raw uploads, parsed rows, and provider results are not persisted or logged.

## Connector equivalence preparation

Meta, Google, and Shopify connectors must produce these same shapes and semantics for reporting-equivalent provider data. The generic Sprint 09 mock fixture proves the contract without claiming compatibility with a real provider API. Semantic comparison ignores only provenance and input ordering; dates, source/account identity where supplied by both transports, dimensions, primitive measures, currency, null versus zero, and revenue semantics must match. Analytics does not branch on CSV versus API; only provenance-specific Data Health checks inspect transport.
