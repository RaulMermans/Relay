import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { runChangeIntelligence } from "../../lib/change-intelligence/engine";
import { runDataHealth } from "../../lib/data-health/run-data-health";
import { runKpiEngine } from "../../lib/kpi/engine";
import { normalizeCsvFile } from "../../lib/normalization/normalize-csv";
import type { ProviderSource } from "../../lib/data-health/types";
import type { ChangeTarget } from "../../lib/change-intelligence/types";

const reportingPeriod = { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } };

async function fixtureFile(relativePath: string): Promise<File> {
  const content = await readFile(new URL(`../../fixtures/raw/${relativePath}`, import.meta.url), "utf8");
  const pathParts = relativePath.split("/");
  return new File([content], pathParts[pathParts.length - 1] ?? "synthetic.csv", { type: "text/csv" });
}

async function pipeline(paths: string[], expectedSources: ProviderSource[], targets: ChangeTarget[] = []) {
  const normalized = await Promise.all(paths.map(async (path, index) => {
    const result = await normalizeCsvFile(await fixtureFile(path), { ingestionId: `change-intelligence-${index}` });
    expect(result.status).toBe("normalized");
    if (result.status !== "normalized") throw new Error("Fixture should normalize.");
    return result;
  }));
  const observations = normalized.flatMap((result) => result.observations);
  const dataHealth = runDataHealth({
    observations,
    reportingPeriod,
    expectedSources,
    sourceInputs: normalized.map((result) => ({ source: result.provider, mapping: result.mapping })),
  });
  const kpis = runKpiEngine({ observations, dataHealthStatus: dataHealth.status, reportingPeriod: dataHealth.reportingPeriod });
  const changes = runChangeIntelligence({ kpiResult: kpis, dataHealthStatus: dataHealth.status, reportingPeriod: dataHealth.reportingPeriod, targets });
  return { dataHealth, kpis, changes };
}

describe("raw CSV through Change Intelligence", () => {
  it("detects healthy performance and efficiency improvement", async () => {
    const { dataHealth, changes } = await pipeline([
      "change-intelligence/meta-efficient-growth.csv",
      "change-intelligence/shopify-fast-growth.csv",
    ], ["meta_ads", "shopify"]);
    expect(dataHealth.status).toBe("healthy");
    expect(changes.status).toBe("ready");
    if (changes.status !== "ready") throw new Error("Expected ready Change Intelligence.");
    expect(changes.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "SPEND_REVENUE_DIVERGENCE", assessment: "favorable", signalCode: "COMMERCE_REVENUE_OUTPACED_SPEND" }),
      expect.objectContaining({ type: "SOURCE_EFFICIENCY_IMPROVEMENT", source: "meta_ads" }),
    ]));
  });

  it("detects efficiency deterioration and evaluates an explicit target breach", async () => {
    const { dataHealth, changes } = await pipeline([
      "change-intelligence/meta-deterioration.csv",
      "change-intelligence/shopify-slow-growth.csv",
    ], ["meta_ads", "shopify"], [{ id: "mer-floor", metric: "mer", scope: "report", operator: ">", value: "1.8", unit: "ratio" }]);
    expect(dataHealth.status).toBe("healthy");
    expect(changes.status).toBe("ready");
    if (changes.status !== "ready") throw new Error("Expected ready Change Intelligence.");
    expect(changes.observations[0]).toMatchObject({ type: "TARGET_BREACH", target: { id: "mer-floor" } });
    expect(changes.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "SPEND_REVENUE_DIVERGENCE", assessment: "unfavorable" }),
      expect.objectContaining({ type: "SOURCE_EFFICIENCY_DETERIORATION", source: "meta_ads" }),
    ]));
  });

  it("allows review-required Data Health and blocks Change Intelligence when Data Health blocks", async () => {
    const review = await pipeline([
      "data-health/meta-aligned.csv",
      "data-health/shopify-partial-period.csv",
    ], ["meta_ads", "shopify"]);
    expect(review.dataHealth.status).toBe("review_required");
    expect(review.changes.status).toBe("ready");

    const blocked = await pipeline([
      "data-health/meta-aligned.csv",
      "data-health/shopify-usd.csv",
    ], ["meta_ads", "shopify"]);
    expect(blocked.dataHealth.status).toBe("blocked");
    expect(blocked.kpis.status).toBe("blocked");
    expect(blocked.changes).toMatchObject({ status: "blocked", code: "DATA_HEALTH_BLOCKED", observations: [] });
  });

  it("keeps Shopify commerce revenue separate from provider attribution in all evidence", async () => {
    const { changes } = await pipeline([
      "change-intelligence/meta-deterioration.csv",
      "change-intelligence/shopify-slow-growth.csv",
    ], ["meta_ads", "shopify"]);
    expect(changes.status).toBe("ready");
    if (changes.status !== "ready") throw new Error("Expected ready Change Intelligence.");
    const revenue = changes.observations.find((item) => item.type === "COMMERCE_REVENUE_CHANGE");
    expect(revenue?.evidence).toEqual([expect.objectContaining({ metric: "commerce_revenue", scope: "report" })]);
    expect(revenue?.evidence[0]).not.toHaveProperty("source");
    const providerRevenueEvidence = changes.observations.flatMap((item) => item.evidence)
      .filter((item) => item.metric === "attributed_revenue");
    expect(providerRevenueEvidence.length).toBeGreaterThan(0);
    expect(providerRevenueEvidence.every((item) => item.scope === "source" && item.source === "meta_ads")).toBe(true);
  });
});
