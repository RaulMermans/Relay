import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { POST } from "../../app/api/intake/csv/route";

describe("POST /api/intake/csv", () => {
  it("returns an accepted structured result for a synthetic Meta Ads CSV", async () => {
    const content = await readFile(
      new URL("../../fixtures/raw/meta_ads/representative-export.csv", import.meta.url),
      "utf8",
    );
    const formData = new FormData();
    const file = new File([content], "meta-week.csv", { type: "text/csv" });
    formData.set("file", file);

    const response = await POST(
      new Request("http://relay.test/api/intake/csv", { method: "POST", body: formData }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "accepted",
      file: { name: "meta-week.csv", sizeBytes: file.size },
      csv: { rowCount: 2 },
      sourceDetection: { source: "meta_ads", confidence: "high" },
    });
  });

  it("returns a structured 4xx error without parser details", async () => {
    const formData = new FormData();
    formData.set("file", new File(['Campaign,Spend\n"Unclosed,100'], "broken.csv", { type: "text/csv" }));

    const response = await POST(
      new Request("http://relay.test/api/intake/csv", { method: "POST", body: formData }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      status: "rejected",
      error: {
        code: "CSV_PARSE_ERROR",
        message: "The file could not be parsed as CSV.",
      },
    });
  });

  it("returns a needs-review response for an unknown source", async () => {
    const content = await readFile(
      new URL("../../fixtures/raw/unknown/newsletter-export.csv", import.meta.url),
      "utf8",
    );
    const formData = new FormData();
    formData.set("file", new File([content], "newsletter.csv", { type: "text/csv" }));

    const response = await POST(
      new Request("http://relay.test/api/intake/csv", { method: "POST", body: formData }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "needs_review",
      sourceDetection: { source: "unknown" },
    });
  });
});
