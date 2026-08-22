import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { createAnalysisSnapshot } from "../../lib/persistence/analysis-memory";
import { createClient, createEmptyMemory } from "../../lib/persistence/client-memory";
import { composeReport, isReportStale, reportFilename } from "../../lib/report/compose";
import { exportReport, type PrintBoundary } from "../../lib/report/export";
import { ReportCompositionError } from "../../lib/report/types";
import { analyzeWorkspace } from "../../lib/workspace/analyze-workspace";

async function fixtureFile(relativePath: string): Promise<File> {
  const content = await readFile(new URL(`../../fixtures/raw/${relativePath}`, import.meta.url), "utf8");
  return new File([content], relativePath.split("/").pop() ?? "fixture.csv", { type: "text/csv" });
}

async function readyReportInput(includeShopify = true) {
  const files = {
    meta_ads: await fixtureFile("data-health/meta-aligned.csv"),
    google_ads: await fixtureFile("data-health/google-aligned.csv"),
    ...(includeShopify ? { shopify: await fixtureFile("data-health/shopify-aligned.csv") } : {}),
  };
  const analysis = await analyzeWorkspace({ files, expectedSources: Object.keys(files) as Array<keyof typeof files>, reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } }, targets: [], ingestionId: (source) => `report-${source}` });
  if (analysis.status !== "ready") throw new Error("Expected ready analysis");
  const memory = createClient(createEmptyMemory(), { id: "acme", name: "Acme / Skincare", now: "2026-08-03T12:00:00.000Z" });
  const client = memory.clients[0]!;
  const snapshot = createAnalysisSnapshot(analysis, { snapshotId: "snapshot-001", analyzedAt: "2026-08-03T12:00:00.000Z" });
  return { client, snapshot };
}

describe("report composition", () => {
  it("composes a deterministic, source-safe document from an authoritative snapshot", async () => {
    const { client, snapshot } = await readyReportInput();
    const first = composeReport({ client, snapshot, generatedAt: "2026-08-03T12:00:00.000Z" });
    const second = composeReport({ client, snapshot, generatedAt: "2026-08-04T12:00:00.000Z" });
    expect(first.reportId).toBe(second.reportId);
    expect(first.performance).toEqual(expect.arrayContaining([expect.objectContaining({ key: "commerce_revenue", value: "€225" }), expect.objectContaining({ key: "mer", value: "4.09x" })]));
    expect(first.channels.find((channel) => channel.source === "meta_ads")?.metrics).toEqual(expect.arrayContaining([expect.objectContaining({ key: "roas", value: "2x" })]));
    expect(JSON.stringify(first)).not.toContain("total attributed revenue");
    expect(JSON.stringify(first)).not.toContain("Summer launch");
    expect(reportFilename(first)).toBe("relay-acme-skincare-2026-08-01-to-2026-08-02.pdf");
    expect(isReportStale(first, snapshot)).toBe(false);
    expect(isReportStale(first, { ...snapshot, id: "snapshot-002" })).toBe(true);
  });

  it("keeps paid-media-only reports honest about unavailable commerce facts", async () => {
    const { client, snapshot } = await readyReportInput(false);
    const report = composeReport({ client, snapshot, generatedAt: "2026-08-03T12:00:00.000Z" });
    expect(report.missingCommerce).toBe(true);
    expect(report.performance.map((metric) => metric.key)).not.toContain("commerce_revenue");
    expect(report.performance.map((metric) => metric.key)).not.toContain("mer");
    expect(report.methodology).toContain("Commerce Revenue is reported from Shopify only.");
    expect(report.channels.map((channel) => channel.source)).toEqual(["meta_ads", "google_ads"]);
  });

  it("fails closed when Data Health blocks analytics or a saved snapshot lacks deterministic narrative", async () => {
    const { client, snapshot } = await readyReportInput();
    expect(() => composeReport({ client, snapshot: { ...snapshot, dataHealth: { ...snapshot.dataHealth, status: "blocked" } }, generatedAt: "2026-08-03T12:00:00.000Z" })).toThrow(ReportCompositionError);
    expect(() => composeReport({ client, snapshot: { ...snapshot, narrative: undefined }, generatedAt: "2026-08-03T12:00:00.000Z" })).toThrow(/complete analysis snapshot/);
  });

  it("honors reporting preferences, preserves warnings, and uses only available source metrics", async () => {
    const { client, snapshot } = await readyReportInput();
    const report = composeReport({
      client: { ...client, reportPreferences: { sections: ["performance", "attention"] } },
      snapshot: {
        ...snapshot,
        dataHealth: {
          ...snapshot.dataHealth,
          status: "review_required",
          findings: [{ id: "coverage", code: "PARTIAL_COVERAGE", category: "dates", severity: "warning", status: "open", blocking: false, message: "Shopify coverage ends one day early.", evidence: {} }],
        },
      },
      generatedAt: "2026-08-03T12:00:00.000Z",
    });
    expect(report.sections).toEqual(["performance", "attention"]);
    expect(report.healthFindings).toEqual([expect.objectContaining({ message: "Shopify coverage ends one day early." })]);
    expect(report.channels.find((channel) => channel.source === "google_ads")?.metrics.map((metric) => metric.key)).not.toContain("attributed_revenue");
  });

  it("sanitizes an empty or hostile client name in the suggested filename", async () => {
    const { client, snapshot } = await readyReportInput();
    const report = composeReport({ client: { ...client, name: " ../../\\\u0000 " }, snapshot, generatedAt: "2026-08-03T12:00:00.000Z" });
    expect(reportFilename(report)).toBe("relay-client-2026-08-01-to-2026-08-02.pdf");
  });

  it("invokes the browser print boundary once for a current report and never for a stale one", async () => {
    const { client, snapshot } = await readyReportInput();
    const report = composeReport({ client, snapshot, generatedAt: "2026-08-03T12:00:00.000Z" });
    const calls: string[] = [];
    const boundary: PrintBoundary = {
      getTitle: () => "Relay",
      setTitle: (title) => calls.push(`title:${title}`),
      print: () => calls.push("print"),
      defer: (callback) => callback(),
    };
    expect(exportReport(report, false, boundary)).toBe(true);
    expect(calls.filter((call) => call === "print")).toHaveLength(1);
    expect(calls).toEqual(["title:relay-acme-skincare-2026-08-01-to-2026-08-02", "print", "title:Relay"]);
    calls.length = 0;
    expect(exportReport(report, true, boundary)).toBe(false);
    expect(calls).toEqual([]);
  });
});
