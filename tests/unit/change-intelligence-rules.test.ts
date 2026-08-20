import { describe, expect, it } from "vitest";

import { runChangeIntelligence } from "../../lib/change-intelligence/engine";
import { ChangeIntelligenceInputError, parseChangeTargets } from "../../lib/change-intelligence/targets";
import { subtract } from "../../lib/kpi/arithmetic";
import type { KpiMetricKey, KpiMetricResult, KpiSourceBreakdown } from "../../lib/kpi/types";

const period = {
  currentPeriod: { start: "2026-08-01", end: "2026-08-07" },
  comparisonPeriod: { start: "2026-07-25", end: "2026-07-31" },
};

function metric(
  key: KpiMetricKey,
  current: string | null,
  previous: string | null,
  percentageChange: string | null,
  unit: KpiMetricResult["unit"] = "ratio",
  currencyCode?: string,
): KpiMetricResult {
  return {
    key,
    value: current,
    unit,
    status: current === null ? "unavailable" : "available",
    inputs: current === null ? [] : [
      { source: key === "commerce_revenue" || key === "orders" || key === "aov" ? "shopify" : "meta_ads", field: key, period: "current", observationCount: 1, ...(currencyCode ? { currencyCode } : {}) },
      { source: key === "commerce_revenue" || key === "orders" || key === "aov" ? "shopify" : "meta_ads", field: key, period: "comparison", observationCount: 1, ...(currencyCode ? { currencyCode } : {}) },
    ],
    formula: `synthetic ${key}`,
    comparison: {
      current,
      previous,
      absoluteChange: current === null || previous === null ? null : subtract(current, previous),
      percentageChange,
    },
  };
}

function source(
  provider: KpiSourceBreakdown["source"],
  metrics: KpiMetricResult[],
): KpiSourceBreakdown {
  return { source: provider, metrics };
}

describe("Change Intelligence deterministic rules", () => {
  it("emits non-causal efficiency and rule-based signals with exact KPI evidence", () => {
    const kpiResult = {
      status: "ready" as const,
      period,
      metrics: [
        metric("spend", "220", "200", "0.1", "currency", "EUR"),
        metric("commerce_revenue", "205", "200", "0.025", "currency", "EUR"),
        metric("orders", "8", "10", "-0.2", "count"),
        metric("clicks", "120", "100", "0.2", "count"),
        metric("conversions", "8", "10", "-0.2", "count"),
        metric("mer", "0.931818181818", "1", "-0.068181818182"),
      ],
      sourceBreakdown: [
        source("meta_ads", [
          metric("spend", "115", "100", "0.15", "currency", "EUR"),
          metric("attributed_revenue", "80", "100", "-0.2", "currency", "EUR"),
          metric("roas", "0.695652173913", "1", "-0.304347826087"),
          metric("cpa", "14.375", "10", "0.4375", "currency", "EUR"),
          metric("clicks", "60", "50", "0.2", "count"),
          metric("conversions", "4", "5", "-0.2", "count"),
        ]),
        source("google_ads", [metric("spend", "105", "100", "0.05", "currency", "EUR")]),
      ],
    };

    const result = runChangeIntelligence({ kpiResult, dataHealthStatus: "healthy", reportingPeriod: period });
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected ready Change Intelligence.");

    const divergence = result.observations.find((item) => item.type === "SPEND_REVENUE_DIVERGENCE");
    expect(divergence).toMatchObject({
      assessment: "unfavorable",
      signalCode: "SPEND_OUTPACED_COMMERCE_REVENUE",
    });
    expect(divergence?.evidence.map((item) => item.metric)).toEqual(["spend", "commerce_revenue", "mer"]);

    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "SOURCE_EFFICIENCY_DETERIORATION", source: "meta_ads", assessment: "unfavorable" }),
      expect.objectContaining({ type: "RULE_BASED_SIGNAL", signalCode: "SPEND_UP_CONVERSIONS_DOWN" }),
      expect.objectContaining({ type: "RULE_BASED_SIGNAL", signalCode: "SPEND_UP_ATTRIBUTED_REVENUE_DOWN", source: "meta_ads" }),
      expect.objectContaining({ type: "RULE_BASED_SIGNAL", signalCode: "COMMERCE_REVENUE_UP_ORDERS_DOWN", assessment: "context_required" }),
      expect.objectContaining({ type: "RULE_BASED_SIGNAL", signalCode: "CLICKS_UP_CONVERSIONS_DOWN" }),
    ]));
    expect(result.observations.every((item) => item.evidence.length > 0)).toBe(true);
    expect(new Set(result.observations.map((item) => item.id)).size).toBe(result.observations.length);
  });

  it("calculates signed source contribution only for additive spend and skips a zero total delta", () => {
    const result = runChangeIntelligence({
      dataHealthStatus: "healthy",
      reportingPeriod: period,
      kpiResult: {
        status: "ready",
        period,
        metrics: [metric("spend", "220", "200", "0.1", "currency", "EUR")],
        sourceBreakdown: [
          source("meta_ads", [metric("spend", "115", "100", "0.15", "currency", "EUR"), metric("roas", "2", "1", "1")]),
          source("google_ads", [metric("spend", "105", "100", "0.05", "currency", "EUR")]),
        ],
      },
    });
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected ready Change Intelligence.");
    expect(result.sourceContributions).toEqual([
      expect.objectContaining({ metric: "spend", source: "meta_ads", absoluteChange: "15", totalAbsoluteChange: "20", contributionToTotalChange: "0.75" }),
      expect.objectContaining({ metric: "spend", source: "google_ads", absoluteChange: "5", totalAbsoluteChange: "20", contributionToTotalChange: "0.25" }),
    ]);

    const zero = runChangeIntelligence({
      dataHealthStatus: "healthy",
      reportingPeriod: period,
      kpiResult: {
        status: "ready",
        period,
        metrics: [metric("spend", "200", "200", "0", "currency", "EUR")],
        sourceBreakdown: [source("meta_ads", [metric("spend", "110", "100", "0.1", "currency", "EUR")])],
      },
    });
    expect(zero.status === "ready" ? zero.sourceContributions : null).toEqual([]);
  });
});

