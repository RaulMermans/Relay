import { describe, expect, it } from "vitest";

import type { ChangeObservation } from "../../lib/change-intelligence/types";
import type { DataHealthResult, ResolvedReportingPeriod } from "../../lib/data-health/types";
import { generateNarrative } from "../../lib/narrative/generate";
import type { KpiExecutionResult } from "../../lib/kpi/types";
import type { WorkspaceSourceSummary } from "../../lib/workspace/analyze-workspace";

const period: ResolvedReportingPeriod = {
  currentPeriod: { start: "2026-08-01", end: "2026-08-07" },
  comparisonPeriod: { start: "2026-07-25", end: "2026-07-31" },
};

function health(status: DataHealthResult["status"], findings: DataHealthResult["findings"] = []): DataHealthResult {
  return { status, counts: { info: 0, warning: findings.filter((item) => item.severity === "warning").length, error: findings.filter((item) => item.severity === "error").length }, checksRun: [], findings, sourceCoverage: [], reportingPeriod: period };
}

const readyKpis: KpiExecutionResult = { status: "ready", period, metrics: [], sourceBreakdown: [] };
const blockedKpis: KpiExecutionResult = { status: "blocked", code: "DATA_HEALTH_BLOCKED", message: "KPI execution is unavailable because Data Health is blocked.", period, metrics: [], sourceBreakdown: [] };

function observation(overrides: Partial<ChangeObservation> & Pick<ChangeObservation, "id" | "metric">): ChangeObservation {
  return {
    type: "METRIC_CHANGE",
    scope: "report",
    currentValue: "1",
    previousValue: "0.8",
    absoluteChange: "0.2",
    percentageChange: "0.25",
    direction: "increased",
    assessment: "context_required",
    significance: "major",
    priority: 80,
    evidence: [],
    ...overrides,
  };
}

