import { expect, test } from "@playwright/test";

test("renders the Relay foundation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Relay" })).toBeVisible();
  await expect(page.getByText("Inspect one CSV before it enters your reporting workflow.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Shopify API" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Meta Ads API" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Google Ads API" })).toBeVisible();
  await expect(page.locator(".connector-status > p").filter({ hasText: "API adapter implemented. Live connection is not available yet." })).toHaveCount(3);
  await expect(page.getByLabel("CSV file")).toBeVisible();
  await expect(page.getByRole("button", { name: /connect shopify/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /connect meta/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /connect google/i })).toHaveCount(0);
});

test("returns the deterministic health payload", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({
    status: "ok",
    service: "relay",
  });
});
