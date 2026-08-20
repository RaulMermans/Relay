import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { runChangeIntelligence } from "../../lib/change-intelligence/engine";
import { META_ADS_CAPABILITIES, MetaAdsConnector } from "../../lib/connectors/meta-ads/client";
import { normalizeMetaAdsInsights } from "../../lib/connectors/meta-ads/normalizer";
import { runDataHealth } from "../../lib/data-health/run-data-health";
import type { CanonicalObservation } from "../../lib/data-health/types";
import { runKpiEngine } from "../../lib/kpi/engine";
import { normalizeCsvFile } from "../../lib/normalization/normalize-csv";
import { compareCanonicalSemantics } from "../support/connectors/semantic-equivalence";

type Fixture = { synthetic: true; accounts: unknown; pages: unknown[] };

async function apiCanonical(): Promise<CanonicalObservation[]> {
  const fixture = JSON.parse(await readFile(new URL("../../fixtures/connectors/meta-ads/representative-equivalent.json", import.meta.url), "utf8")) as Fixture;
  const providerResponses = [fixture.accounts, ...fixture.pages];
  let providerCall = 0;
  const connector = new MetaAdsConnector({
    accessToken: "synthetic-request-scoped-token",
    fetchImpl: async () => new Response(JSON.stringify(providerResponses[providerCall++])),
    fetchRequestId: () => "meta-fetch-1",
    delay: async () => undefined,
  });
  const fetched = await connector.fetch({
    provider: "meta_ads", status: "ready", externalAccountId: "act_100000001", externalAccountName: "Synthetic Relay Ad Account",
    grantedScopes: ["ads_read"], capabilities: [...META_ADS_CAPABILITIES], credentialReference: "synthetic-request-scoped-credential",
  }, {
    provider: "meta_ads", externalAccountId: "act_100000001", dateRange: { start: "2026-07-01", end: "2026-07-01" }, requestedGrain: "daily",
  });
  expect(fetched.pagesFetched).toBe(2);
  expect(providerCall).toBe(3);
  return normalizeMetaAdsInsights({ records: fetched.records, externalAccount: fetched.externalAccount, provenance: fetched.provenance });
}

async function csvCanonical(): Promise<CanonicalObservation[]> {
  const content = await readFile(new URL("../../fixtures/raw/meta_ads/representative-export.csv", import.meta.url), "utf8");
  const result = await normalizeCsvFile(new File([content], "representative-export.csv", { type: "text/csv" }), { ingestionId: "fixture-meta" });
  if (result.status !== "normalized") throw new Error("Expected representative Meta CSV to normalize.");
  return result.observations;
}

describe("Meta Ads API canonical convergence", () => {
  it("matches representative Meta CSV business semantics except transport-only provenance and unavailable identity", async () => {
    expect(compareCanonicalSemantics(await csvCanonical(), await apiCanonical()).equivalent).toBe(true);
  });

  it.each([
    ["spend", (items: CanonicalObservation[]) => [{ ...items[0]!, spend: "999" }, ...items.slice(1)]],
    ["impressions", (items: CanonicalObservation[]) => [{ ...items[0]!, impressions: "999" }, ...items.slice(1)]],
    ["clicks", (items: CanonicalObservation[]) => [{ ...items[0]!, clicks: "999" }, ...items.slice(1)]],
    ["conversions", (items: CanonicalObservation[]) => [{ ...items[0]!, conversions: "999" }, ...items.slice(1)]],
    ["attributed revenue", (items: CanonicalObservation[]) => [{ ...items[0]!, attributedRevenue: "999" }, ...items.slice(1)]],
    ["currency", (items: CanonicalObservation[]) => [{ ...items[0]!, currencyCode: "EUR" }, ...items.slice(1)]],
    ["null versus zero", (items: CanonicalObservation[]) => [{ ...items[0]!, conversions: null }, ...items.slice(1)]],
    ["date", (items: CanonicalObservation[]) => [{ ...items[0]!, date: "2026-07-02" }, ...items.slice(1)]],
    ["joint campaign identity", (items: CanonicalObservation[]) => [{ ...items[0]!, campaignName: "Different campaign" }, ...items.slice(1)]],
  ])("rejects a %s semantic mismatch", async (_label, mutate) => {
    expect(compareCanonicalSemantics(await csvCanonical(), mutate(await apiCanonical())).equivalent).toBe(false);
  });

  it("flows through unchanged Data Health, KPI, and Change Intelligence with advertising-only revenue", async () => {
    const observations = await apiCanonical();
    const reportingPeriod = { currentPeriod: { start: "2026-07-01", end: "2026-07-01" } };
    const health = runDataHealth({ observations, expectedSources: ["meta_ads"], reportingPeriod });
    const kpis = runKpiEngine({ observations, dataHealthStatus: health.status, reportingPeriod: health.reportingPeriod });
    const changes = runChangeIntelligence({ kpiResult: kpis, dataHealthStatus: health.status, reportingPeriod: health.reportingPeriod });

    expect(health.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "COMMERCE_SOURCE_ABSENT", severity: "warning" })]));
    expect(health.status).toBe("review_required");
    expect(kpis.status).toBe("ready");
    if (kpis.status !== "ready") throw new Error("Expected KPI execution to be ready.");
    const metaMetrics = kpis.sourceBreakdown.find((source) => source.source === "meta_ads")?.metrics;
    expect(metaMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "spend", value: "191.34" }),
      expect.objectContaining({ key: "impressions", value: "14200" }),
      expect.objectContaining({ key: "clicks", value: "429" }),
      expect.objectContaining({ key: "conversions", value: "22" }),
      expect.objectContaining({ key: "attributed_revenue", value: "888.89" }),
      expect.objectContaining({ key: "roas", value: "4.645604682764" }),
    ]));
    expect(kpis.metrics.some((metric) => metric.key === "commerce_revenue" && metric.status === "available")).toBe(false);
    expect(observations.every((observation) => !("grossRevenue" in observation))).toBe(true);
    expect(changes.status).toBe("ready");
  });
});
