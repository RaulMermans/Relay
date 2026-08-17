import { expect, test } from "@playwright/test";

test("renders the minimal dashboard-first Relay shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Relay", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your performance workspace starts with trusted data." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Overview" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Data Sources" })).toBeVisible();
  await expect(page.getByLabel("Workspace name")).toHaveValue("Untitled workspace");
  await expect(page.getByRole("button", { name: "Reports" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Settings" })).toHaveCount(0);
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