describe("Narrative Intelligence", () => {
  it("covers deterministic golden growth, decline, channel, target, health, and paid-only scenarios", () => {
    const source: WorkspaceSourceSummary = { source: "meta_ads", status: "ready", normalizedRowCount: 1, dateRange: { start: "2026-08-01", end: "2026-08-07" }, currencies: ["EUR"] };
    const base = (observations: ChangeObservation[], dataHealth = health("healthy"), sources = [source]) => generateNarrative({
      reportingPeriod: period,
      dataHealth,
      kpis: dataHealth.status === "blocked" ? blockedKpis : readyKpis,
      observations: dataHealth.status === "blocked" ? { status: "blocked", observations: [] } : { status: "ready", observations },
      targets: [],
      sources,
      freshness: "current",
    });
    const growth = observation({ id: "COMMERCE_REVENUE_CHANGE:report:all:commerce_revenue", metric: "commerce_revenue", assessment: "favorable" });
    const weakCpa = observation({ id: "CPA_MOVEMENT:source:meta_ads:cpa", metric: "cpa", scope: "source", source: "meta_ads", assessment: "unfavorable" });
    const improvedMer = observation({ id: "MER_MOVEMENT:report:all:mer", metric: "mer", assessment: "favorable" });

    // A: growth + weaker efficiency; B: growth + stronger efficiency; C: decline.
    expect(base([growth, weakCpa]).headline).toBe("Growth continued, but efficiency softened.");
    expect(base([growth, improvedMer]).headline).toBe("Performance improved with stronger efficiency.");
    expect(base([observation({ id: "COMMERCE_REVENUE_CHANGE:report:all:commerce_revenue:down", metric: "commerce_revenue", direction: "decreased", assessment: "unfavorable" }), weakCpa]).headline).toBe("Performance declined versus the previous period.");

    // D: mixed provider performance retains one primary story per provider.
    const mixed = base([weakCpa, observation({ id: "ROAS_MOVEMENT:source:google_ads:roas", metric: "roas", scope: "source", source: "google_ads", assessment: "favorable" })], health("healthy"), [source, { ...source, source: "google_ads" }]);
    expect(mixed.channelSummaries.map((item) => item.title)).toEqual(expect.arrayContaining(["Meta Ads efficiency weakened", "Google Ads efficiency improved"]));

    // E: paid media only; F: a minor target breach; G: health warning; H: blocked currency mismatch.
    const paidOnly = base([observation({ id: "METRIC_CHANGE:source:meta_ads:attributed_revenue", metric: "attributed_revenue", scope: "source", source: "meta_ads" })], health("review_required", [{ id: "COMMERCE_SOURCE_ABSENT:all", code: "COMMERCE_SOURCE_ABSENT", category: "source_coverage", severity: "warning", status: "open", message: "Shopify missing", evidence: {}, blocking: false }]));
    expect(JSON.stringify(paidOnly)).toContain("Shopify data isn’t included");
    expect(JSON.stringify(paidOnly)).not.toContain("total revenue");
    const target = base([observation({ id: "TARGET_BREACH:meta-cpa", type: "TARGET_BREACH", metric: "cpa", significance: "minor", assessment: "unfavorable" })]);
    expect(target.attention).toEqual(expect.arrayContaining([expect.objectContaining({ type: "target" })]));
    const warning = base([], health("review_required", [{ id: "EXPECTED_SOURCE_MISSING:google", code: "EXPECTED_SOURCE_MISSING", category: "source_coverage", severity: "warning", status: "open", message: "Google missing", evidence: {}, blocking: false }]));
    expect(warning.attention).toEqual(expect.arrayContaining([expect.objectContaining({ type: "health" })]));
    expect(base([], health("blocked", [{ id: "CROSS_SOURCE_CURRENCY_MISMATCH:all", code: "CROSS_SOURCE_CURRENCY_MISMATCH", category: "currency", severity: "error", status: "open", message: "Currency mismatch", evidence: {}, blocking: true }])).status).toBe("blocked");
  });

  it("is deterministic, evidence-backed, and preserves provider-attribution language", () => {
    const context = {
      reportingPeriod: period,
      dataHealth: health("healthy"),
      kpis: readyKpis,
      observations: {
        status: "ready" as const,
        observations: [
          observation({ id: "COMMERCE_REVENUE_CHANGE:report:all:commerce_revenue", metric: "commerce_revenue", assessment: "favorable" }),
          observation({ id: "CPA_MOVEMENT:source:meta_ads:cpa", metric: "cpa", scope: "source", source: "meta_ads", assessment: "unfavorable", percentageChange: "0.062" }),
          observation({ id: "METRIC_CHANGE:source:google_ads:attributed_revenue", metric: "attributed_revenue", scope: "source", source: "google_ads", assessment: "context_required", percentageChange: "0.116" }),
        ],
      },
      targets: [],
      sources: [{ source: "meta_ads" as const, status: "ready" as const, normalizedRowCount: 1, dateRange: { start: "2026-08-01", end: "2026-08-07" }, currencies: ["EUR"] }],
      freshness: "current" as const,
    };

    const first = generateNarrative(context);
    expect(generateNarrative(context)).toEqual(first);
    expect(first.headline).toBe("Growth continued, but efficiency softened.");
    expect(JSON.stringify(first)).toContain("Google Ads attributed revenue");
    expect(JSON.stringify(first)).not.toContain("total revenue");
    for (const item of [...first.highlights, ...first.attention, ...first.channelSummaries]) {
      expect(item.id).toMatch(/^narrative:/);
      expect(item.evidenceRefs).not.toHaveLength(0);
    }
  });

  it("suppresses performance commentary when Data Health is blocked", () => {
    const result = generateNarrative({
      reportingPeriod: period,
      dataHealth: health("blocked", [{ id: "CROSS_SOURCE_CURRENCY_MISMATCH:all", code: "CROSS_SOURCE_CURRENCY_MISMATCH", category: "currency", severity: "error", status: "open", message: "Currency mismatch", evidence: {}, blocking: true }]),
      kpis: blockedKpis,
      observations: { status: "blocked", observations: [] },
      targets: [],
      sources: [],
      freshness: "old",
    });

    expect(result).toMatchObject({ status: "blocked", headline: "Performance is unavailable until data issues are resolved." });
    expect(result.highlights).toEqual([]);
    expect(result.attention).toEqual(expect.arrayContaining([expect.objectContaining({ type: "health" })]));
  });
});
