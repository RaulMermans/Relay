import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { detectSource } from "../../lib/intake/csv/detect-source";
import { parseCsv } from "../../lib/intake/csv/parse";

async function readFixture(relativePath: string): Promise<string> {
  return readFile(new URL(`../../fixtures/raw/${relativePath}`, import.meta.url), "utf8");
}

describe("detectSource", () => {
  it("detects the representative Meta Ads export from header evidence", async () => {
    const input = await readFixture("meta_ads/representative-export.csv");

    expect(detectSource(parseCsv(input).headers)).toEqual({
      source: "meta_ads",
      confidence: "high",
      matchedSignals: [
        "Campaign name",
        "Ad set name",
        "Amount spent",
        "Impressions",
        "Link clicks",
        "Purchases",
        "Purchase conversion value",
      ],
      conflictingSignals: [],
    });
  });

  it("detects representative and alternate Google Ads headers", async () => {
    await expect(
      readFixture("google_ads/representative-export.csv").then((input) =>
        detectSource(parseCsv(input).headers),
      ),
    ).resolves.toMatchObject({
      source: "google_ads",
      confidence: "high",
      conflictingSignals: [],
    });

    await expect(
      readFixture("google_ads/alternate-headers.csv").then((input) =>
        detectSource(parseCsv(input).headers),
      ),
    ).resolves.toMatchObject({
      source: "google_ads",
      confidence: "high",
      conflictingSignals: [],
    });
  });

  it("detects representative and alternate Shopify headers", async () => {
    await expect(
      readFixture("shopify/representative-export.csv").then((input) =>
        detectSource(parseCsv(input).headers),
      ),
    ).resolves.toMatchObject({
      source: "shopify",
      confidence: "high",
      conflictingSignals: [],
    });

    await expect(
      readFixture("shopify/alternate-headers.csv").then((input) =>
        detectSource(parseCsv(input).headers),
      ),
    ).resolves.toMatchObject({
      source: "shopify",
      confidence: "high",
      conflictingSignals: [],
    });
  });

  it("keeps unsupported and ambiguous headers unknown instead of guessing", async () => {
    await expect(
      readFixture("unknown/newsletter-export.csv").then((input) => detectSource(parseCsv(input).headers)),
    ).resolves.toEqual({
      source: "unknown",
      confidence: "low",
      matchedSignals: [],
      conflictingSignals: [],
    });

    await expect(
      readFixture("unknown/blended-paid-media-export.csv").then((input) =>
        detectSource(parseCsv(input).headers),
      ),
    ).resolves.toEqual({
      source: "unknown",
      confidence: "low",
      matchedSignals: ["Campaign", "Ad set name", "Amount spent", "Impressions", "Clicks"],
      conflictingSignals: [
        "meta_ads: Campaign, Ad set name, Amount spent, Impressions, Clicks",
        "google_ads: Campaign, Ad group, Cost, Impressions, Clicks",
      ],
    });
  });
});
