import { describe, expect, it } from "vitest";

import { add, compare, divide, isValidDecimal, multiply, subtract } from "../../lib/kpi/arithmetic";
import { runKpiEngine } from "../../lib/kpi/engine";

function advertising(overrides: Record<string, unknown> = {}) {
  return {
    domain: "advertising" as const,
    source: "meta_ads" as const,
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
      transport: "csv" as const,
      ingestionId: "kpi-test",
      originalFileName: "synthetic-kpi.csv",
      sourceRow: 2,
      mappingOrigins: { date: "exact_alias" as const },
    },
    ...overrides,
  };
}

function commerce(overrides: Record<string, unknown> = {}) {
  return {
    domain: "commerce" as const,
    source: "shopify" as const,
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
      transport: "csv" as const,
      ingestionId: "kpi-test",
      originalFileName: "synthetic-kpi.csv",
      sourceRow: 2,
      mappingOrigins: { date: "exact_alias" as const },
    },
    ...overrides,
  };
}

function run(observations: Array<ReturnType<typeof advertising> | ReturnType<typeof commerce>>, dataHealthStatus: "healthy" | "review_required" | "blocked" = "healthy") {
  return runKpiEngine({
    observations,
    dataHealthStatus,
    reportingPeriod: {
      currentPeriod: { start: "2026-08-01", end: "2026-08-02" },
      comparisonPeriod: { start: "2026-07-30", end: "2026-07-31" },
    },
  });
}

function metric(result: Extract<ReturnType<typeof run>, { status: "ready" }>, key: string) {
  const found = result.metrics.find((candidate) => candidate.key === key);
  if (!found) throw new Error(`Expected ${key} metric.`);
  return found;
}

function sourceMetric(
  result: Extract<ReturnType<typeof run>, { status: "ready" }>,
  source: "meta_ads" | "google_ads" | "shopify",
  key: string,
) {
  const breakdown = result.sourceBreakdown.find((candidate) => candidate.source === source);
  const found = breakdown?.metrics.find((candidate) => candidate.key === key);
  if (!found) throw new Error(`Expected ${source} ${key} metric.`);
  return found;
}

describe("KPI arithmetic", () => {
  it("uses fixed decimal text without binary floating-point drift", () => {
    expect(add("0.1", "0.2")).toBe("0.3");
    expect(subtract("1", "0.1")).toBe("0.9");
    expect(multiply("12.5", "0.08")).toBe("1");
    expect(divide("1", "3")).toBe("0.333333333333");
    expect(compare("1.20", "1.2")).toBe(0);
    expect(isValidDecimal("1".repeat(257))).toBe(false);
    expect(isValidDecimal("1e9")).toBe(false);
  });
});

