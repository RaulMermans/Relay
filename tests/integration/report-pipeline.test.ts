import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { createAnalysisSnapshot } from "../../lib/persistence/analysis-memory";
import { createClient, createEmptyMemory } from "../../lib/persistence/client-memory";
import { composeReport } from "../../lib/report/compose";
import { ReportCompositionError } from "../../lib/report/types";
import { analyzeWorkspace } from "../../lib/workspace/analyze-workspace";

async function fixtureFile(relativePath: string): Promise<File> {
  const content = await readFile(new URL(`../../fixtures/raw/${relativePath}`, import.meta.url), "utf8");
  return new File([content], relativePath.split("/").pop() ?? "fixture.csv", { type: "text/csv" });
}

describe("report pipeline", () => {
  it("carries authoritative complete-workspace facts through CSV, health, KPI, narrative, and report composition", async () => {
    const files = {
      meta_ads: await fixtureFile("data-health/meta-aligned.csv"),
      google_ads: await fixtureFile("data-health/google-aligned.csv"),
      shopify: await fixtureFile("data-health/shopify-aligned.csv"),
    };
    const analysis = await analyzeWorkspace({ files, expectedSources: ["meta_ads", "google_ads", "shopify"], reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } }, targets: [], ingestionId: (source) => `report-pipeline-${source}` });
    expect(analysis.status).toBe("ready");
    if (analysis.status !== "ready") return;

    const client = createClient(createEmptyMemory(), { id: "pipeline-client", name: "Pipeline client", now: "2026-08-03T12:00:00.000Z" }).clients[0]!;
    const snapshot = createAnalysisSnapshot(analysis, { snapshotId: "pipeline-snapshot", analyzedAt: "2026-08-03T12:00:00.000Z" });
    const report = composeReport({ client, snapshot, generatedAt: "2026-08-03T12:00:00.000Z" });

    expect(report.performance).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "commerce_revenue", value: "€225" }),
      expect.objectContaining({ key: "spend", value: "€55" }),
      expect.objectContaining({ key: "mer", value: "4.09x" }),
    ]));
    expect(report.channels.find((channel) => channel.source === "meta_ads")?.metrics).toEqual(expect.arrayContaining([expect.objectContaining({ key: "roas", value: "2x" })]));
    expect(report.channels.find((channel) => channel.source === "google_ads")?.metrics).toEqual(expect.arrayContaining([expect.objectContaining({ key: "roas", value: "2x" })]));
    expect(JSON.stringify(report)).not.toMatch(/total (attributed )?revenue/i);
  });

  it("fails closed for the existing currency-mismatch workspace scenario", async () => {
    const files = {
      meta_ads: await fixtureFile("data-health/meta-aligned.csv"),
      shopify: await fixtureFile("data-health/shopify-usd.csv"),
    };
    const analysis = await analyzeWorkspace({ files, expectedSources: ["meta_ads", "shopify"], reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } }, targets: [], ingestionId: (source) => `report-blocked-${source}` });
    expect(analysis.status).toBe("ready");
    if (analysis.status !== "ready") return;
    expect(analysis.dataHealth.status).toBe("blocked");

    const client = createClient(createEmptyMemory(), { id: "blocked-client", name: "Blocked client", now: "2026-08-03T12:00:00.000Z" }).clients[0]!;
    const snapshot = createAnalysisSnapshot(analysis, { snapshotId: "blocked-snapshot", analyzedAt: "2026-08-03T12:00:00.000Z" });
    expect(() => composeReport({ client, snapshot, generatedAt: "2026-08-03T12:00:00.000Z" })).toThrow(ReportCompositionError);
  });
});
