import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { runDataHealth } from "../../lib/data-health/run-data-health";
import { runKpiEngine } from "../../lib/kpi/engine";
import { normalizeCsvFile } from "../../lib/normalization/normalize-csv";

const reportingPeriod = { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } };

async function fixtureFile(relativePath: string): Promise<File> {
  const content = await readFile(new URL(`../../fixtures/raw/${relativePath}`, import.meta.url), "utf8");
  const pathParts = relativePath.split("/");
  return new File([content], pathParts[pathParts.length - 1] ?? "fixture.csv", { type: "text/csv" });
}

async function pipeline(paths: string[], expectedSources: Array<"meta_ads" | "google_ads" | "shopify">) {
  const normalized = await Promise.all(paths.map(async (path, index) => {
    const result = await normalizeCsvFile(await fixtureFile(path), { ingestionId: `kpi-pipeline-${index}` });
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
  return { dataHealth, kpis: runKpiEngine({ observations, dataHealthStatus: dataHealth.status, reportingPeriod: dataHealth.reportingPeriod }) };
}

function value(result: Extract<Awaited<ReturnType<typeof pipeline>>["kpis"], { status: "ready" }>, key: string): string | null {
  return result.metrics.find((metric) => metric.key === key)?.value ?? null;
}

describe("raw CSV through Data Health and KPI Engine", () => {
  it("matches the manually maintained healthy multi-source golden", async () => {
    const { dataHealth, kpis } = await pipeline([
      "data-health/meta-aligned.csv",
      "data-health/google-aligned.csv",
      "data-health/shopify-aligned.csv",
    ], ["meta_ads", "google_ads", "shopify"]);
    const expected = JSON.parse(await readFile(new URL("../../fixtures/expected/kpi/healthy-complete.json", import.meta.url), "utf8"));

    expect(dataHealth.status).toBe("healthy");
    expect(kpis.status).toBe("ready");
    if (kpis.status !== "ready") throw new Error("Expected ready KPI result.");
    for (const [key, comparison] of Object.entries(expected.metrics as Record<string, object>)) {
      expect(kpis.metrics.find((metric) => metric.key === key)).toMatchObject({
        value: (comparison as { value: string | null }).value,
        comparison: {
          previous: (comparison as { previous: string | null }).previous,
          absoluteChange: (comparison as { absoluteChange: string | null }).absoluteChange,
          percentageChange: (comparison as { percentageChange: string | null }).percentageChange,
        },
      });
    }
    for (const [source, metrics] of Object.entries(expected.sourceBreakdown as Record<string, Record<string, string>>)) {
      const breakdown = kpis.sourceBreakdown.find((item) => item.source === source);
      for (const [key, expectedValue] of Object.entries(metrics)) {
        expect(breakdown?.metrics).toEqual(expect.arrayContaining([expect.objectContaining({ key, value: expectedValue })]));
      }
    }
  });

  it("allows review-required data to execute", async () => {
    const { dataHealth, kpis } = await pipeline([
      "data-health/meta-aligned.csv",
      "data-health/shopify-partial-period.csv",
    ], ["meta_ads", "shopify"]);
    expect(dataHealth.status).toBe("review_required");
    expect(kpis.status).toBe("ready");
  });

  it("refuses KPI execution when Data Health blocks incompatible currency", async () => {
    const { dataHealth, kpis } = await pipeline([
      "data-health/meta-aligned.csv",
      "data-health/shopify-usd.csv",
    ], ["meta_ads", "shopify"]);
    expect(dataHealth.status).toBe("blocked");
    expect(kpis).toMatchObject({ status: "blocked", code: "DATA_HEALTH_BLOCKED", metrics: [], sourceBreakdown: [] });
  });

  it("uses Shopify gross revenue for commerce KPIs and provider attribution only for same-source ROAS", async () => {
    const { kpis } = await pipeline([
      "data-health/meta-aligned.csv",
      "data-health/google-aligned.csv",
      "data-health/shopify-aligned.csv",
    ], ["meta_ads", "google_ads", "shopify"]);
    expect(kpis.status).toBe("ready");
    if (kpis.status !== "ready") throw new Error("Expected ready KPI result.");
    expect(value(kpis, "commerce_revenue")).toBe("225");
    expect(value(kpis, "mer")).toBe("4.090909090909");
    expect(value(kpis, "aov")).toBe("112.5");
    expect(kpis.metrics.some((metric) => metric.key === "attributed_revenue" || metric.key === "roas")).toBe(false);
    expect(kpis.sourceBreakdown.find((item) => item.source === "meta_ads")?.metrics).toEqual(expect.arrayContaining([expect.objectContaining({ key: "roas", value: "2" })]));
    expect(kpis.sourceBreakdown.find((item) => item.source === "google_ads")?.metrics).toEqual(expect.arrayContaining([expect.objectContaining({ key: "roas", value: "2" })]));
  });
});
