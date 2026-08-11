import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { POST } from "../../app/api/normalize/csv/route";

describe("POST /api/normalize/csv", () => {
  it("returns a compact normalization summary without echoing observations", async () => {
    const content = await readFile(
      new URL("../../fixtures/raw/meta_ads/representative-export.csv", import.meta.url),
      "utf8",
    );
    const formData = new FormData();
    formData.set("file", new File([content], "meta.csv", { type: "text/csv" }));
    formData.set("mappingOverrides", "[]");

    const response = await POST(
      new Request("http://relay.test/api/normalize/csv", { method: "POST", body: formData }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({
      status: "normalized",
      provider: "meta_ads",
      summary: {
        normalizedRowCount: 2,
        dateRange: { start: "2026-07-01", end: "2026-07-01" },
        currencies: ["USD"],
      },
    });
    expect(payload).not.toHaveProperty("observations");
  });

  it("rejects unsafe mapping payloads with a stable safe error", async () => {
    const content = await readFile(
      new URL("../../fixtures/raw/meta_ads/representative-export.csv", import.meta.url),
      "utf8",
    );
    const formData = new FormData();
    formData.set("file", new File([content], "meta.csv", { type: "text/csv" }));
    formData.set("mappingOverrides", '{"columnIndex": 1}');

    const response = await POST(
      new Request("http://relay.test/api/normalize/csv", { method: "POST", body: formData }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      status: "rejected",
      error: { code: "INVALID_MAPPING_REQUEST", message: "The field mapping request is invalid." },
    });
  });
});
