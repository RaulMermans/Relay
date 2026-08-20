import { describe, expect, it } from "vitest";

describe("validateServerEnvironment", () => {
  it("accepts an empty environment while no runtime configuration is required", async () => {
    const { validateServerEnvironment } = await import("../../lib/env/server");

    expect(validateServerEnvironment({})).toEqual({});
  });

  it("rejects an invalid Node environment without including its value in the error", async () => {
    const { validateServerEnvironment } = await import("../../lib/env/server");

    expect(() => validateServerEnvironment({ NODE_ENV: "not-a-node-environment" })).toThrow(
      "Invalid server environment",
    );
  });
});
