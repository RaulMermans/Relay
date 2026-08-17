import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const metaFixture = resolve("fixtures/raw/data-health/meta-aligned.csv");
const googleFixture = resolve("fixtures/raw/data-health/google-aligned.csv");
const shopifyFixture = resolve("fixtures/raw/data-health/shopify-aligned.csv");
const ambiguousMappingFixture = resolve("fixtures/raw/failures/meta-ambiguous-mapping.csv");

async function createClient(page: import("@playwright/test").Page, name: string) {
  await page.getByLabel("Client name").fill(name);
  await page.getByRole("button", { name: "Create client" }).click();
  await expect(page.getByLabel("Active client").locator("option:checked")).toHaveText(name);
}

async function analyzeCompleteWorkspace(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Data Sources" }).click();
  await page.getByLabel("Reporting period start").fill("2026-08-01");
  await page.getByLabel("Reporting period end").fill("2026-08-02");
  await page.getByLabel("Meta Ads CSV").setInputFiles(metaFixture);
  await page.getByLabel("Google Ads CSV").setInputFiles(googleFixture);
  await page.getByLabel("Shopify CSV").setInputFiles(shopifyFixture);
  await page.getByRole("button", { name: "Prepare dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Performance" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("restores the active client, dashboard, history, and freshness after reload", async ({ page }) => {
  await createClient(page, "Acme Skincare");
  await analyzeCompleteWorkspace(page);
  await expect(page.getByText(/Data through Aug 2/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent reports" })).toBeVisible();

  await page.reload();

  await expect(page.getByLabel("Active client").locator("option:checked")).toHaveText("Acme Skincare");
  await expect(page.getByRole("heading", { name: "Performance" })).toBeVisible();
  await expect(page.getByTestId("hero-commerce_revenue")).toContainText("€225");
  await expect(page.getByText(/Data through Aug 2/)).toBeVisible();
  await expect(page.getByText("Browser-only memory")).toBeVisible();
});

test("reuses an approved mapping in the next reporting cycle", async ({ page }) => {
  await createClient(page, "Mapping Client");
  await page.getByRole("button", { name: "Data Sources" }).click();
  await page.getByLabel("Reporting period start").fill("2026-07-01");
  await page.getByLabel("Reporting period end").fill("2026-07-01");
  await page.getByLabel("Meta Ads CSV").setInputFiles(ambiguousMappingFixture);
  await page.getByRole("button", { name: "Prepare dashboard" }).click();
  await page.getByLabel("Map Campaign", { exact: true }).selectOption("campaign_name");
  await page.getByLabel("Map Campaign name", { exact: true }).selectOption("__ignored");
  await page.getByRole("button", { name: "Re-analyze data" }).click();
  await expect(page.getByRole("heading", { name: "Performance" })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Update data" }).first().click();
  await expect(page.getByText("Expected for this client", { exact: true })).toBeVisible();
  await page.getByLabel("Meta Ads CSV").setInputFiles(ambiguousMappingFixture);
  await page.getByRole("button", { name: "Update dashboard" }).click();

  await expect(page.getByRole("heading", { name: "Performance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Relay needs help/ })).toHaveCount(0);
});

test("switches between isolated client snapshots and configuration", async ({ page }) => {
  await createClient(page, "Client A");
  await analyzeCompleteWorkspace(page);
  await page.getByRole("button", { name: "New client" }).click();
  await page.getByLabel("New client name").fill("Client B");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByLabel("Active client").locator("option:checked")).toHaveText("Client B");
  await expect(page.getByRole("heading", { name: "Your performance workspace starts with trusted data." })).toBeVisible();

  await page.getByLabel("Active client").selectOption({ label: "Client A" });
  await expect(page.getByRole("heading", { name: "Performance" })).toBeVisible();
  await expect(page.getByTestId("hero-commerce_revenue")).toContainText("€225");

  await page.getByLabel("Active client").selectOption({ label: "Client B" });
  await expect(page.getByRole("heading", { name: "Your performance workspace starts with trusted data." })).toBeVisible();
  await expect(page.getByTestId("hero-commerce_revenue")).toHaveCount(0);
});

test("keeps the returning-client dashboard usable at tablet and mobile widths", async ({ page }) => {
  await createClient(page, "Responsive Client");
  await analyzeCompleteWorkspace(page);

  for (const viewport of [{ width: 820, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expect(page.getByLabel("Active client")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Performance" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Update data" }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
