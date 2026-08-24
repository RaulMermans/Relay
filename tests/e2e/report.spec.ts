import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const metaFixture = resolve("fixtures/raw/data-health/meta-aligned.csv");
const googleFixture = resolve("fixtures/raw/data-health/google-aligned.csv");
const shopifyFixture = resolve("fixtures/raw/data-health/shopify-aligned.csv");
const shopifyUsdFixture = resolve("fixtures/raw/data-health/shopify-usd.csv");
const targetBreachFixture = resolve("fixtures/raw/change-intelligence/meta-deterioration.csv");

async function prepareWorkspace(page: Page, sources: Array<"meta_ads" | "google_ads" | "shopify">) {
  await page.goto("/");
  await page.getByLabel("Client name").fill("Report QA Client");
  await page.getByRole("button", { name: "Create client" }).click();
  await page.getByRole("button", { name: "Data Sources" }).click();
  await page.getByLabel("Reporting period start").fill("2026-08-01");
  await page.getByLabel("Reporting period end").fill("2026-08-02");
  if (sources.includes("meta_ads")) await page.getByLabel("Meta Ads CSV").setInputFiles(metaFixture);
  if (sources.includes("google_ads")) await page.getByLabel("Google Ads CSV").setInputFiles(googleFixture);
  if (sources.includes("shopify")) await page.getByLabel("Shopify CSV").setInputFiles(shopifyFixture);
  await page.getByRole("button", { name: "Prepare dashboard" }).click();
}

test("renders a complete report and invokes browser print exactly once from an explicit export action", async ({ page }) => {
  await page.addInitScript(() => {
    const reportWindow = window as typeof window & { __relayPrintCalls?: number };
    Object.defineProperty(reportWindow, "__relayPrintCalls", { value: 0, writable: true });
    reportWindow.print = () => { reportWindow.__relayPrintCalls = (reportWindow.__relayPrintCalls ?? 0) + 1; };
  });
  await prepareWorkspace(page, ["meta_ads", "google_ads", "shopify"]);
  await page.getByRole("button", { name: "Reports" }).click();

  await expect(page.getByRole("heading", { name: "Report QA Client" })).toBeVisible();
  await expect(page.getByText("Executive summary", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A concise view of this period" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The developments worth reviewing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Source-specific results" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Data quality" })).toBeVisible();
  const quality = page.locator(".report-quality-sources");
  await expect(quality).toContainText("Meta Ads");
  await expect(quality).toContainText("Google Ads");
  await expect(quality).toContainText("Shopify");
  await expect(quality.getByText("Complete", { exact: true })).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "How to read this report" })).toBeVisible();
  await page.getByRole("button", { name: "Export PDF" }).click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __relayPrintCalls?: number }).__relayPrintCalls ?? 0)).toBe(1);
  await expect(page.getByRole("heading", { name: "Report QA Client" })).toBeVisible();
});

test("keeps a paid-media-only report explicit about Shopify-dependent metrics", async ({ page }) => {
  await prepareWorkspace(page, ["meta_ads", "google_ads"]);
  await page.getByRole("button", { name: "Reports" }).click();

  await expect(page.getByText("Shopify data isn’t included. Commerce Revenue and MER are unavailable; paid-media metrics remain source-specific.")).toBeVisible();
  await expect(page.getByText("Commerce Revenue", { exact: true })).toHaveCount(0);
  await expect(page.getByText("MER", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Total revenue", { exact: true })).toHaveCount(0);
});

test("includes a target breach in the report's client-safe Needs attention section", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Client name").fill("Target report client");
  await page.getByRole("button", { name: "Create client" }).click();
  await page.getByRole("button", { name: "Data Sources" }).click();
  await page.getByLabel("Reporting period start").fill("2026-08-01");
  await page.getByLabel("Reporting period end").fill("2026-08-02");
  await page.getByLabel("Meta Ads CSV").setInputFiles(targetBreachFixture);
  await page.getByText("Client reporting memory Saved in this browser").click();
  await page.getByLabel("CPA target below").fill("6");
  await page.getByLabel("CPA target currency").fill("EUR");
  await page.getByRole("button", { name: "Prepare dashboard" }).click();
  await page.getByRole("button", { name: "Reports" }).click();

  await expect(page.getByRole("heading", { name: "Items to review" })).toBeVisible();
  await expect(page.getByText("CPA is outside target", { exact: true })).toBeVisible();
});

test("keeps an older report inspectable while blocking export until it is refreshed", async ({ page }) => {
  await prepareWorkspace(page, ["meta_ads", "google_ads", "shopify"]);
  await page.getByRole("button", { name: "Reports" }).click();
  await page.getByRole("button", { name: "Back to dashboard" }).click();
  await page.getByRole("button", { name: "Data Sources" }).click();
  await page.getByLabel("Reporting period end").fill("2026-08-01");
  await page.getByRole("button", { name: "Update dashboard" }).click();
  await page.getByRole("button", { name: "Reports" }).click();

  await expect(page.locator(".report-stale")).toContainText("This report is based on an older analysis.");
  await expect(page.getByRole("button", { name: "Export PDF" })).toBeDisabled();
  await page.getByRole("button", { name: "Refresh report" }).click();
  await expect(page.locator(".report-stale")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export PDF" })).toBeEnabled();
});

test("does not make a report or export control available when Data Health is blocked", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Client name").fill("Blocked report client");
  await page.getByRole("button", { name: "Create client" }).click();
  await page.getByRole("button", { name: "Data Sources" }).click();
  await page.getByLabel("Reporting period start").fill("2026-08-01");
  await page.getByLabel("Reporting period end").fill("2026-08-02");
  await page.getByLabel("Meta Ads CSV").setInputFiles(metaFixture);
  await page.getByLabel("Shopify CSV").setInputFiles(shopifyUsdFixture);
  await page.getByRole("button", { name: "Prepare dashboard" }).click();

  await expect(page.getByRole("heading", { name: "Performance", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reports" }).click();
  await expect(page.locator(".workspace-error[role=alert]")).toContainText("Resolve the blocking Data Health findings before creating a performance report.");
  await expect(page.getByText("Report preview", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export PDF" })).toHaveCount(0);
});
