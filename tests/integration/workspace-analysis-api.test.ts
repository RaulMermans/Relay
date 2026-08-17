import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { POST } from "../../app/api/workspace/analyze/route";

async function fixtureFile(relativePath: string): Promise<File> {
  const content = await readFile(new URL(`../../fixtures/raw/${relativePath}`, import.meta.url), "utf8");
  return new File([content], relativePath.split("/").pop() ?? "fixture.csv", { type: "text/csv" });
}

describe("POST /api/workspace/analyze", () => {
  it("revalidates multipart inputs and returns compact combined analytics", async () => {
    const formData = new FormData();
    formData.set("meta_ads", await fixtureFile("data-health/meta-aligned.csv"));
    formData.set("google_ads", await fixtureFile("data-health/google-aligned.csv"));
    formData.set("shopify", await fixtureFile("data-health/shopify-aligned.csv"));
    formData.set("workspaceContext", JSON.stringify({
      currentPeriod: { start: "2026-08-01", end: "2026-08-02" },
      expectedSources: ["meta_ads", "google_ads", "shopify"],
      mappingOverrides: {},
    }));
    formData.set("changeTargets", "[]");

    const response = await POST(new Request("http://relay.test/api/workspace/analyze", { method: "POST", body: formData }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ status: "ready", dataHealth: { status: "healthy" }, sources: expect.any(Array) });
    expect(payload).not.toHaveProperty("observations");
    expect(payload.sources[0]).not.toHaveProperty("ignoredFields");
    expect(payload.sources[0]).not.toHaveProperty("mappedFieldCount");
    expect(payload.sources[0]).not.toHaveProperty("warnings");
    expect(JSON.stringify(payload)).not.toContain("Summer launch");
  });

  it("rejects malformed context with a stable safe response", async () => {
    const formData = new FormData();
    formData.set("meta_ads", await fixtureFile("data-health/meta-aligned.csv"));
    formData.set("workspaceContext", JSON.stringify({ currentPeriod: { start: "later", end: "earlier" }, expectedSources: ["meta_ads"] }));

    const response = await POST(new Request("http://relay.test/api/workspace/analyze", { method: "POST", body: formData }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      status: "rejected",
      error: { code: "INVALID_WORKSPACE_REQUEST", message: "The workspace analysis request is invalid." },
    });
  });
});
