import { describe, expect, it } from "vitest";

import {
  NormalizationError,
  normalizeCount,
  normalizeDate,
  normalizeMicrosMoney,
  normalizeMoney,
} from "../../lib/normalization/values";

describe("normalization value parsing", () => {
  it("normalizes money into a fixed decimal string without binary arithmetic", () => {
    expect(normalizeMoney("1,234.500")).toBe("1234.5");
    expect(normalizeMoney("0.00")).toBe("0");
  });

  it("keeps an empty optional money field unavailable", () => {
    expect(normalizeMoney("  ")).toBeNull();
  });

  it("normalizes Google Ads micros without a floating-point conversion", () => {
    expect(normalizeMicrosMoney("109000000")).toBe("109");
  });

  it("rejects invalid money text instead of coercing it to zero", () => {
    expect(() => normalizeMoney("not-a-number")).toThrowError(NormalizationError);
    try {
      normalizeMoney("not-a-number");
    } catch (error) {
      expect(error).toMatchObject({ code: "NORMALIZATION_INVALID_VALUE" });
    }
  });

  it("retains negative money adjustments but rejects negative counts", () => {
    expect(normalizeMoney("-12.50")).toBe("-12.5");
    expect(() => normalizeCount("-1")).toThrowError(NormalizationError);
  });

  it("normalizes the source-local calendar component of supported dates", () => {
    expect(normalizeDate("2026-07-03 12:00:00")).toBe("2026-07-03");
  });

  it("rejects malformed calendar dates", () => {
    expect(() => normalizeDate("2026-02-30")).toThrowError(NormalizationError);
  });

  it("rejects an invalid time suffix instead of accepting arbitrary text after a valid date", () => {
    expect(() => normalizeDate("2026-07-03 not-a-time")).toThrowError(NormalizationError);
  });
});
