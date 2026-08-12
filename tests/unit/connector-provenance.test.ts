import { describe, expect, it } from "vitest";

import { checkProvenance } from "../../lib/data-health/checks/provenance";
import type { AdvertisingObservation } from "../../lib/normalization/types";

function apiObservation(overrides: Partial<AdvertisingObservation> = {}): AdvertisingObservation {
  return {
    domain: "advertising",
    source: "meta_ads",
    sourceAccountId: "act_1",
    sourceAccountName: "Relay Demo",
    date: "2026-07-01",
    sourceTimezone: null,
    campaignId: "camp_1",
    campaignName: "Summer launch",
    groupId: "set_1",
    groupName: "Prospecting",
    adId: null,
    adName: null,
    currencyCode: "USD",
    spend: "123.45",
    impressions: "10000",
    clicks: "321",
    conversions: "14",
    attributedRevenue: "567.89",
    provenance: {
      transport: "api",
      provider: "meta_ads",
      externalAccountId: "act_1",
      fetchRequestId: "fetch_1",
      dateRange: { start: "2026-07-01", end: "2026-07-31" },
      providerRecordLocator: "record_1",
    },
    ...overrides,
  };
}

describe("API observation provenance", () => {
  it("passes transport-specific Data Health provenance checks without fake CSV fields", () => {
    expect(checkProvenance([apiObservation()])).toEqual([]);
    expect(apiObservation().provenance).not.toHaveProperty("originalFileName");
    expect(apiObservation().provenance).not.toHaveProperty("sourceRow");
    expect(apiObservation().provenance).not.toHaveProperty("mappingOrigins");
  });

  it("rejects missing fetch identity, provider mismatch, account mismatch, invalid range, and unsafe locator", () => {
    const invalid = apiObservation({
      provenance: {
        transport: "api",
        provider: "google_ads",
        externalAccountId: "injected",
        fetchRequestId: "",
        dateRange: { start: "2026-07-31", end: "2026-07-01" },
        providerRecordLocator: "unsafe\nlocator",
      },
    });
    const codes = checkProvenance([invalid]).map((finding) => finding.code);

    expect(codes).toEqual(
      expect.arrayContaining([
        "PROVENANCE_PROVIDER_MISMATCH",
        "PROVENANCE_EXTERNAL_ACCOUNT_ID_MISMATCH",
        "PROVENANCE_FETCH_REQUEST_ID_MISSING",
        "PROVENANCE_DATE_RANGE_INVALID",
        "PROVENANCE_RECORD_LOCATOR_INVALID",
      ]),
    );
  });

  it("rejects a canonical record outside its fetch range and a secret-bearing locator", () => {
    const invalid = apiObservation({
      provenance: {
        transport: "api",
        provider: "meta_ads",
        externalAccountId: "act_1",
        fetchRequestId: "fetch_1",
        dateRange: { start: "2026-07-02", end: "2026-07-31" },
        providerRecordLocator: "https://provider.test/record?access_token=secret",
      },
    });
    const codes = checkProvenance([invalid]).map((finding) => finding.code);

    expect(codes).toEqual(
      expect.arrayContaining([
        "PROVENANCE_OBSERVATION_OUTSIDE_DATE_RANGE",
        "PROVENANCE_RECORD_LOCATOR_INVALID",
      ]),
    );
  });
});