describe("Change Intelligence explicit targets", () => {
  it("rejects malformed targets before execution without evaluating arbitrary operators", () => {
    expect(() => parseChangeTargets('[{"id":"bad","metric":"mer","scope":"report","operator":"eval","value":"1","unit":"ratio"}]'))
      .toThrow(ChangeIntelligenceInputError);
    expect(() => parseChangeTargets('[{"id":"bad","metric":"cpa","scope":"source","operator":"<","value":"10","unit":"currency","currencyCode":"EUR"}]'))
      .toThrow(ChangeIntelligenceInputError);
    expect(() => parseChangeTargets('[{"id":"duplicate","metric":"mer","scope":"report","operator":">","value":"1","unit":"ratio"},{"id":"duplicate","metric":"mer","scope":"report","operator":">","value":"1","unit":"ratio"}]'))
      .toThrow(ChangeIntelligenceInputError);
    expect(() => parseChangeTargets('[{"id":"extra","metric":"mer","scope":"report","operator":">","value":"1","unit":"ratio","expression":"process.exit()"}]'))
      .toThrow(ChangeIntelligenceInputError);
  });

  it("orders breaches first while met, unavailable, and incompatible targets create no false breach", () => {
    const targets = parseChangeTargets(JSON.stringify([
      { id: "mer-floor", metric: "mer", scope: "report", operator: ">", value: "1", unit: "ratio" },
      { id: "cpa-ceiling", metric: "cpa", scope: "report", operator: "<", value: "20", unit: "currency", currencyCode: "EUR" },
      { id: "orders-floor", metric: "orders", scope: "report", operator: ">=", value: "10", unit: "count" },
      { id: "wrong-currency", metric: "cpa", scope: "report", operator: "<", value: "20", unit: "currency", currencyCode: "USD" },
    ]));
    const result = runChangeIntelligence({
      dataHealthStatus: "review_required",
      reportingPeriod: period,
      targets,
      kpiResult: {
        status: "ready",
        period,
        metrics: [
          metric("mer", "0.9", "1", "-0.1"),
          metric("cpa", "15", "10", "0.5", "currency", "EUR"),
          metric("orders", null, "10", null, "count"),
        ],
        sourceBreakdown: [],
      },
    });
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected ready Change Intelligence.");
    expect(result.targetEvaluations.map((item) => [item.target.id, item.status, item.unavailableReason])).toEqual([
      ["mer-floor", "breached", undefined],
      ["cpa-ceiling", "met", undefined],
      ["orders-floor", "unavailable", "METRIC_UNAVAILABLE"],
      ["wrong-currency", "unavailable", "CURRENCY_INCOMPATIBLE"],
    ]);
    expect(result.observations[0]).toMatchObject({ type: "TARGET_BREACH", target: { id: "mer-floor" }, priority: 100 });
    expect(result.observations.filter((item) => item.type === "TARGET_BREACH")).toHaveLength(1);
    expect(result.observations.length).toBeLessThanOrEqual(12);
  });

  it("prioritizes a target breach without overstating its change magnitude", () => {
    const result = runChangeIntelligence({
      dataHealthStatus: "healthy",
      reportingPeriod: period,
      targets: [{ id: "mer-floor", metric: "mer", scope: "report", operator: ">", value: "1", unit: "ratio" }],
      kpiResult: { status: "ready", period, metrics: [metric("mer", "0.99", "1", "-0.01")], sourceBreakdown: [] },
    });
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected ready Change Intelligence.");
    expect(result.observations[0]).toMatchObject({ type: "TARGET_BREACH", priority: 100, significance: "minor" });
  });
});

describe("Change Intelligence baseline safety", () => {
  it("does not create spend/revenue divergence from a non-positive baseline", () => {
    const result = runChangeIntelligence({
      dataHealthStatus: "healthy",
      reportingPeriod: period,
      kpiResult: {
        status: "ready",
        period,
        metrics: [
          metric("spend", "120", "100", "0.2", "currency", "EUR"),
          metric("commerce_revenue", "-50", "-100", "-0.5", "currency", "EUR"),
          metric("mer", "-0.416666666667", "-1", "-0.583333333333"),
        ],
        sourceBreakdown: [],
      },
    });
    expect(result.status).toBe("ready");
    expect(result.status === "ready" && result.observations.some((item) => item.type === "SPEND_REVENUE_DIVERGENCE")).toBe(false);
  });
});
