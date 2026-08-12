import { describe, expect, it } from "vitest";

import { runDataHealth } from "../../lib/data-health/run-data-health";
import type {
  AdvertisingObservation,
  CommerceObservation,
  CsvObservationProvenance,
  ObservationProvenance,
} from "../../lib/normalization/types";

function advertising(
  overrides: Partial<Omit<AdvertisingObservation, "provenance">> & { provenance?: CsvObservationProvenance } = {},
): AdvertisingObservation & { provenance: CsvObservationProvenance } {
  return {
    domain: "advertising",
    source: "meta_ads",
    sourceAccountId: "act-1",
    sourceAccountName: "Account",
    date: "2026-08-01",
    sourceTimezone: null,
    campaignId: "campaign-1",
    campaignName: "Campaign",
    groupId: null,
    groupName: null,
    adId: null,
    adName: null,
    currencyCode: "EUR",
    spend: "10",
    impressions: "100",
    clicks: "5",
    conversions: "1",
    attributedRevenue: "20",
    provenance: {
      transport: "csv",
      ingestionId: "ingestion-meta",
      originalFileName: "meta.csv",
      sourceRow: 2,
      mappingOrigins: {
        date: "exact_alias",
        source_account_id: "exact_alias",
        source_account_name: "exact_alias",
        campaign_id: "exact_alias",
        campaign_name: "exact_alias",
        currency: "exact_alias",
        spend: "exact_alias",
        impressions: "exact_alias",
        clicks: "exact_alias",
        conversions: "exact_alias",
        attributed_revenue: "exact_alias",
      },
    },
    ...overrides,
  };
}

function commerce(
  overrides: Partial<Omit<CommerceObservation, "provenance">> & { provenance?: CsvObservationProvenance } = {},
): CommerceObservation & { provenance: CsvObservationProvenance } {
  return {
    domain: "commerce",
    source: "shopify",
    sourceStoreId: "store-1",
    sourceStoreName: "Store",
    orderId: "#1001",
    date: "2026-08-01",
    sourceTimezone: null,
    currencyCode: "EUR",
    orders: "1",
    grossRevenue: "50",
    netRevenue: null,
    refunds: null,
    customers: null,
    newCustomers: null,
    provenance: {
      transport: "csv",
      ingestionId: "ingestion-shopify",
      originalFileName: "shopify.csv",
      sourceRow: 2,
      mappingOrigins: {
        date: "exact_alias",
        order_id: "exact_alias",
        currency: "exact_alias",
        gross_revenue: "exact_alias",
        source_store_id: "exact_alias",
        source_store_name: "exact_alias",
      },
    },
    ...overrides,
  };
}

function run(
  observations: Array<AdvertisingObservation | CommerceObservation>,
  overrides: Partial<Parameters<typeof runDataHealth>[0]> = {},
) {
  return runDataHealth({
    observations,
    reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } },
    expectedSources: ["meta_ads", "shopify"],
    ...overrides,
  });
}

function findingCodes(result: ReturnType<typeof runDataHealth>): string[] {
  return result.findings.map((finding) => finding.code);
}

