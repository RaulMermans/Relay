import { describe, expect, it } from "vitest";

describe("createHealthResponse", () => {
  it("returns Relay's deterministic health payload", async () => {
    const { createHealthResponse } = await import("../../lib/health");

    expect(createHealthResponse()).toEqual({
      status: "ok",
      service: "relay",
    });
  });
});
