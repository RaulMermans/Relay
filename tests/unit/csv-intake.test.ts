import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { processCsvFile } from "../../lib/intake/csv/intake";

async function fixtureFile(relativePath: string, name: string): Promise<File> {
  const content = await readFile(new URL(`../../fixtures/raw/${relativePath}`, import.meta.url), "utf8");

  return new File([content], name, { type: "text/csv" });
}

describe("processCsvFile", () => {
  it("returns a structured accepted result for a synthetic Meta Ads export", async () => {
    const file = await fixtureFile("meta_ads/representative-export.csv", "meta-week.csv");

    await expect(processCsvFile(file)).resolves.toMatchObject({
      status: "accepted",
      file: { name: "meta-week.csv", sizeBytes: file.size },
      csv: {
        headers: [
          "Date start",
          "Campaign name",
          "Ad set name",
          "Amount spent",
          "Impressions",
          "Link clicks",
          "Purchases",
          "Purchase conversion value",
          "Currency",
        ],
        rowCount: 2,
        delimiter: ",",
        parseWarnings: [],
      },
      sourceDetection: {
        source: "meta_ads",
        confidence: "high",
      },
    });
  });

  it("includes a deterministic field-mapping proposal for a detected source", async () => {
    const file = await fixtureFile("meta_ads/representative-export.csv", "meta-week.csv");

    await expect(processCsvFile(file)).resolves.toMatchObject({
      mapping: {
        provider: "meta_ads",
        domain: "advertising",
        status: "ready",
        requiredMissing: [],
      },
    });
  });

  it("returns needs review for a syntactically valid unknown source", async () => {
    const file = await fixtureFile("unknown/newsletter-export.csv", "newsletter.csv");

    await expect(processCsvFile(file)).resolves.toMatchObject({
      status: "needs_review",
      sourceDetection: { source: "unknown", confidence: "low", conflictingSignals: [] },
    });
  });

  it("keeps a conflicting paid-media signature in the review state", async () => {
    const file = await fixtureFile("unknown/blended-paid-media-export.csv", "blended.csv");

    await expect(processCsvFile(file)).resolves.toMatchObject({
      status: "needs_review",
      sourceDetection: {
        source: "unknown",
        conflictingSignals: [
          "meta_ads: Campaign, Ad set name, Amount spent, Impressions, Clicks",
          "google_ads: Campaign, Ad group, Cost, Impressions, Clicks",
        ],
      },
    });
  });

  it("rejects a CSV without a data row", async () => {
    const file = await fixtureFile("malformed/headers-only.csv", "headers-only.csv");

    await expect(processCsvFile(file)).rejects.toMatchObject({ code: "CSV_NO_DATA" });
  });

  it("rejects a non-empty CSV without a usable header row", async () => {
    const file = new File(["\n\n"], "blank-headers.csv", { type: "text/csv" });

    await expect(processCsvFile(file)).rejects.toMatchObject({ code: "CSV_NO_HEADERS" });
  });
});
