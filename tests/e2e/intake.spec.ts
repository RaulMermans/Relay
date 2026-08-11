import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const metaFixture = resolve("fixtures/raw/meta_ads/representative-export.csv");
const unknownFixture = resolve("fixtures/raw/unknown/newsletter-export.csv");

test("uploads a synthetic Meta Ads CSV and shows its source evidence", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("CSV file").setInputFiles(metaFixture);
  await page.getByRole("button", { name: "Inspect CSV" }).click();

  await expect(page.getByRole("heading", { name: "Meta Ads" })).toBeVisible();
  await expect(page.getByText("2 data rows")).toBeVisible();
  await page.getByText("View 7 headers").click();
  await expect(page.getByText("Campaign name", { exact: true })).toBeVisible();
});

test("shows a review state for an unsupported CSV", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("CSV file").setInputFiles(unknownFixture);
  await page.getByRole("button", { name: "Inspect CSV" }).click();

  await expect(page.getByRole("heading", { name: "Source needs review" })).toBeVisible();
  await expect(page.getByText("Relay could not identify this CSV safely.")).toBeVisible();
});
