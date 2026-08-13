import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { runChangeIntelligence } from "../../lib/change-intelligence/engine";
import { GOOGLE_ADS_CAPABILITIES, GOOGLE_ADS_OAUTH_SCOPE, GoogleAdsConnector } from "../../lib/connectors/google-ads/client";
import { normalizeGoogleAdsRows } from "../../lib/connectors/google-ads/normalizer";
import { runDataHealth } from "../../lib/data-health/run-data-health";
import type { CanonicalObservation } from "../../lib/data-health/types";
import { runKpiEngine } from "../../lib/kpi/engine";
import { normalizeCsvFile } from "../../lib/normalization/normalize-csv";
import { compareCanonicalSemantics } from "../support/connectors/semantic-equivalence";

type Fixture = { synthetic: true; accessibleCustomers: unknown; rootCustomer: unknown; hierarchyPages: unknown[]; reportPages: unknown[] };

async function apiCanonical(): Promise<CanonicalObservation[]> {
  const fixture = JSON.parse(await readFile(new URL("../../fixtures/connectors/google-ads/representative-equivalent.json", import.meta.url), "utf8")) as Fixture;
  const responses = [fixture.accessibleCustomers, fixture.rootCustomer, ...fixture.hierarchyPages, ...fixture.reportPages];
  let call = 0;
  const connector = new GoogleAdsConnector({
    accessToken: "synthetic-request-scoped-token",
    developerToken: "synthetic-application-token",
    fetchImpl: async () => new Response(JSON.stringify(responses[call++])),
    fetchRequestId: () => "google-fetch-1",
    delay: async () => undefined,
  });
  const fetched = await connector.fetch({
    provider: "google_ads", status: "ready", externalAccountId: "2222222222", externalAccountName: "Synthetic Relay Ads",
    grantedScopes: [GOOGLE_ADS_OAUTH_SCOPE], capabilities: [...GOOGLE_ADS_CAPABILITIES], credentialReference: "synthetic-request-scoped-credential",
  }, {
    provider: "google_ads", externalAccountId: "2222222222", dateRange: { start: "2026-07-01", end: "2026-07-02" }, requestedGrain: "daily",
  });
  expect(fetched.pagesFetched).toBe(2);
  expect(call).toBe(5);
  return normalizeGoogleAdsRows({ records: fetched.records, externalAccount: fetched.externalAccount, provenance: fetched.provenance });
}

async function csvCanonical(): Promise<CanonicalObservation[]> {
  const content = await readFile(new URL("../../fixtures/raw/google_ads/representative-export.csv", import.meta.url), "utf8");
  const result = await normalizeCsvFile(new File([content], "representative-export.csv", { type: "text/csv" }), { ingestionId: "fixture-google" });
  if (result.status !== "normalized") throw new Error("Expected representative Google Ads CSV to normalize.");
  return result.observations;
}

describe("Google Ads API canonical convergence", () => {
  it("matches representative Google Ads CSV business semantics except provenance and unavailable CSV identities", async () => {
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
    ["date", (items: CanonicalObservation[]) => [{ ...items[0]!, date: "2026-07-03" }, ...items.slice(1)]],
    ["joint campaign identity", (items: CanonicalObservation[]) => [{ ...items[0]!, campaignName: "Different campaign" }, ...items.slice(1)]],
    ["joint group identity", (items: CanonicalObservation[]) => [{ ...items[0]!, groupName: "Different group" }, ...items.slice(1)]],
  ])("rejects a %s semantic mismatch", async (_label, mutate) => {
    expect(compareCanonicalSemantics(await csvCanonical(), mutate(await apiCanonical())).equivalent).toBe(false);
  });

  it("flows through unchanged Data Health, KPI, and Change Intelligence with Google-only attributed revenue", async () => {
    const observations = await apiCanonical();
    const reportingPeriod = { currentPeriod: { start: "2026-07-01", end: "2026-07-02" } };
    const health = runDataHealth({ observations, expectedSources: ["google_ads"], reportingPeriod });
    const kpis = runKpiEngine({ observations, dataHealthStatus: health.status, reportingPeriod: health.reportingPeriod });
    const changes = runChangeIntelligence({ kpiResult: kpis, dataHealthStatus: health.status, reportingPeriod: health.reportingPeriod });

    expect(health.status).toBe("review_required");
    expect(kpis.status).toBe("ready");
    if (kpis.status !== "ready") throw new Error("Expected KPI execution to be ready.");
    const googleMetrics = kpis.sourceBreakdown.find((source) => source.source === "google_ads")?.metrics;
    expect(googleMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "spend", value: "243.5" }),
      expect.objectContaining({ key: "impressions", value: "19400" }),
      expect.objectContaining({ key: "clicks", value: "1045" }),
      expect.objectContaining({ key: "conversions", value: "42" }),
      expect.objectContaining({ key: "attributed_revenue", value: "1222" }),
      expect.objectContaining({ key: "roas", value: "5.018480492813" }),
    ]));
    expect(kpis.metrics.some((metric) => metric.key === "commerce_revenue" && metric.status === "available")).toBe(false);
    expect(observations.every((observation) => !("grossRevenue" in observation))).toBe(true);
    expect(changes.status).toBe("ready");
  });
});
