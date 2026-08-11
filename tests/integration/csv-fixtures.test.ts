import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { processCsvFile } from "../../lib/intake/csv/intake";

async function fixtureFile(relativePath: string): Promise<File> {
  const content = await readFile(new URL(`../../fixtures/raw/${relativePath}`, import.meta.url), "utf8");
  const pathSegments = relativePath.split("/");

  return new File([content], pathSegments[pathSegments.length - 1] ?? "fixture.csv", { type: "text/csv" });
}

describe("synthetic CSV fixture intake", () => {
  it.each([
    ["meta_ads/representative-export.csv", "accepted", "meta_ads"],
    ["google_ads/representative-export.csv", "accepted", "google_ads"],
    ["shopify/representative-export.csv", "accepted", "shopify"],
    ["unknown/newsletter-export.csv", "needs_review", "unknown"],
  ] as const)("processes %s through parsing and source detection", async (path, status, source) => {
    await expect(processCsvFile(await fixtureFile(path))).resolves.toMatchObject({
      status,
      sourceDetection: { source },
    });
  });

  it("returns the safe parse error for a malformed fixture", async () => {
    await expect(processCsvFile(await fixtureFile("malformed/broken-quoting.csv"))).rejects.toMatchObject({
      code: "CSV_PARSE_ERROR",
    });
  });
});
