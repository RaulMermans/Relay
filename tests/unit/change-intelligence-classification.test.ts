import { describe, expect, it } from "vitest";

import { classifyMetricChange, metricPolarity, runChangeIntelligence } from "../../lib/change-intelligence/engine";
import type { KpiMetricKey, KpiMetricResult, KpiResult } from "../../lib/kpi/types";

const period = {
  currentPeriod: { start: "2026-08-01", end: "2026-08-02" },
  comparisonPeriod: { start: "2026-07-30", end: "2026-07-31" },
};

function metric(
  key: KpiMetricKey,
  current: string | null,
  previous: string | null,
  percentageChange: string | null,
  unit: KpiMetricResult["unit"] = "ratio",
): KpiMetricResult {
  const absoluteChange = current === null || previous === null
    ? null
    : (BigInt(current.replace(".", "")) - BigInt(previous.replace(".", ""))).toString();
  return {
    key,
    value: current,
    unit,
    status: current === null ? "unavailable" : "available",
    inputs: [],
    formula: `synthetic ${key}`,
    comparison: { current, previous, absoluteChange, percentageChange },
  };
}

function ready(metrics: KpiMetricResult[]): KpiResult {
  return { status: "ready", period, metrics, sourceBreakdown: [] };
}

describe("Change Intelligence classification", () => {
  it("separates mathematical direction, metric polarity, and rule-based magnitude", () => {
    expect(metricPolarity("commerce_revenue")).toBe("higher_favorable");
    expect(metricPolarity("cpa")).toBe("lower_favorable");
    expect(metricPolarity("spend")).toBe("context_dependent");

    expect(classifyMetricChange(metric("commerce_revenue", "105", "100", "0.05", "currency"))).toEqual({
      direction: "increased",
      assessment: "favorable",
      significance: "notable",
    });
    expect(classifyMetricChange(metric("cpa", "60", "50", "0.2", "currency"))).toEqual({
      direction: "increased",
      assessment: "unfavorable",
      significance: "major",
    });
    expect(classifyMetricChange(metric("spend", "101", "100", "0.01", "currency"))).toEqual({
      direction: "increased",
      assessment: "context_required",
      significance: "minor",
    });
  });

  it("handles unchanged, unavailable, and previous-zero comparisons without fake percentages", () => {
    expect(classifyMetricChange(metric("orders", "10", "10", "0", "count"))).toEqual({
      direction: "unchanged",
      assessment: "neutral",
      significance: "minor",
    });
    expect(classifyMetricChange(metric("orders", null, "10", null, "count"))).toEqual({
      direction: "unavailable",
      assessment: "context_required",
      significance: "unavailable",
    });
    expect(classifyMetricChange(metric("orders", "10", "0", null, "count"))).toEqual({
      direction: "increased",
      assessment: "favorable",
      significance: "unavailable",
    });
  });
});

describe("runChangeIntelligence gate and movers", () => {
  it("returns the stable blocked result and runs no rules when Data Health is blocked", () => {
    const result = runChangeIntelligence({
      dataHealthStatus: "blocked",
      reportingPeriod: period,
      kpiResult: {
        status: "blocked",
        code: "DATA_HEALTH_BLOCKED",
        message: "KPI execution is unavailable because Data Health is blocked.",
        period,
        metrics: [],
        sourceBreakdown: [],
      },
    });
    expect(result).toEqual({
      status: "blocked",
      code: "DATA_HEALTH_BLOCKED",
      message: "Change Intelligence is unavailable because Data Health is blocked.",
      period,
      observations: [],
      largestPositiveMovers: [],
      largestNegativeMovers: [],
      sourceContributions: [],
      targetEvaluations: [],
    });
  });

  it("ranks at most three favorable and unfavorable movers by comparable percentage magnitude", () => {
    const result = runChangeIntelligence({
      dataHealthStatus: "healthy",
      reportingPeriod: period,
      kpiResult: ready([
        metric("commerce_revenue", "140", "100", "0.4", "currency"),
        metric("orders", "120", "100", "0.2", "count"),
        metric("roas", "1.1", "1", "0.1"),
        metric("ctr", "1.06", "1", "0.06"),
        metric("mer", "0", "0", null),
        metric("cpa", "130", "100", "0.3", "currency"),
        metric("cpc", "120", "100", "0.2", "currency"),
        metric("conversion_rate", "0.9", "1", "-0.1"),
        metric("spend", "200", "100", "1", "currency"),
      ]),
    });
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected ready Change Intelligence.");
    expect(result.largestPositiveMovers.map((item) => item.metric)).toEqual(["commerce_revenue", "orders", "roas"]);
    expect(result.largestNegativeMovers.map((item) => item.metric)).toEqual(["cpa", "cpc", "conversion_rate"]);
    expect(result.largestPositiveMovers.every((item) => item.percentageChange !== null)).toBe(true);
    expect(result.largestPositiveMovers.some((item) => item.metric === "spend" || item.metric === "mer")).toBe(false);
  });
});
