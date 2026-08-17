import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { normalizeCsvFile } from "../../lib/normalization/normalize-csv";

async function fixtureFile(relativePath: string): Promise<File> {
  const content = await readFile(new URL(`../../fixtures/raw/${relativePath}`, import.meta.url), "utf8");
  const fileName = relativePath.split("/").pop() ?? "fixture.csv";
  return new File([content], fileName, { type: "text/csv" });
}

async function normalizedFixture(relativePath: string): Promise<unknown> {
  const content = await readFile(new URL(`../../fixtures/normalized/${relativePath}`, import.meta.url), "utf8");
  return JSON.parse(content) as unknown;
}

describe("raw CSV to canonical normalization", () => {
  it("auto-maps the supported Meta Day header without mapping review", async () => {
    const result = await normalizeCsvFile(await fixtureFile("meta_ads/day-header-export.csv"), {
      ingestionId: "fixture-meta-day",
    });

    expect(result).toMatchObject({
      status: "normalized",
      provider: "meta_ads",
      mapping: {
        status: "ready",
        fields: expect.arrayContaining([
          expect.objectContaining({ header: "Day", canonicalField: "date", origin: "exact_alias" }),
        ]),
      },
    });
  });

  it.each([
    ["meta_ads/representative-export.csv", "meta_ads/representative-export.json", "fixture-meta"],
    ["meta_ads/alternate-headers.csv", "meta_ads/alternate-headers.json", "fixture-meta-alt"],
    ["google_ads/representative-export.csv", "google_ads/representative-export.json", "fixture-google"],
    ["google_ads/alternate-headers.csv", "google_ads/alternate-headers.json", "fixture-google-alt"],
    ["shopify/representative-export.csv", "shopify/representative-export.json", "fixture-shopify"],
    ["shopify/alternate-headers.csv", "shopify/alternate-headers.json", "fixture-shopify-alt"],
  ])("normalizes %s to its independently maintained golden fixture", async (rawPath, expectedPath, ingestionId) => {
    const result = await normalizeCsvFile(await fixtureFile(rawPath), { ingestionId });

    expect(result.status).toBe("normalized");
    if (result.status === "normalized") {
      expect(result.observations).toEqual(await normalizedFixture(expectedPath));
    }
  });

  it("returns an actionable mapping state for unresolved provider semantics", async () => {
    const result = await normalizeCsvFile(await fixtureFile("failures/meta-missing-date.csv"), {
      ingestionId: "fixture-failure",
    });

    expect(result).toMatchObject({
      status: "mapping_required",
      provider: "meta_ads",
      mapping: { requiredMissing: ["date"] },
    });
  });

  it("returns an actionable mapping state for ambiguous aliases", async () => {
    const result = await normalizeCsvFile(await fixtureFile("failures/meta-ambiguous-mapping.csv"), {
      ingestionId: "fixture-failure",
    });

    expect(result).toMatchObject({
      status: "mapping_required",
      mapping: { status: "needs_review" },
    });
  });

  it("rejects invalid canonical values instead of coercing them", async () => {
    await expect(
      normalizeCsvFile(await fixtureFile("failures/meta-invalid-amount.csv"), { ingestionId: "fixture-failure" }),
    ).rejects.toMatchObject({ code: "NORMALIZATION_INVALID_VALUE" });
  });

  it("rejects invalid dates without changing the source calendar day", async () => {
    await expect(
      normalizeCsvFile(await fixtureFile("failures/meta-invalid-date.csv"), { ingestionId: "fixture-failure" }),
    ).rejects.toMatchObject({ code: "NORMALIZATION_INVALID_DATE" });
  });

  it("rejects a duplicate Shopify order-row export before it can double-count revenue", async () => {
    await expect(
      normalizeCsvFile(await fixtureFile("failures/shopify-duplicate-order.csv"), {
        ingestionId: "fixture-failure",
      }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_SHOPIFY_EXPORT_GRAIN" });
  });

  it("rejects duplicate manual canonical fields", async () => {
    await expect(
      normalizeCsvFile(await fixtureFile("meta_ads/representative-export.csv"), {
        ingestionId: "fixture-failure",
        mappingOverrides: [{ columnIndex: 2, canonicalField: "campaign_name" }],
      }),
    ).rejects.toMatchObject({ code: "DUPLICATE_CANONICAL_MAPPING" });
  });

  it("preserves multiple currencies with a structured compatibility finding", async () => {
    const result = await normalizeCsvFile(await fixtureFile("failures/google-mixed-currency.csv"), {
      ingestionId: "fixture-failure",
    });

    expect(result).toMatchObject({
      status: "normalized",
      summary: { currencies: ["EUR", "USD"] },
      findings: [expect.objectContaining({ code: "MIXED_CURRENCIES", severity: "warning" })],
    });
  });
});