describe("runKpiEngine", () => {
  it("aggregates compatible current-period primitives and derives advertising and commerce KPIs", () => {
    const result = run([
      advertising(),
      advertising({ date: "2026-08-02", spend: "20.2", impressions: "1000", clicks: "50", conversions: "0", attributedRevenue: "60", provenance: { ...advertising().provenance, sourceRow: 3 } }),
      advertising({ source: "google_ads", spend: "9.7", impressions: "1000", clicks: "20", conversions: "2", attributedRevenue: "30", provenance: { ...advertising().provenance, sourceRow: 4 } }),
      commerce(),
      commerce({ orderId: "#1002", date: "2026-08-02", grossRevenue: "124.9", provenance: { ...commerce().provenance, sourceRow: 3 } }),
      advertising({ date: "2026-07-30", spend: "10", impressions: "1000", clicks: "10", conversions: "1", attributedRevenue: "10", provenance: { ...advertising().provenance, sourceRow: 5 } }),
      advertising({ source: "google_ads", date: "2026-07-30", spend: "10", impressions: "1000", clicks: "10", conversions: "1", attributedRevenue: "20", provenance: { ...advertising().provenance, sourceRow: 6 } }),
      commerce({ orderId: "#1000", date: "2026-07-30", grossRevenue: "100", provenance: { ...commerce().provenance, sourceRow: 4 } }),
    ]);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected a ready KPI result.");
    expect(metric(result, "spend")).toMatchObject({ value: "40", unit: "currency", status: "available" });
    expect(metric(result, "commerce_revenue")).toMatchObject({ value: "225", unit: "currency", status: "available" });
    expect(metric(result, "orders")).toMatchObject({ value: "2", unit: "count", status: "available" });
    expect(metric(result, "impressions")).toMatchObject({ value: "3000", unit: "count", status: "available" });
    expect(metric(result, "clicks")).toMatchObject({ value: "120", unit: "count", status: "available" });
    expect(metric(result, "conversions")).toMatchObject({ value: "7", unit: "count", status: "available" });
    expect(metric(result, "ctr")).toMatchObject({ value: "0.04", unit: "ratio", status: "available" });
    expect(metric(result, "cpc")).toMatchObject({ value: "0.333333333333", unit: "currency", status: "available" });
    expect(metric(result, "cpa")).toMatchObject({ value: "5.714285714286", unit: "currency", status: "available" });
    expect(metric(result, "mer")).toMatchObject({ value: "5.625", unit: "ratio", status: "available" });
    expect(metric(result, "aov")).toMatchObject({ value: "112.5", unit: "currency", status: "available" });
    expect(metric(result, "conversion_rate")).toMatchObject({ value: "0.058333333333", unit: "ratio", status: "available" });
    expect(metric(result, "spend").comparison).toEqual({ current: "40", previous: "20", absoluteChange: "20", percentageChange: "1" });
    expect(sourceMetric(result, "meta_ads", "roas")).toMatchObject({ value: "3.300330033003", unit: "ratio", status: "available" });
    expect(sourceMetric(result, "google_ads", "roas")).toMatchObject({ value: "3.092783505155", unit: "ratio", status: "available" });
    expect(result.metrics.some((candidate) => candidate.key === "roas")).toBe(false);
    expect(metric(result, "commerce_revenue").inputs).toEqual(expect.arrayContaining([expect.objectContaining({ source: "shopify", field: "grossRevenue" })]));
  });

  it("allows review-required Data Health but returns a stable blocked result without calculating metrics", () => {
    expect(run([advertising()], "review_required").status).toBe("ready");
    expect(run([advertising(), commerce()], "blocked")).toEqual({
      status: "blocked",
      code: "DATA_HEALTH_BLOCKED",
      message: "KPI execution is unavailable because Data Health is blocked.",
      period: {
        currentPeriod: { start: "2026-08-01", end: "2026-08-02" },
        comparisonPeriod: { start: "2026-07-30", end: "2026-07-31" },
      },
      metrics: [],
      sourceBreakdown: [],
    });
  });

  it("keeps supplied zero distinct from unavailable input and makes zero-denominator ratios unavailable", () => {
    const result = run([
      advertising({ spend: "0", impressions: "0", clicks: "0", conversions: "0", attributedRevenue: null }),
      commerce({ grossRevenue: "0", orders: "0" }),
    ]);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected a ready KPI result.");
    expect(metric(result, "spend")).toMatchObject({ value: "0", status: "available" });
    expect(metric(result, "ctr")).toMatchObject({ value: null, status: "unavailable", unavailableReason: "ZERO_DENOMINATOR" });
    expect(metric(result, "cpc")).toMatchObject({ value: null, status: "unavailable", unavailableReason: "ZERO_DENOMINATOR" });
    expect(metric(result, "cpa")).toMatchObject({ value: null, status: "unavailable", unavailableReason: "ZERO_DENOMINATOR" });
    expect(metric(result, "mer")).toMatchObject({ value: null, status: "unavailable", unavailableReason: "ZERO_DENOMINATOR" });
    expect(metric(result, "aov")).toMatchObject({ value: null, status: "unavailable", unavailableReason: "ZERO_DENOMINATOR" });
    expect(sourceMetric(result, "meta_ads", "roas")).toMatchObject({ value: null, status: "unavailable", unavailableReason: "ZERO_DENOMINATOR" });
  });

  it("does not turn missing measures into zero and handles previous zero percentage change honestly", () => {
    const result = run([
      advertising({ spend: null, impressions: null, clicks: null, conversions: null, attributedRevenue: null }),
      advertising({ date: "2026-07-30", spend: "0", impressions: "0", clicks: "0", conversions: "0", attributedRevenue: null, provenance: { ...advertising().provenance, sourceRow: 3 } }),
    ]);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected a ready KPI result.");
    expect(metric(result, "spend")).toMatchObject({ value: null, status: "unavailable", unavailableReason: "INPUT_UNAVAILABLE" });
    expect(metric(result, "spend").comparison).toEqual({ current: null, previous: "0", absoluteChange: null, percentageChange: null });
    expect(metric(result, "ctr")).toMatchObject({ value: null, status: "unavailable", unavailableReason: "INPUT_UNAVAILABLE" });
  });

  it("filters both current and equivalent previous periods without date leakage", () => {
    const result = run([
      advertising({ spend: "10", date: "2026-08-01" }),
      advertising({ spend: "20", date: "2026-07-30", provenance: { ...advertising().provenance, sourceRow: 3 } }),
      advertising({ spend: "999", date: "2026-07-29", provenance: { ...advertising().provenance, sourceRow: 4 } }),
      advertising({ spend: "999", date: "2026-08-03", provenance: { ...advertising().provenance, sourceRow: 5 } }),
    ]);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected a ready KPI result.");
    expect(metric(result, "spend").comparison).toEqual({ current: "10", previous: "20", absoluteChange: "-10", percentageChange: "-0.5" });
  });

  it("returns minus one for current zero versus a positive previous value", () => {
    const result = run([
      advertising({ spend: "0" }),
      advertising({ date: "2026-07-30", spend: "10" }),
    ]);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected a ready KPI result.");
    expect(metric(result, "spend").comparison).toEqual({ current: "0", previous: "10", absoluteChange: "-10", percentageChange: "-1" });
  });

  it("refuses cross-currency MER and provider ROAS even if a caller supplies a non-blocked status", () => {
    const result = run([
      advertising({ spend: "10", currencyCode: "EUR", attributedRevenue: null }),
      advertising({ spend: null, currencyCode: "USD", attributedRevenue: "20" }),
      commerce({ grossRevenue: "100", currencyCode: "USD" }),
    ]);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected a ready KPI result.");
    expect(metric(result, "mer")).toMatchObject({ value: null, status: "unavailable", unavailableReason: "CURRENCY_INCOMPATIBLE" });
    expect(sourceMetric(result, "meta_ads", "roas")).toMatchObject({ value: null, status: "unavailable", unavailableReason: "CURRENCY_INCOMPATIBLE" });
  });
});