describe("Data Health", () => {
  it("reports aligned commerce and attribution as healthy without combining revenue", () => {
    const result = run([
      advertising(),
      advertising({ date: "2026-08-02", provenance: { ...advertising().provenance, sourceRow: 3 } }),
      advertising({ source: "google_ads", provenance: { ...advertising().provenance, ingestionId: "ingestion-google" } }),
      advertising({
        source: "google_ads",
        date: "2026-08-02",
        provenance: { ...advertising().provenance, ingestionId: "ingestion-google", sourceRow: 3 },
      }),
      commerce(),
      commerce({ orderId: "#1002", date: "2026-08-02", provenance: { ...commerce().provenance, sourceRow: 3 } }),
    ], { expectedSources: ["meta_ads", "google_ads", "shopify"] });

    expect(result.status).toBe("healthy");
    expect(findingCodes(result)).toContain("ATTRIBUTION_AND_COMMERCE_SEPARATED");
    expect(findingCodes(result)).not.toContain("REVENUE_DIFFERENCE");
    expect(result.counts).toMatchObject({ warning: 0, error: 0 });
  });

  it("derives the immediately preceding equal-length comparison period", () => {
    const result = run([advertising(), commerce()]);

    expect(result.reportingPeriod).toEqual({
      currentPeriod: { start: "2026-08-01", end: "2026-08-02" },
      comparisonPeriod: { start: "2026-07-30", end: "2026-07-31" },
    });
  });

  it("requires review for partial current-period source coverage", () => {
    const result = run([advertising(), commerce()]);

    expect(result.status).toBe("review_required");
    expect(findingCodes(result)).toContain("PARTIAL_CURRENT_PERIOD_COVERAGE");
  });

  it("warns about an interior missing advertising day without inventing zero activity", () => {
    const result = run([
      advertising({ date: "2026-08-01" }),
      advertising({ date: "2026-08-03", provenance: { ...advertising().provenance, sourceRow: 3 } }),
      commerce({ date: "2026-08-01" }),
    ], { reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-03" } } });

    expect(result.status).toBe("review_required");
    expect(findingCodes(result)).toContain("MISSING_ADVERTISING_DAILY_COVERAGE");
  });

  it("blocks a source that has no usable current-period observations", () => {
    const result = run([advertising({ date: "2026-07-30" }), commerce({ date: "2026-07-30" })]);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("SOURCE_OUTSIDE_CURRENT_PERIOD");
  });

  it("blocks internally mixed currency and cross-source currency mismatch without conversion", () => {
    const mixed = run([
      advertising({ currencyCode: "EUR" }),
      advertising({ currencyCode: "USD", provenance: { ...advertising().provenance, sourceRow: 3 } }),
      commerce({ currencyCode: "GBP" }),
    ]);

    expect(mixed.status).toBe("blocked");
    expect(findingCodes(mixed)).toContain("SOURCE_MIXED_CURRENCIES");
    expect(findingCodes(mixed)).toContain("CROSS_SOURCE_CURRENCY_MISMATCH");
    expect(findingCodes(mixed)).toContain("COMMERCE_ADVERTISING_CURRENCY_MISMATCH");
  });

  it("treats a valid manual mapping as context", () => {
    const result = run([advertising(), commerce()], {
      sourceInputs: [
        {
          source: "meta_ads",
          mapping: {
            provider: "meta_ads",
            domain: "advertising",
            status: "ready",
            fields: [
              {
                columnIndex: 0,
                header: "Campaign",
                canonicalField: "campaign_name",
                status: "mapped",
                origin: "manual",
                candidates: ["campaign_name"],
              },
            ],
            requiredMissing: [],
            allowedTargets: ["campaign_name"],
          },
        },
      ],
    });

    expect(result.status).toBe("review_required");
    expect(result.findings).toContainEqual(expect.objectContaining({ code: "MANUAL_MAPPING", severity: "info" }));
  });

  it("blocks incomplete mapping and missing required provenance", () => {
    const incompleteProvenance: ObservationProvenance = {
      transport: "csv",
      ingestionId: "",
      originalFileName: "../unsafe.csv",
      sourceRow: 0,
      mappingOrigins: {},
    };
    const result = run([advertising({ provenance: incompleteProvenance }), commerce()]);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("PROVENANCE_REQUEST_ID_MISSING");
    expect(findingCodes(result)).toContain("PROVENANCE_FILE_IDENTITY_INVALID");
    expect(findingCodes(result)).toContain("PROVENANCE_SOURCE_ROW_MISSING");
    expect(findingCodes(result)).toContain("PROVENANCE_MAPPING_ORIGIN_MISSING");
  });

  it("distinguishes an advertising duplicate candidate from a confirmed Shopify duplicate", () => {
    const candidate = run([
      advertising(),
      advertising({ provenance: { ...advertising().provenance, sourceRow: 3 } }),
      commerce(),
    ]);
    const confirmed = run([advertising(), commerce(), commerce({ provenance: { ...commerce().provenance, sourceRow: 3 } })]);

    expect(candidate.status).toBe("review_required");
    expect(findingCodes(candidate)).toContain("ADVERTISING_DUPLICATE_CANDIDATE");
    expect(confirmed.status).toBe("blocked");
    expect(findingCodes(confirmed)).toContain("SHOPIFY_DUPLICATE_ORDER");
  });

  it("blocks a request-scoped expected source that is absent", () => {
    const result = run([advertising()], { expectedSources: ["meta_ads", "shopify"] });

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("EXPECTED_SOURCE_MISSING");
  });

  it("blocks a structurally valid comparison period that is not previous equivalent length", () => {
    const result = run([advertising(), commerce()], {
      reportingPeriod: {
        currentPeriod: { start: "2026-08-01", end: "2026-08-02" },
        comparisonPeriod: { start: "2026-07-28", end: "2026-07-30" },
      },
    });

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("COMPARISON_PERIOD_LENGTH_MISMATCH");
    expect(findingCodes(result)).toContain("COMPARISON_PERIOD_NOT_PREVIOUS");
  });
});
