import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const metaFixture = resolve("fixtures/raw/meta_ads/representative-export.csv");
const googleFixture = resolve("fixtures/raw/google_ads/representative-export.csv");
const unknownFixture = resolve("fixtures/raw/unknown/newsletter-export.csv");
const missingDateFixture = resolve("fixtures/raw/failures/meta-missing-date.csv");
const ambiguousMappingFixture = resolve("fixtures/raw/failures/meta-ambiguous-mapping.csv");
const changeFixture = resolve("fixtures/raw/change-intelligence/meta-deterioration.csv");

test("uploads a synthetic Meta Ads CSV and shows its source evidence", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("CSV file").setInputFiles(metaFixture);
  await page.getByRole("button", { name: "Inspect CSV" }).click();

  await expect(page.getByRole("heading", { name: "Meta Ads" })).toBeVisible();
  await expect(page.getByText("2 data rows")).toBeVisible();
  await page.getByText("View 9 headers").click();
  await expect(page.getByRole("list").getByText("Campaign name", { exact: true })).toBeVisible();
});

test("keeps the synthetic Google Ads CSV path functional without API credentials", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("CSV file").setInputFiles(googleFixture);
  await page.getByRole("button", { name: "Inspect CSV" }).click();
  await expect(page.getByRole("heading", { name: "Google Ads" })).toBeVisible();
  await page.getByRole("button", { name: "Normalize CSV" }).click();
  await expect(page.getByText("2 canonical advertising observations")).toBeVisible();
  await expect(page.getByText("Google Ads ROAS", { exact: true })).toBeVisible();
});

test("shows a review state for an unsupported CSV", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("CSV file").setInputFiles(unknownFixture);
  await page.getByRole("button", { name: "Inspect CSV" }).click();

  await expect(page.getByRole("heading", { name: "Source needs review" })).toBeVisible();
  await expect(page.getByText("Relay could not identify this CSV safely.")).toBeVisible();
});

test("reviews the detected mapping and normalizes a supported CSV", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("CSV file").setInputFiles(metaFixture);
  await page.getByRole("button", { name: "Inspect CSV" }).click();

  await expect(page.getByRole("heading", { name: "Review field mapping" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Date start", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Normalize CSV" }).click();

  await expect(page.getByRole("heading", { name: "Normalization complete" })).toBeVisible();
  await expect(page.getByText("2 canonical advertising observations")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Data Health" })).toBeVisible();
  await expect(page.getByText("Review required", { exact: true })).toBeVisible();
  await expect(page.getByText("Paid-platform attribution is present without a commerce source for store-side context.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "KPI summary" })).toBeVisible();
  await expect(page.getByText("Spend", { exact: true })).toBeVisible();
  await expect(page.getByText("Meta Ads ROAS", { exact: true })).toBeVisible();
  await expect(page.getByText("Commerce Revenue", { exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Acknowledge warnings" }).click();
  await expect(page.getByText("Ready for analytics", { exact: true })).toBeVisible();
});

test("shows a clear mapping correction state when a required field is absent", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("CSV file").setInputFiles(missingDateFixture);
  await page.getByRole("button", { name: "Inspect CSV" }).click();

  await expect(page.getByRole("heading", { name: "Review field mapping" })).toBeVisible();
  await expect(page.getByText("Date is required before normalization.")).toBeVisible();
});

test("allows a user to resolve an ambiguous mapping before normalizing", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("CSV file").setInputFiles(ambiguousMappingFixture);
  await page.getByRole("button", { name: "Inspect CSV" }).click();

  await page.getByLabel("Canonical field for Campaign", { exact: true }).selectOption("campaign_name");
  await page.getByLabel("Canonical field for Campaign name", { exact: true }).selectOption("__ignored");
  await page.getByRole("button", { name: "Normalize CSV" }).click();

  await expect(page.getByRole("heading", { name: "Normalization complete" })).toBeVisible();
  await expect(page.getByText("1 canonical advertising observation")).toBeVisible();
});

test("shows deterministic What Changed observations and a transient target breach", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("CSV file").setInputFiles(changeFixture);
  await page.getByRole("button", { name: "Inspect CSV" }).click();
  await page.getByLabel("Current period start").fill("2026-08-01");
  await page.getByLabel("Current period end").fill("2026-08-02");
  await page.getByLabel("CPA target below").fill("6");
  await page.getByLabel("CPA target currency").fill("EUR");
  await page.getByRole("button", { name: "Normalize CSV" }).click();

  await expect(page.getByRole("heading", { name: "What Changed" })).toBeVisible();
  await expect(page.getByText("Target breached", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "What Changed" }).getByRole("heading", { name: "Meta Ads ROAS" })).toBeVisible();
  await expect(page.getByText("Unfavorable · Major", { exact: true }).first()).toBeVisible();
});
