import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { runDataHealth } from "../../lib/data-health/run-data-health";
import { normalizeCsvFile } from "../../lib/normalization/normalize-csv";
import type { AdvertisingObservation, CommerceObservation } from "../../lib/normalization/types";

type ExpectedHealth = {
  status: "healthy" | "review_required" | "blocked";
  counts?: { info: number; warning: number; error: number };
  findingCodes: string[];
  forbiddenFindingCodes?: string[];
  coverage?: Record<string, { start: string; end: string; status: string }>;
};

async function fixtureFile(relativePath: string): Promise<File> {
  const content = await readFile(new URL(`../../fixtures/raw/${relativePath}`, import.meta.url), "utf8");
  const pathParts = relativePath.split("/");
  return new File([content], pathParts[pathParts.length - 1] ?? "fixture.csv", { type: "text/csv" });
}

async function expectedFixture(name: string): Promise<ExpectedHealth> {
  const content = await readFile(new URL(`../../fixtures/expected/data-health/${name}.json`, import.meta.url), "utf8");
  return JSON.parse(content) as ExpectedHealth;
}

async function normalize(relativePath: string, ingestionId: string) {
  const result = await normalizeCsvFile(await fixtureFile(relativePath), { ingestionId });
  expect(result.status).toBe("normalized");
  if (result.status !== "normalized") throw new Error("Fixture should normalize.");
  return result;
}

async function runPipeline(
  files: Array<{ path: string; ingestionId: string }>,
  expectedSources: Array<"meta_ads" | "google_ads" | "shopify">,
) {
  const normalized = await Promise.all(files.map((file) => normalize(file.path, file.ingestionId)));
  return runDataHealth({
    observations: normalized.flatMap((result) => result.observations),
    expectedSources,
    reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } },
    sourceInputs: normalized.map((result) => ({ source: result.provider, mapping: result.mapping })),
  });
}

async function expectGolden(result: ReturnType<typeof runDataHealth>, name: string): Promise<void> {
  const expected = await expectedFixture(name);
  expect(result.status).toBe(expected.status);
  if (expected.counts) expect(result.counts).toEqual(expected.counts);
  expect(result.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining(expected.findingCodes));
  for (const forbidden of expected.forbiddenFindingCodes ?? []) {
    expect(result.findings.map((finding) => finding.code)).not.toContain(forbidden);
  }
  for (const [source, coverage] of Object.entries(expected.coverage ?? {})) {
    expect(result.sourceCoverage).toContainEqual(expect.objectContaining({ source, ...coverage }));
  }
}

describe("raw CSV to Data Health", () => {
  it("returns the independently maintained healthy multi-source findings", async () => {
    const result = await runPipeline([
      { path: "data-health/meta-aligned.csv", ingestionId: "health-meta" },
      { path: "data-health/google-aligned.csv", ingestionId: "health-google" },
      { path: "data-health/shopify-aligned.csv", ingestionId: "health-shopify" },
    ], ["meta_ads", "google_ads", "shopify"]);

    await expectGolden(result, "healthy-multi-source");
  });

  it("returns the independently maintained review-required date mismatch findings", async () => {
    const result = await runPipeline([
      { path: "data-health/meta-aligned.csv", ingestionId: "health-meta" },
      { path: "data-health/shopify-partial-period.csv", ingestionId: "health-shopify" },
    ], ["meta_ads", "shopify"]);

    await expectGolden(result, "date-mismatch");
  });

  it("returns the independently maintained blocked currency findings", async () => {
    const result = await runPipeline([
      { path: "data-health/meta-aligned.csv", ingestionId: "health-meta" },
      { path: "data-health/shopify-usd.csv", ingestionId: "health-shopify" },
    ], ["meta_ads", "shopify"]);

    await expectGolden(result, "currency-mismatch");
  });

  it("blocks a request whose expected Shopify source was not ingested", async () => {
    const result = await runPipeline([
      { path: "data-health/meta-aligned.csv", ingestionId: "health-meta" },
    ], ["meta_ads", "shopify"]);

    await expectGolden(result, "missing-source");
  });

  it("retains commerce and provider attribution without a combined-revenue finding", async () => {
    const result = await runPipeline([
      { path: "data-health/meta-aligned.csv", ingestionId: "health-meta" },
      { path: "data-health/google-aligned.csv", ingestionId: "health-google" },
      { path: "data-health/shopify-aligned.csv", ingestionId: "health-shopify" },
    ], ["meta_ads", "google_ads", "shopify"]);

    await expectGolden(result, "revenue-semantics");
  });

  it("blocks an intentionally malformed canonical provenance fixture", async () => {
    const meta = await normalize("data-health/meta-aligned.csv", "health-meta");
    const shopify = await normalize("data-health/shopify-aligned.csv", "health-shopify");
    const observations = [...meta.observations, ...shopify.observations] as Array<AdvertisingObservation | CommerceObservation>;
    observations[0] = {
      ...observations[0],
      provenance: { transport: "csv", ingestionId: "", originalFileName: "../unsafe.csv", sourceRow: 0, mappingOrigins: {} },
    };
    const result = runDataHealth({
      observations,
      expectedSources: ["meta_ads", "shopify"],
      reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } },
    });

    await expectGolden(result, "provenance-failure");
  });

  it("reports a realistic advertising duplicate as a candidate without deletion", async () => {
    const meta = await normalize("data-health/meta-aligned.csv", "health-meta");
    const shopify = await normalize("data-health/shopify-aligned.csv", "health-shopify");
    const duplicate = { ...meta.observations[0], provenance: { ...meta.observations[0].provenance, sourceRow: 8 } };
    const observations = [...meta.observations, duplicate, ...shopify.observations];
    const result = runDataHealth({
      observations,
      expectedSources: ["meta_ads", "shopify"],
      reportingPeriod: { currentPeriod: { start: "2026-08-01", end: "2026-08-02" } },
    });

    await expectGolden(result, "duplicate-candidate");
    expect(observations).toHaveLength(5);
  });
});
