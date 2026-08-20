import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { runChangeIntelligence } from "../../lib/change-intelligence/engine";
import { subtract } from "../../lib/kpi/arithmetic";
import type { ChangeTarget } from "../../lib/change-intelligence/types";
import type { ProviderSource } from "../../lib/data-health/types";
import type { KpiMetricKey, KpiMetricResult, KpiUnit } from "../../lib/kpi/types";

const period = {
  currentPeriod: { start: "2026-08-01", end: "2026-08-07" },
  comparisonPeriod: { start: "2026-07-25", end: "2026-07-31" },
};
const cases = [
  "growth", "efficiency-deterioration", "efficiency-improvement", "meta-deterioration", "google-improvement",
  "target-breach", "target-met", "previous-zero", "missing-kpi", "revenue-semantics",
];

type GoldenFact = {
  scope: "report" | "source";
  source?: ProviderSource;
  key: KpiMetricKey;
  unit: KpiUnit;
  current: string | null;
  previous: string | null;
  percentageChange: string | null;
  currencyCode?: string;
};
type GoldenCase = {
  label: string;
  facts: GoldenFact[];
  targets?: ChangeTarget[];
  expectedObservations: Array<Record<string, unknown>>;
  absentTypes?: string[];
  expectedTargetStatuses?: Array<[string, string]>;
  expectedPositiveMovers?: string[];
};

function metric(fact: GoldenFact): KpiMetricResult {
  return {
    key: fact.key,
    value: fact.current,
    unit: fact.unit,
    status: fact.current === null ? "unavailable" : "available",
    inputs: fact.current === null ? [] : [{
      source: fact.source ?? (fact.key === "commerce_revenue" || fact.key === "orders" ? "shopify" : "meta_ads"),
      field: fact.key,
      period: "current",
      observationCount: 1,
      ...(fact.currencyCode ? { currencyCode: fact.currencyCode } : {}),
    }],
    formula: `golden ${fact.key}`,
    comparison: {
      current: fact.current,
      previous: fact.previous,
      absoluteChange: fact.current === null || fact.previous === null ? null : subtract(fact.current, fact.previous),
      percentageChange: fact.percentageChange,
    },
  };
}

describe("manually maintained Change Intelligence goldens", () => {
  for (const name of cases) {
    it(name, async () => {
      const golden = JSON.parse(await readFile(new URL(`../../fixtures/expected/change-intelligence/${name}.json`, import.meta.url), "utf8")) as GoldenCase;
      const reportMetrics = golden.facts.filter((fact) => fact.scope === "report").map(metric);
      const sourceBreakdown = (["meta_ads", "google_ads", "shopify"] as ProviderSource[]).flatMap((source) => {
        const metrics = golden.facts.filter((fact) => fact.scope === "source" && fact.source === source).map(metric);
        return metrics.length > 0 ? [{ source, metrics }] : [];
      });
      const result = runChangeIntelligence({
        dataHealthStatus: "healthy",
        reportingPeriod: period,
        targets: golden.targets,
        kpiResult: { status: "ready", period, metrics: reportMetrics, sourceBreakdown },
      });
      expect(result.status, golden.label).toBe("ready");
      if (result.status !== "ready") throw new Error("Expected ready Change Intelligence.");
      for (const observation of golden.expectedObservations) {
        expect(result.observations, golden.label).toEqual(expect.arrayContaining([expect.objectContaining(observation)]));
      }
      for (const type of golden.absentTypes ?? []) {
        expect(result.observations.some((observation) => observation.type === type), golden.label).toBe(false);
      }
      if (golden.expectedTargetStatuses) {
        expect(result.targetEvaluations.map((evaluation) => [evaluation.target.id, evaluation.status]), golden.label)
          .toEqual(golden.expectedTargetStatuses);
      }
      if (golden.expectedPositiveMovers) {
        expect(result.largestPositiveMovers.map((mover) => mover.metric), golden.label).toEqual(golden.expectedPositiveMovers);
      }
    });
  }
});
