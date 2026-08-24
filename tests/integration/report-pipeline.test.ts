import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import type { ChangeTarget } from "../../lib/change-intelligence/types";
import type { ProviderSource } from "../../lib/data-health/types";
import { formatMetricValue } from "../../lib/presentation";
import { createAnalysisSnapshot } from "../../lib/persistence/analysis-memory";
import { createClient, createEmptyMemory } from "../../lib/persistence/client-memory";
import { composeReport } from "../../lib/report/compose";
import { ReportCompositionError } from "../../lib/report/types";
import { analyzeWorkspace } from "../../lib/workspace/analyze-workspace";

type Scenario = {
  label: string;
  files: Partial<Record<ProviderSource, string>>;
  targets?: ChangeTarget[];
  blocked?: boolean;
  missingCommerce?: boolean;
};

async function fixtureFile(relativePath: string): Promise<File> {
  const content = await readFile(new URL(`../../fixtures/raw/${relativePath}`, import.meta.url), "utf8");
  return new File([content], relativePath.split("/").pop() ?? "fixture.csv", { type: "text/csv" });
}

const scenarios: Scenario[] = [
  { label: "complete", files: { meta_ads: "data-health/meta-aligned.csv", google_ads: "data-health/google-aligned.csv", shopify: "data-health/shopify-aligned.csv" } },
  { label: "paid media only", files: { meta_ads: "data-health/meta-aligned.csv", google_ads: "data-health/google-aligned.csv" }, missingCommerce: true },
  { label: "target breach", files: { meta_ads: "change-intelligence/meta-deterioration.csv" }, targets: [{ id: "cpa-ceiling", metric: "cpa", scope: "source", source: "meta_ads", operator: "<", value: "6", unit: "currency", currencyCode: "EUR" }] },
  { label: "Data Health warning", files: { meta_ads: "data-health/meta-aligned.csv", shopify: "data-health/shopify-partial-period.csv" } },
  { label: "currency mismatch", files: { meta_ads: "data-health/meta-aligned.csv", shopify: "data-health/shopify-usd.csv" }, blocked: true },
  { label: "mixed channel performance", files: { meta_ads: "data-health/meta-aligned.csv", shopify: "data-health/shopify-aligned.csv" } },
];

describe("authoritative analysis to report pipeline", () => {
  for (const scenario of scenarios) {
    it(`keeps ${scenario.label} report facts aligned with the workspace pipeline`, async () => {
      const files = Object.fromEntries(await Promise.all(Object.entries(scenario.files).map(async ([source, path]) => [source, await fixtureFile(path)]))) as Partial<Record<ProviderSource, File>>;
      const analysis = await analyzeWorkspace({
        files,
        expectedSources: Object.keys(files) as ProviderSource[],
        reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } },
        targets: scenario.targets ?? [],
        ingestionId: (source) => `report-${scenario.label}-${source}`,
      });
      expect(analysis.status).toBe("ready");
      if (analysis.status !== "ready") throw new Error("Expected a completed workspace analysis.");

      const client = createClient(createEmptyMemory(), { id: "report-client", name: "Report Client", now: "2026-08-03T12:00:00.000Z" }).clients[0]!;
      const snapshot = createAnalysisSnapshot(analysis, { snapshotId: `snapshot-${scenario.label}`, analyzedAt: "2026-08-03T12:00:00.000Z" });
      if (scenario.blocked) {
        expect(() => composeReport({ client, snapshot, generatedAt: "2026-08-03T12:00:00.000Z" })).toThrow(ReportCompositionError);
        return;
      }

      const report = composeReport({ client, snapshot, generatedAt: "2026-08-03T12:00:00.000Z" });
      expect(report.executive).toEqual({ headline: analysis.narrative.headline, summary: analysis.narrative.summary });
      expect(report.dataHealth.status).toBe(analysis.dataHealth.status);
      expect(report.missingCommerce).toBe(scenario.missingCommerce ?? !scenario.files.shopify);
      if (analysis.kpis.status !== "ready") throw new Error("Expected ready KPIs for an exportable report.");

      for (const metric of report.performance) {
        const fact = analysis.kpis.metrics.find((item) => item.key === metric.key);
        expect(fact).toBeDefined();
        expect(metric.value).toBe(formatMetricValue(fact!, fact!.value));
      }
      for (const channel of report.channels) {
        const facts = analysis.kpis.sourceBreakdown.find((item) => item.source === channel.source)?.metrics ?? [];
        for (const metric of channel.metrics) {
          const fact = facts.find((item) => item.key === metric.key);
          expect(fact).toBeDefined();
          expect(metric.value).toBe(formatMetricValue(fact!, fact!.value));
        }
      }
      expect(JSON.stringify(report)).not.toContain("canonicalObservations");
      expect(JSON.stringify(report)).not.toContain("sourceRow");
    });
  }
});
