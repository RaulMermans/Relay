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

  it("runs Data Health server-side and returns only safe health metadata", async () => {
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
    expect(payload.status).toBe("normalized");
    expect(payload.dataHealth).toMatchObject({ status: "review_required" });
    expect(payload.dataHealth.sourceCoverage).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: "meta_ads", status: "ready" })]),
    );
    expect(payload.dataHealth.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "COMMERCE_SOURCE_ABSENT", blocking: false })]),
    );
    expect(JSON.stringify(payload.dataHealth)).not.toContain("Summer");
    expect(JSON.stringify(payload.dataHealth)).not.toContain("meta.csv");
  });

  it("rejects malformed reporting context before Data Health runs", async () => {
    const content = await readFile(
      new URL("../../fixtures/raw/meta_ads/representative-export.csv", import.meta.url),
      "utf8",
    );
    const formData = new FormData();
    formData.set("file", new File([content], "meta.csv", { type: "text/csv" }));
    formData.set("mappingOverrides", "[]");
    formData.set("dataHealthContext", '{"expectedSources":["not_a_source"]}');

    const response = await POST(
      new Request("http://relay.test/api/normalize/csv", { method: "POST", body: formData }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      status: "rejected",
      error: { code: "INVALID_DATA_HEALTH_CONTEXT", message: "The Data Health context is invalid." },
    });
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
