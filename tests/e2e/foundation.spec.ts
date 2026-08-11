import { expect, test } from "@playwright/test";

test("renders the Relay foundation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Relay" })).toBeVisible();
  await expect(page.getByText("Inspect one CSV before it enters your reporting workflow.")).toBeVisible();
});

test("returns the deterministic health payload", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({
    status: "ok",
    service: "relay",
  });
});
