import { describe, expect, it } from "vitest";

import { normalizeCount, normalizeMicrosMoney, normalizeMoney, MAX_NORMALIZED_DECIMAL_CHARACTERS } from "../../lib/normalization/values";

describe("createHealthResponse", () => {
  it("returns Relay's deterministic health payload", async () => {
    const { createHealthResponse } = await import("../../lib/health");

    expect(createHealthResponse()).toEqual({
      status: "ok",
      service: "relay",
    });
  });
});

describe("numeric input bounds", () => {
  it("keeps supported precision deterministic and rejects unbounded or unsupported numeric input", () => {
    expect(normalizeMoney("999999999999.123456789")).toBe("999999999999.123456789");
    expect(() => normalizeCount("-1")).toThrow(expect.objectContaining({ code: "NORMALIZATION_INVALID_VALUE" }));
    expect(() => normalizeMoney("1".repeat(MAX_NORMALIZED_DECIMAL_CHARACTERS + 1))).toThrow(expect.objectContaining({ code: "NORMALIZATION_INVALID_VALUE" }));
    expect(() => normalizeMicrosMoney("9".repeat(MAX_NORMALIZED_DECIMAL_CHARACTERS + 1))).toThrow(expect.objectContaining({ code: "NORMALIZATION_INVALID_VALUE" }));
  });
});
