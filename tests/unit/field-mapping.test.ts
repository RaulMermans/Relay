import { describe, expect, it } from "vitest";

import {
  MappingError,
  applyMappingOverrides,
  proposeFieldMapping,
} from "../../lib/mapping/field-mapping";

describe("proposeFieldMapping", () => {
  it("maps a Meta Ads exact header alias to its canonical field", () => {
    const proposal = proposeFieldMapping("meta_ads", [
      "Date start",
      "Campaign name",
      "Amount spent",
    ]);

    expect(proposal.fields[1]).toMatchObject({
      columnIndex: 1,
      header: "Campaign name",
      canonicalField: "campaign_name",
      status: "mapped",
      origin: "exact_alias",
    });
  });

  it("maps whitespace and casing-normalized aliases deterministically", () => {
    const proposal = proposeFieldMapping("meta_ads", ["Date start", "  CAMPAIGN   NAME ", "Amount spent"]);

    expect(proposal.fields[1]).toMatchObject({
      canonicalField: "campaign_name",
      status: "mapped",
      origin: "normalized_alias",
    });
  });

  it("leaves unknown optional provider columns explicitly unmapped", () => {
    const proposal = proposeFieldMapping("google_ads", ["Day", "Campaign", "Cost", "Unrecognized measure"]);

    expect(proposal.fields[3]).toMatchObject({
      canonicalField: null,
      status: "unmapped",
      candidates: [],
    });
  });

  it("marks two aliases for one canonical field ambiguous instead of choosing one", () => {
    const proposal = proposeFieldMapping("meta_ads", [
      "Date start",
      "Campaign",
      "Campaign name",
      "Amount spent",
      "Currency",
    ]);

    expect(proposal.status).toBe("needs_review");
    expect(proposal.fields.slice(1, 3)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "ambiguous", canonicalField: null, candidates: ["campaign_name"] }),
      ]),
    );
  });

  it("uses a valid manual override and records its deterministic origin", () => {
    const proposed = proposeFieldMapping("meta_ads", ["Date start", "Campaign", "Amount spent", "Currency"]);
    const overridden = applyMappingOverrides(proposed, [
      { columnIndex: 1, canonicalField: "group_name" },
    ]);

    expect(overridden.fields[1]).toMatchObject({
      canonicalField: "group_name",
      status: "mapped",
      origin: "manual",
    });
  });

  it("rejects a manual cross-domain target", () => {
    const proposed = proposeFieldMapping("meta_ads", ["Date start", "Campaign", "Amount spent", "Currency"]);

    try {
      applyMappingOverrides(proposed, [{ columnIndex: 2, canonicalField: "gross_revenue" }]);
      throw new Error("Expected invalid cross-domain mapping to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(MappingError);
      expect(error).toMatchObject({ code: "INVALID_MAPPING_REQUEST" });
    }
  });

  it("rejects conflicting manual mappings to the same canonical field", () => {
    const proposed = proposeFieldMapping("meta_ads", ["Date start", "Campaign", "Ad set", "Amount spent", "Currency"]);

    try {
      applyMappingOverrides(proposed, [{ columnIndex: 2, canonicalField: "campaign_name" }]);
      throw new Error("Expected duplicate canonical mapping to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(MappingError);
      expect(error).toMatchObject({ code: "DUPLICATE_CANONICAL_MAPPING" });
    }
  });

  it("reports missing provider requirements without manufacturing a mapping", () => {
    const proposal = proposeFieldMapping("shopify", ["Order", "Total", "Currency"]);

    expect(proposal).toMatchObject({ status: "needs_review", requiredMissing: ["date"] });
  });
});
