import { describe, expect, it } from "vitest";

import type { AdvertisingObservation } from "../../lib/normalization/types";
import { compareCanonicalSemantics } from "../support/connectors/semantic-equivalence";

const csvObservation: AdvertisingObservation = {
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
    transport: "csv",
    ingestionId: "csv_1",
    originalFileName: "synthetic.csv",
    sourceRow: 2,
    mappingOrigins: {
      date: "exact_alias",
      source_account_id: "exact_alias",
      source_account_name: "exact_alias",
      campaign_id: "exact_alias",
      campaign_name: "exact_alias",
      group_id: "exact_alias",
      group_name: "exact_alias",
      currency: "exact_alias",
      spend: "exact_alias",
      impressions: "exact_alias",
      clicks: "exact_alias",
      conversions: "exact_alias",
      attributed_revenue: "exact_alias",
    },
  },
};

const apiObservation: AdvertisingObservation = {
  ...csvObservation,
  provenance: {
    transport: "api",
    provider: "meta_ads",
    externalAccountId: "act_1",
    fetchRequestId: "fetch_1",
    dateRange: { start: "2026-07-01", end: "2026-07-31" },
    providerRecordLocator: "record_1",
  },
};

describe("CSV/API canonical semantic equivalence", () => {
  it("ignores transport provenance and input order only", () => {
    const second = { ...csvObservation, groupId: "set_2", groupName: "Remarketing", spend: "67.89" };
    const secondApi = {
      ...second,
      provenance: { ...apiObservation.provenance, providerRecordLocator: "record_2" },
    };

    expect(compareCanonicalSemantics([csvObservation, second], [secondApi, apiObservation])).toEqual({
      equivalent: true,
      left: expect.any(Array),
      right: expect.any(Array),
    });
  });

  it.each([
    ["spend", { spend: "123.46" }],
    ["attributed revenue", { attributedRevenue: "567.88" }],
    ["null versus zero", { conversions: null }],
    ["currency", { currencyCode: "EUR" }],
  ])("detects a real %s semantic mismatch", (_label, change) => {
    expect(compareCanonicalSemantics([csvObservation], [{ ...apiObservation, ...change }]).equivalent).toBe(false);
  });
});
