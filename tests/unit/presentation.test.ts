import { describe, expect, it } from "vitest";

import type { ChangeObservation } from "../../lib/change-intelligence/types";
import type { DataHealthFinding } from "../../lib/data-health/types";
import type { KpiMetricResult } from "../../lib/kpi/types";
import {
  curateObservations,
  formatMetricValue,
  formatPercentageChange,
  humanizeDataHealthFinding,
  presentObservation,
} from "../../lib/presentation";

function metric(overrides: Partial<KpiMetricResult> = {}): KpiMetricResult {
  return {
    key: "spend",
    value: "1764",
    unit: "currency",
    status: "available",
    inputs: [{ source: "meta_ads", field: "spend", period: "current", observationCount: 1, currencyCode: "EUR" }],
    formula: "sum spend",
    comparison: { current: "1764", previous: "1600", absoluteChange: "164", percentageChange: "0.1025" },
    ...overrides,
  };
}

function observation(overrides: Partial<ChangeObservation> = {}): ChangeObservation {
  return {
    id: "METRIC_CHANGE:source:meta_ads:cpa",
    type: "CPA_MOVEMENT",
    metric: "cpa",
    scope: "source",
    source: "meta_ads",
    currentValue: "42",
    previousValue: "39.55",
    absoluteChange: "2.45",
    percentageChange: "0.061946902655",
    direction: "increased",
    assessment: "unfavorable",
    significance: "notable",
    priority: 60,
    evidence: [],
    ...overrides,
  };
}

describe("presentation formatting", () => {
  it("formats authoritative money, counts, ratios, percentages, signs, and unavailable values", () => {
    expect(formatMetricValue(metric(), "1764")).toBe("€1,764");
    expect(formatMetricValue(metric({ key: "orders", unit: "count", inputs: [] }), "4933")).toBe("4,933");
    expect(formatMetricValue(metric({ key: "roas", unit: "ratio", inputs: [] }), "7.015306122449")).toBe("7.02x");
    expect(formatMetricValue(metric({ key: "ctr", unit: "ratio", inputs: [] }), "0.1552062837")).toBe("15.5%");
    expect(formatMetricValue(metric(), null)).toBe("—");
    expect(formatPercentageChange("0.1552062837")).toBe("+15.5%");
    expect(formatPercentageChange("-0.0619")).toBe("−6.2%");
  });
});

describe("deterministic product copy", () => {
  it("humanizes a missing commerce source while preserving structured truth", () => {
    const finding: DataHealthFinding = {
      id: "COMMERCE_SOURCE_ABSENT:all-sources",
      code: "COMMERCE_SOURCE_ABSENT",
      category: "reconciliation",
      severity: "warning",
      status: "open",
      message: "Paid-platform attribution is present without a commerce source.",
      evidence: { advertisingSourceCount: 2 },
      blocking: false,
    };

    expect(humanizeDataHealthFinding(finding)).toEqual({
      title: "Shopify data isn’t included",
      description: "Paid-media performance is available, but store revenue and MER are unavailable.",
      action: "Add Shopify CSV",
      finding,
    });
  });

  it("states unfavorable CPA polarity directly without inventing causality", () => {
    expect(presentObservation(observation())).toMatchObject({
      title: "Efficiency declined",
      detail: "Meta Ads CPA increased 6.2%.",
      tone: "unfavorable",
    });
  });

  it("curates distinct stories and suppresses a duplicate source efficiency card", () => {
    const items = [
      observation({ id: "target", type: "TARGET_BREACH", priority: 100, target: { id: "cpa", metric: "cpa", scope: "source", source: "meta_ads", operator: "<", value: "38", unit: "currency", currencyCode: "EUR" } }),
      observation({ id: "efficiency", type: "SOURCE_EFFICIENCY_DETERIORATION", priority: 80, metric: "roas" }),
      observation({ id: "cpa", type: "CPA_MOVEMENT", priority: 60 }),
      observation({ id: "clicks", type: "METRIC_CHANGE", metric: "clicks", source: undefined, scope: "report", assessment: "favorable", direction: "increased", priority: 40 }),
      observation({ id: "orders", type: "ORDERS_CHANGE", metric: "orders", source: undefined, scope: "report", assessment: "favorable", direction: "increased", priority: 50 }),
    ];

    expect(curateObservations(items, 4).map((item) => item.id)).toEqual(["target", "efficiency", "orders", "clicks"]);
  });
});
