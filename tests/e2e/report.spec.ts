import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const metaFixture = resolve("fixtures/raw/data-health/meta-aligned.csv");
const googleFixture = resolve("fixtures/raw/data-health/google-aligned.csv");
const shopifyFixture = resolve("fixtures/raw/data-health/shopify-aligned.csv");
const shopifyUsdFixture = resolve("fixtures/raw/data-health/shopify-usd.csv");

async function createClient(page: import("@playwright/test").Page, name: string) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel("Client name").fill(name);
  await page.getByRole("button", { name: "Create client" }).click();
  await page.getByRole("button", { name: "Data Sources" }).click();
  await page.getByLabel("Reporting period start").fill("2026-08-01");
  await page.getByLabel("Reporting period end").fill("2026-08-02");
}

async function prepareComplete(page: import("@playwright/test").Page) {
  await page.getByLabel("Meta Ads CSV").setInputFiles(metaFixture);
  await page.getByLabel("Google Ads CSV").setInputFiles(googleFixture);
  await page.getByLabel("Shopify CSV").setInputFiles(shopifyFixture);
  await page.getByRole("button", { name: "Prepare dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Performance", exact: true })).toBeVisible();
}

test("opens a client-ready report and explicitly prints the current report once", async ({ page }) => {
  await createClient(page, "Acme Skincare");
  await prepareComplete(page);
  await page.getByRole("button", { name: "Open report" }).click();

  await expect(page.getByRole("heading", { name: "Acme Skincare" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Source-specific results" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Data quality: Good" })).toBeVisible();
  await expect(page.getByText(/This report reflects manually supplied data/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "How to read this report" })).toBeVisible();

  await page.evaluate(() => { window.print = () => { document.documentElement.dataset.reportPrints = String(Number(document.documentElement.dataset.reportPrints ?? "0") + 1); }; });
  await page.getByRole("button", { name: "Export PDF" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.reportPrints)).toBe("1");
});

test("keeps paid-media-only reports honest about unavailable commerce metrics", async ({ page }) => {
  await createClient(page, "Paid Media Client");
  await page.getByLabel("Meta Ads CSV").setInputFiles(metaFixture);
  await page.getByLabel("Google Ads CSV").setInputFiles(googleFixture);
  await page.getByRole("button", { name: "Prepare dashboard" }).click();
  await page.getByRole("button", { name: "Reports" }).click();

  await expect(page.getByText("Shopify data isn’t included. Commerce Revenue and MER are unavailable; paid-media metrics remain source-specific.")).toBeVisible();
  await expect(page.getByText("Commerce Revenue", { exact: true })).toHaveCount(0);
  await expect(page.getByText("MER", { exact: true })).toHaveCount(0);
});

test("blocks stale export until the report is explicitly refreshed", async ({ page }) => {
  await createClient(page, "Stale Report Client");
  await prepareComplete(page);
  await page.getByRole("button", { name: "Reports" }).click();
  await page.getByRole("button", { name: "Back to dashboard" }).click();
  await page.getByRole("button", { name: "Update data" }).last().click();
  await page.getByLabel("Reporting period start").fill("2026-08-02");
  await page.getByLabel("Reporting period end").fill("2026-08-02");
  await page.getByRole("button", { name: "Update dashboard" }).click();
  await page.getByRole("button", { name: "Open report" }).click();

  await expect(page.locator(".report-stale")).toContainText("This report is based on an older analysis.");
  await expect(page.getByRole("button", { name: "Export PDF" })).toBeDisabled();
  await page.getByRole("button", { name: "Refresh report" }).click();
  await expect(page.locator(".report-stale")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export PDF" })).toBeEnabled();
});

test("does not offer a performance report when Data Health is blocked", async ({ page }) => {
  await createClient(page, "Blocked Report Client");
  await page.getByLabel("Meta Ads CSV").setInputFiles(metaFixture);
  await page.getByLabel("Shopify CSV").setInputFiles(shopifyUsdFixture);
  await page.getByRole("button", { name: "Prepare dashboard" }).click();

  await expect(page.getByText("Performance is paused")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open report" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Export PDF" })).toHaveCount(0);
});

test("keeps the report canvas usable across preview sizes and A4 print media", async ({ page }) => {
  await createClient(page, "A deliberately long client name for report layout review");
  await prepareComplete(page);
  await page.getByRole("button", { name: "Open report" }).click();

  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole("heading", { name: "A deliberately long client name for report layout review" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }

  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".client-report")).toBeVisible();
  await expect(page.locator(".report-toolbar")).toBeHidden();
});
