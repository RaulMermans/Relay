import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const metaFixture = resolve("fixtures/raw/data-health/meta-aligned.csv");
const googleFixture = resolve("fixtures/raw/data-health/google-aligned.csv");
const shopifyFixture = resolve("fixtures/raw/data-health/shopify-aligned.csv");
const ambiguousMappingFixture = resolve("fixtures/raw/failures/meta-ambiguous-mapping.csv");
const unknownFixture = resolve("fixtures/raw/unknown/newsletter-export.csv");
const changeFixture = resolve("fixtures/raw/change-intelligence/meta-deterioration.csv");

async function openSources(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel("Client name").fill("Workspace Test Client");
  await page.getByRole("button", { name: "Create client" }).click();
  await page.getByRole("button", { name: "Data Sources" }).click();
}

test("prepares a complete three-source workspace directly into the dashboard", async ({ page }) => {
  await openSources(page);
  await page.getByLabel("Reporting period start").fill("2026-08-01");
  await page.getByLabel("Reporting period end").fill("2026-08-02");
  await page.getByLabel("Meta Ads CSV").setInputFiles(metaFixture);
  await page.getByLabel("Google Ads CSV").setInputFiles(googleFixture);
  await page.getByLabel("Shopify CSV").setInputFiles(shopifyFixture);
  await page.getByRole("button", { name: "Prepare dashboard" }).click();

  await expect(page.getByRole("heading", { name: "Performance" })).toBeVisible();
  await expect(page.getByTestId("hero-commerce_revenue")).toContainText("€225");
  await expect(page.getByTestId("hero-spend")).toContainText("€55");
  await expect(page.getByTestId("hero-mer")).toContainText("4.09x");
  await expect(page.getByRole("heading", { name: "What Changed" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Channels" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Meta Ads" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Google Ads" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Shopify" })).toBeVisible();
  await expect(page.getByText("Data quality Good", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Daily commerce revenue and paid spend trend")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review field mapping" })).toHaveCount(0);
});

test("reveals only the ambiguous Meta fields and re-analyzes after correction", async ({ page }) => {
  await openSources(page);
  await page.getByLabel("Reporting period start").fill("2026-07-01");
  await page.getByLabel("Reporting period end").fill("2026-07-01");
  await page.getByLabel("Meta Ads CSV").setInputFiles(ambiguousMappingFixture);
  await page.getByRole("button", { name: "Prepare dashboard" }).click();

  await expect(page.getByRole("heading", { name: "Relay needs help with 2 fields" })).toBeVisible();
  await page.getByLabel("Map Campaign", { exact: true }).selectOption("campaign_name");
  await page.getByLabel("Map Campaign name", { exact: true }).selectOption("__ignored");
  await page.getByRole("button", { name: "Re-analyze data" }).click();

  await expect(page.getByRole("heading", { name: "Performance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Meta Ads" })).toBeVisible();
  await expect(page.getByText("Data quality Good", { exact: true })).toBeVisible();
});

test("shows a human-readable error and preserves source management context", async ({ page }) => {
  await openSources(page);
  await page.getByLabel("Reporting period start").fill("2026-08-01");
  await page.getByLabel("Reporting period end").fill("2026-08-02");
  await page.getByLabel("Meta Ads CSV").setInputFiles(unknownFixture);
  await page.getByRole("button", { name: "Prepare dashboard" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "Data needs a second look" })).toContainText("Relay couldn’t identify the Meta Ads CSV");
  await expect(page.getByLabel("Meta Ads CSV")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("surfaces a transient CPA target breach in Attention", async ({ page }) => {
  await openSources(page);
  await page.getByLabel("Reporting period start").fill("2026-08-01");
  await page.getByLabel("Reporting period end").fill("2026-08-02");
  await page.getByLabel("Meta Ads CSV").setInputFiles(changeFixture);
  await page.getByText("Client reporting memory Saved in this browser").click();
  await page.getByLabel("CPA target below").fill("6");
  await page.getByLabel("CPA target currency").fill("EUR");
  await page.getByRole("button", { name: "Prepare dashboard" }).click();

  await expect(page.getByRole("heading", { name: "Attention" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Attention" }).getByRole("heading", { name: "CPA is outside target" })).toBeVisible();
});

test("keeps the primary shell usable at a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Client name").fill("Mobile Client");
  await page.getByRole("button", { name: "Create client" }).click();

  await expect(page.getByRole("button", { name: "Overview" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Data Sources" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
