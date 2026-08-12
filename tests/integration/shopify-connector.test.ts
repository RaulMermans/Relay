import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { ShopifyConnector, SHOPIFY_CAPABILITIES } from "../../lib/connectors/shopify/client";
import { normalizeShopifyOrders } from "../../lib/connectors/shopify/normalizer";
import { runChangeIntelligence } from "../../lib/change-intelligence/engine";
import { runDataHealth } from "../../lib/data-health/run-data-health";
import { runKpiEngine } from "../../lib/kpi/engine";
import { normalizeCsvFile } from "../../lib/normalization/normalize-csv";
import type { CanonicalObservation } from "../../lib/data-health/types";
import { compareCanonicalSemantics } from "../support/connectors/semantic-equivalence";

type Fixture = { synthetic: true; shop: unknown; pages: unknown[] };

async function apiCanonical(): Promise<CanonicalObservation[]> {
  const fixture = JSON.parse(await readFile(new URL("../../fixtures/connectors/shopify/representative-equivalent.json", import.meta.url), "utf8")) as Fixture;
  const providerResponses = [fixture.shop, ...fixture.pages];
  let providerCall = 0;
  const connector = new ShopifyConnector({
    shopDomain: "synthetic-relay-store.myshopify.com",
    accessToken: "synthetic-request-scoped-token",
    fetchImpl: async () => new Response(JSON.stringify(providerResponses[providerCall++])),
    fetchRequestId: () => "shopify-fetch-1",
    now: () => new Date("2026-08-12T12:00:00Z"),
    delay: async () => undefined,
  });
  const fetched = await connector.fetch({
    provider: "shopify",
    status: "ready",
    externalAccountId: "gid://shopify/Shop/100000001",
    externalAccountName: "Synthetic Relay Store",
    grantedScopes: ["read_orders"],
    capabilities: [...SHOPIFY_CAPABILITIES],
    credentialReference: "synthetic-request-scoped-credential",
  }, {
    provider: "shopify",
    externalAccountId: "gid://shopify/Shop/100000001",
    dateRange: { start: "2026-07-01", end: "2026-07-02" },
    requestedGrain: "daily",
  });
  expect(fetched.pagesFetched).toBe(2);
  expect(providerCall).toBe(3);
  return normalizeShopifyOrders({
    records: fetched.records,
    externalAccount: fetched.externalAccount,
    provenance: fetched.provenance,
  });
}

async function csvCanonical(): Promise<CanonicalObservation[]> {
  const content = await readFile(new URL("../../fixtures/raw/shopify/representative-export.csv", import.meta.url), "utf8");
  const result = await normalizeCsvFile(new File([content], "representative-export.csv", { type: "text/csv" }), { ingestionId: "fixture-shopify" });
  if (result.status !== "normalized") throw new Error("Expected representative Shopify CSV to normalize.");
  return result.observations;
}

describe("Shopify API canonical convergence", () => {
  it("matches the existing representative Shopify CSV semantics exactly except provenance", async () => {
    const comparison = compareCanonicalSemantics(await csvCanonical(), await apiCanonical());
    expect(comparison.equivalent).toBe(true);
  });

  it.each([
    ["gross revenue", (items: CanonicalObservation[]) => [{ ...items[0]!, grossRevenue: "125.99" }, ...items.slice(1)]],
    ["currency", (items: CanonicalObservation[]) => [{ ...items[0]!, currencyCode: "EUR" }, ...items.slice(1)]],
    ["order count", (items: CanonicalObservation[]) => items.slice(0, 1)],
    ["null versus zero", (items: CanonicalObservation[]) => [{ ...items[0]!, refunds: "0" }, ...items.slice(1)]],
    ["date", (items: CanonicalObservation[]) => [{ ...items[0]!, date: "2026-07-02" }, ...items.slice(1)]],
  ])("rejects a %s semantic mismatch", async (_label, mutate) => {
    expect(compareCanonicalSemantics(await csvCanonical(), mutate(await apiCanonical())).equivalent).toBe(false);
  });

  it("flows through Data Health, KPI, and Change Intelligence without a transport-specific analytics branch", async () => {
    const observations = await apiCanonical();
    const reportingPeriod = { currentPeriod: { start: "2026-07-01", end: "2026-07-02" } };
    const health = runDataHealth({ observations, expectedSources: ["shopify"], reportingPeriod });
    const kpis = runKpiEngine({ observations, dataHealthStatus: health.status, reportingPeriod: health.reportingPeriod });
    const changes = runChangeIntelligence({ kpiResult: kpis, dataHealthStatus: health.status, reportingPeriod: health.reportingPeriod });

    expect(health.status).toBe("healthy");
    expect(kpis.status).toBe("ready");
    if (kpis.status !== "ready") throw new Error("Expected KPI execution to be ready.");
    expect(kpis.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "commerce_revenue", value: "186.5" }),
      expect.objectContaining({ key: "orders", value: "2" }),
      expect.objectContaining({ key: "aov", value: "93.25" }),
    ]));
    expect(kpis.metrics.some((metric) => metric.key === "attributed_revenue" || metric.key === "roas")).toBe(false);
    expect(changes.status).toBe("ready");
  });
});
