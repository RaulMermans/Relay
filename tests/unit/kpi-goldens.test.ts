import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { runKpiEngine } from "../../lib/kpi/engine";
import type { KpiExecutionResult, KpiMetricResult } from "../../lib/kpi/types";
import type { AdvertisingObservation, CommerceObservation } from "../../lib/normalization/types";

const period = {
  currentPeriod: { start: "2026-08-01", end: "2026-08-02" },
  comparisonPeriod: { start: "2026-07-30", end: "2026-07-31" },
};

function advertising(overrides: Partial<AdvertisingObservation> = {}): AdvertisingObservation {
  return {
    domain: "advertising",
    source: "meta_ads",
    sourceAccountId: "act-1",
    sourceAccountName: null,
    date: "2026-08-01",
    sourceTimezone: null,
    campaignId: "campaign-1",
    campaignName: null,
    groupId: null,
    groupName: null,
    adId: null,
    adName: null,
    currencyCode: "EUR",
    spend: "10.1",
    impressions: "1000",
    clicks: "50",
    conversions: "5",
    attributedRevenue: "40",
    provenance: {
      transport: "csv",
      ingestionId: "kpi-golden",
      originalFileName: "synthetic-kpi.csv",
      sourceRow: 2,
      mappingOrigins: { date: "exact_alias" },
    },
    ...overrides,
  };
}

function commerce(overrides: Partial<CommerceObservation> = {}): CommerceObservation {
  return {
    domain: "commerce",
    source: "shopify",
    sourceStoreId: "store-1",
    sourceStoreName: null,
    orderId: "#1001",
    date: "2026-08-01",
    sourceTimezone: null,
    currencyCode: "EUR",
    orders: "1",
    grossRevenue: "100.1",
    netRevenue: null,
    refunds: null,
    customers: null,
    newCustomers: null,
    provenance: {
      transport: "csv",
      ingestionId: "kpi-golden",
      originalFileName: "synthetic-kpi.csv",
      sourceRow: 2,
      mappingOrigins: { date: "exact_alias" },
    },
    ...overrides,
  };
}

async function golden(name: string): Promise<Record<string, unknown>> {
  const content = await readFile(new URL(`../../fixtures/expected/kpi/${name}.json`, import.meta.url), "utf8");
  return JSON.parse(content) as Record<string, unknown>;
}

function ready(observations: Array<AdvertisingObservation | CommerceObservation>) {
  const result = runKpiEngine({ observations, dataHealthStatus: "healthy", reportingPeriod: period });
  expect(result.status).toBe("ready");
  if (result.status !== "ready") throw new Error("Expected ready KPI result.");
  return result;
}

function metric(result: Extract<KpiExecutionResult, { status: "ready" }>, key: string): KpiMetricResult {
  const found = result.metrics.find((candidate) => candidate.key === key);
  if (!found) throw new Error(`Missing ${key}.`);
  return found;
}

function expectMetricSubset(result: Extract<KpiExecutionResult, { status: "ready" }>, expected: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(expected)) expect(metric(result, key)).toMatchObject(value as object);
}

describe("independently maintained KPI goldens", () => {
  it("matches the advertising-only golden", async () => {
    const result = ready([
      advertising(),
      advertising({ date: "2026-08-02", spend: "20.2", impressions: "1000", clicks: "50", conversions: "0", attributedRevenue: "60" }),
    ]);
    const expected = await golden("advertising-only");
    expectMetricSubset(result, expected.metrics as Record<string, unknown>);
    expect(result.sourceBreakdown.find((item) => item.source === "meta_ads")?.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "attributed_revenue", value: "100" }),
        expect.objectContaining({ key: "roas", value: "3.300330033003" }),
      ]),
    );
  });

  it("matches the commerce-only golden", async () => {
    const result = ready([
      commerce(),
      commerce({ orderId: "#1002", date: "2026-08-02", grossRevenue: "124.9" }),
    ]);
    const expected = await golden("commerce-only");
    expectMetricSubset(result, expected.metrics as Record<string, unknown>);
  });

  it("matches zero-denominator, previous-zero, null-input, and currency-safe goldens", async () => {
    const zero = ready([advertising({ spend: "0", impressions: "0", clicks: "0", conversions: "0" }), commerce({ grossRevenue: "0", orders: "0" })]);
    expectMetricSubset(zero, (await golden("zero-denominator")).metrics as Record<string, unknown>);

    const previousZero = ready([
      advertising({ spend: "10" }),
      advertising({ date: "2026-07-30", spend: "0" }),
    ]);
    expectMetricSubset(previousZero, (await golden("previous-zero")).metrics as Record<string, unknown>);

    const nullInputs = ready([advertising({ spend: null, impressions: null, clicks: null, conversions: null, attributedRevenue: null })]);
    expectMetricSubset(nullInputs, (await golden("null-inputs")).metrics as Record<string, unknown>);

    const currencySafe = ready([
      advertising({ spend: "0.1", impressions: "2", clicks: "1", conversions: null, attributedRevenue: null }),
      advertising({ date: "2026-08-02", spend: "0.2", impressions: "1", clicks: "0", conversions: null, attributedRevenue: null }),
    ]);
    expectMetricSubset(currencySafe, (await golden("currency-safe")).metrics as Record<string, unknown>);
  });
});
