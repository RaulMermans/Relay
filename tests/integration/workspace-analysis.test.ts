import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { analyzeWorkspace, WorkspaceAnalysisError } from "../../lib/workspace/analyze-workspace";

async function fixtureFile(relativePath: string): Promise<File> {
  const content = await readFile(new URL(`../../fixtures/raw/${relativePath}`, import.meta.url), "utf8");
  return new File([content], relativePath.split("/").pop() ?? "fixture.csv", { type: "text/csv" });
}

describe("multi-source workspace analysis", () => {
  it("combines Meta, Google, and Shopify once and preserves revenue semantics", async () => {
    const result = await analyzeWorkspace({
      files: {
        meta_ads: await fixtureFile("data-health/meta-aligned.csv"),
        google_ads: await fixtureFile("data-health/google-aligned.csv"),
        shopify: await fixtureFile("data-health/shopify-aligned.csv"),
      },
      expectedSources: ["meta_ads", "google_ads", "shopify"],
      reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } },
      targets: [],
      ingestionId: (source) => `workspace-${source}`,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected ready workspace analysis.");
    expect(result.dataHealth.status).toBe("healthy");
    expect(result.kpis.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "spend", value: "55" }),
      expect.objectContaining({ key: "commerce_revenue", value: "225" }),
      expect.objectContaining({ key: "mer", value: "4.090909090909" }),
    ]));
    expect(result.kpis.metrics.some((item) => item.key === "attributed_revenue" || item.key === "roas")).toBe(false);
    expect(result.kpis.sourceBreakdown).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "meta_ads", metrics: expect.arrayContaining([expect.objectContaining({ key: "roas", value: "2" })]) }),
      expect.objectContaining({ source: "google_ads", metrics: expect.arrayContaining([expect.objectContaining({ key: "roas", value: "2" })]) }),
    ]));
    expect(result.trend).toEqual([
      { date: "2026-08-01", paidSpend: "22", commerceRevenue: "100" },
      { date: "2026-08-02", paidSpend: "33", commerceRevenue: "125" },
    ]);
    expect(result.sources).toHaveLength(3);
    expect(result).not.toHaveProperty("observations");
    expect(JSON.stringify(result)).not.toContain("Summer launch");
  });

  it("returns a focused mapping exception instead of running partial analytics", async () => {
    const result = await analyzeWorkspace({
      files: { meta_ads: await fixtureFile("failures/meta-missing-date.csv") },
      expectedSources: ["meta_ads"],
      reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } },
      targets: [],
      ingestionId: () => "workspace-mapping",
    });

    expect(result).toMatchObject({
      status: "mapping_required",
      exceptions: [{ source: "meta_ads", mapping: { requiredMissing: ["date"] } }],
    });
  });

  it("does not force an incompatible saved mapping into a new CSV", async () => {
    const result = await analyzeWorkspace({
      files: { meta_ads: await fixtureFile("failures/meta-missing-date.csv") },
      expectedSources: ["meta_ads"],
      reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } },
      savedMappings: { meta_ads: [{ header: "Campaign name", canonicalField: "date" }] },
      targets: [],
      ingestionId: () => "workspace-unsafe-saved-mapping",
    });

    expect(result).toMatchObject({
      status: "mapping_required",
      exceptions: [{ source: "meta_ads", mapping: { requiredMissing: ["date"] } }],
    });
  });

  it("keeps paid-media-only attribution separate and explains absent commerce", async () => {
    const result = await analyzeWorkspace({
      files: {
        meta_ads: await fixtureFile("data-health/meta-aligned.csv"),
        google_ads: await fixtureFile("data-health/google-aligned.csv"),
      },
      expectedSources: ["meta_ads", "google_ads"],
      reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } },
      targets: [],
      ingestionId: (source) => `paid-${source}`,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected paid-media analysis.");
    expect(result.dataHealth.status).toBe("review_required");
    expect(result.dataHealth.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "COMMERCE_SOURCE_ABSENT", blocking: false })]));
    expect(result.kpis.status).toBe("ready");
    expect(result.kpis.metrics).toEqual(expect.arrayContaining([expect.objectContaining({ key: "commerce_revenue", value: null })]));
  });

  it("combines Meta and Shopify without requiring Google", async () => {
    const result = await analyzeWorkspace({
      files: {
        meta_ads: await fixtureFile("data-health/meta-aligned.csv"),
        shopify: await fixtureFile("data-health/shopify-aligned.csv"),
      },
      expectedSources: ["meta_ads", "shopify"],
      reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } },
      targets: [],
      ingestionId: (source) => `mixed-${source}`,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected mixed analysis.");
    expect(result.dataHealth.findings.map((item) => item.code)).not.toContain("EXPECTED_SOURCE_MISSING");
    expect(result.kpis.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "spend", value: "25" }),
      expect.objectContaining({ key: "commerce_revenue", value: "225" }),
    ]));
  });

  it("keeps partial coverage reviewable and currency mismatch blocking", async () => {
    const partial = await analyzeWorkspace({
      files: {
        meta_ads: await fixtureFile("data-health/meta-aligned.csv"),
        shopify: await fixtureFile("data-health/shopify-partial-period.csv"),
      },
      expectedSources: ["meta_ads", "shopify"],
      reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } },
      targets: [],
      ingestionId: (source) => `partial-${source}`,
    });
    expect(partial.status).toBe("ready");
    if (partial.status !== "ready") throw new Error("Expected partial analysis.");
    expect(partial.dataHealth.status).toBe("review_required");
    expect(partial.dataHealth.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "PARTIAL_CURRENT_PERIOD_COVERAGE", source: "shopify" })]));

    const blocked = await analyzeWorkspace({
      files: {
        meta_ads: await fixtureFile("data-health/meta-aligned.csv"),
        shopify: await fixtureFile("data-health/shopify-usd.csv"),
      },
      expectedSources: ["meta_ads", "shopify"],
      reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } },
      targets: [],
      ingestionId: (source) => `currency-${source}`,
    });
    expect(blocked.status).toBe("ready");
    if (blocked.status !== "ready") throw new Error("Expected blocked result envelope.");
    expect(blocked.dataHealth.status).toBe("blocked");
    expect(blocked.kpis.status).toBe("blocked");
    expect(blocked.sources.every((source) => source.status === "blocked")).toBe(true);
    expect(blocked.trend).toEqual([]);
  });

  it("evaluates transient targets without persistence", async () => {
    const result = await analyzeWorkspace({
      files: { meta_ads: await fixtureFile("change-intelligence/meta-deterioration.csv") },
      expectedSources: ["meta_ads"],
      reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } },
      targets: [{ id: "cpa", metric: "cpa", scope: "report", operator: "<", value: "6", unit: "currency", currencyCode: "EUR" }],
      ingestionId: () => "target-meta",
    });
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected target analysis.");
    expect(result.changeIntelligence.status).toBe("ready");
    expect(result.changeIntelligence.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "TARGET_BREACH", target: expect.objectContaining({ id: "cpa" }) }),
    ]));
  });

  it("rejects a file whose detected provider does not match its source slot", async () => {
    await expect(analyzeWorkspace({
      files: { meta_ads: await fixtureFile("data-health/google-aligned.csv") },
      expectedSources: ["meta_ads"],
      reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } },
      targets: [],
      ingestionId: () => "workspace-mismatch",
    })).rejects.toEqual(new WorkspaceAnalysisError("SOURCE_SLOT_MISMATCH", "The uploaded CSV does not match its selected source."));
  });
});
