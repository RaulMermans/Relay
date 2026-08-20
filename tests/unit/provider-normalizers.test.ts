import { describe, expect, it } from "vitest";

import { approveFieldMapping, proposeFieldMapping } from "../../lib/mapping/field-mapping";
import { normalizeGoogleAds } from "../../lib/normalization/google-ads";
import { normalizeMetaAds } from "../../lib/normalization/meta-ads";
import { normalizeShopify } from "../../lib/normalization/shopify";
import { NormalizationError } from "../../lib/normalization/values";

function approvedMapping(provider: "meta_ads" | "google_ads" | "shopify", headers: string[]) {
  return approveFieldMapping(proposeFieldMapping(provider, headers));
}

describe("provider normalizers", () => {
  it("normalizes Meta Ads measures into an advertising observation with provenance", () => {
    const headers = [
      "Date start",
      "Account ID",
      "Account name",
      "Campaign ID",
      "Campaign name",
      "Ad set ID",
      "Ad set name",
      "Ad ID",
      "Ad name",
      "Currency",
      "Amount spent",
      "Impressions",
      "Link clicks",
      "Purchases",
      "Purchase conversion value",
    ];

    const observations = normalizeMetaAds({
      headers,
      rows: [
        [
          "2026-07-01",
          "act_1",
          "Relay Meta",
          "camp_1",
          "Summer launch",
          "set_1",
          "Prospecting",
          "ad_1",
          "Static one",
          "usd",
          "123.45",
          "10000",
          "321",
          "14",
          "567.89",
        ],
      ],
      mapping: approvedMapping("meta_ads", headers),
      fileName: "synthetic-meta.csv",
      ingestionId: "ingestion-meta",
    });

    expect(observations).toEqual([
      expect.objectContaining({
        domain: "advertising",
        source: "meta_ads",
        sourceAccountId: "act_1",
        sourceAccountName: "Relay Meta",
        date: "2026-07-01",
        sourceTimezone: null,
        campaignId: "camp_1",
        campaignName: "Summer launch",
        groupId: "set_1",
        groupName: "Prospecting",
        adId: "ad_1",
        adName: "Static one",
        currencyCode: "USD",
        spend: "123.45",
        impressions: "10000",
        clicks: "321",
        conversions: "14",
        attributedRevenue: "567.89",
        provenance: expect.objectContaining({
          transport: "csv",
          ingestionId: "ingestion-meta",
          originalFileName: "synthetic-meta.csv",
          sourceRow: 2,
          mappingOrigins: expect.objectContaining({ spend: "exact_alias" }),
        }),
      }),
    ]);
  });

  it("normalizes Google Ads Cost (micros) as advertising spend", () => {
    const headers = ["Day", "Campaign", "Ad group", "Currency code", "Cost (micros)", "Impr.", "Interactions", "All conv.", "All conv. value"];
    const observations = normalizeGoogleAds({
      headers,
      rows: [["2026-07-03", "Shopping", "Popular products", "EUR", "109000000", "9400", "374", "17", "510.00"]],
      mapping: approvedMapping("google_ads", headers),
      fileName: "synthetic-google.csv",
      ingestionId: "ingestion-google",
    });

    expect(observations[0]).toMatchObject({
      domain: "advertising",
      source: "google_ads",
      date: "2026-07-03",
      campaignName: "Shopping",
      groupName: "Popular products",
      currencyCode: "EUR",
      spend: "109",
      impressions: "9400",
      clicks: "374",
      conversions: "17",
      attributedRevenue: "510",
    });
  });

  it("normalizes supported Shopify order rows as commerce without customer-email semantics", () => {
    const headers = ["Name", "Created at", "Total", "Currency", "Email"];
    const observations = normalizeShopify({
      headers,
      rows: [["#1001", "2026-07-01 10:00:00", "126.00", "USD", "customer-one@example.test"]],
      mapping: approvedMapping("shopify", headers),
      fileName: "synthetic-shopify.csv",
      ingestionId: "ingestion-shopify",
    });

    expect(observations).toEqual([
      expect.objectContaining({
        domain: "commerce",
        source: "shopify",
        orderId: "#1001",
        date: "2026-07-01",
        currencyCode: "USD",
        orders: "1",
        grossRevenue: "126",
        netRevenue: null,
        refunds: null,
        customers: null,
        newCustomers: null,
      }),
    ]);
    expect(observations[0]).not.toHaveProperty("email");
  });

  it("rejects a duplicate Shopify order instead of treating a line-item export as order rows", () => {
    const headers = ["Name", "Created at", "Total", "Currency"];
    const input = {
      headers,
      rows: [
        ["#1001", "2026-07-01", "126.00", "USD"],
        ["#1001", "2026-07-01", "126.00", "USD"],
      ],
      mapping: approvedMapping("shopify", headers),
      fileName: "duplicate-order.csv",
      ingestionId: "ingestion-shopify",
    };

    expect(() => normalizeShopify(input)).toThrowError(NormalizationError);
    try {
      normalizeShopify(input);
    } catch (error) {
      expect(error).toMatchObject({ code: "UNSUPPORTED_SHOPIFY_EXPORT_GRAIN" });
    }
  });
});
