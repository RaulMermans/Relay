import type { AdvertisingObservation } from "../../normalization/types";
import { normalizeCount, normalizeCurrency, normalizeMicrosMoney, normalizeMoney } from "../../normalization/values";
import type { ExternalAccount, ProviderFetchProvenance } from "../types";
import type { GoogleAdsReportRow } from "./types";

export class GoogleAdsNormalizationError extends Error {
  readonly code = "INVALID_GOOGLE_ADS_ROW";

  constructor(message: string) {
    super(message);
    this.name = "GoogleAdsNormalizationError";
  }
}

function decimalText(value: string | number | undefined): string | null {
  if (value === undefined) return null;
  const text = typeof value === "number" ? String(value) : value;
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) {
    throw new GoogleAdsNormalizationError("Google Ads returned an unsupported decimal representation.");
  }
  return text;
}

export function normalizeGoogleAdsRows(input: {
  records: readonly GoogleAdsReportRow[];
  externalAccount: ExternalAccount;
  provenance: ProviderFetchProvenance;
}): AdvertisingObservation[] {
  if (input.provenance.provider !== "google_ads" || input.externalAccount.id !== input.provenance.externalAccountId) {
    throw new GoogleAdsNormalizationError("Google Ads account identity does not match fetch provenance.");
  }
  if (!input.externalAccount.currency || !input.externalAccount.timezone) {
    throw new GoogleAdsNormalizationError("Google Ads account currency and timezone are required.");
  }

  return input.records.map((record) => {
    try {
      if (record.customer.id !== input.externalAccount.id) {
        throw new GoogleAdsNormalizationError("Google Ads row customer does not match the selected reporting customer.");
      }
      if (record.customer.timeZone !== input.externalAccount.timezone) {
        throw new GoogleAdsNormalizationError("Google Ads row timezone does not match the selected customer.");
      }
      if (record.segments.date < input.provenance.dateRange.start || record.segments.date > input.provenance.dateRange.end) {
        throw new GoogleAdsNormalizationError("Google Ads row is outside the requested customer-timezone date range.");
      }
      const currencyCode = normalizeCurrency(record.customer.currencyCode);
      if (!currencyCode || currencyCode !== input.externalAccount.currency) {
        throw new GoogleAdsNormalizationError("Google Ads row currency does not match the selected customer.");
      }

      return {
        domain: "advertising",
        source: "google_ads",
        sourceAccountId: input.externalAccount.id,
        sourceAccountName: input.externalAccount.name,
        date: record.segments.date,
        sourceTimezone: null,
        campaignId: record.campaign.id,
        campaignName: record.campaign.name,
        groupId: record.adGroup.id,
        groupName: record.adGroup.name,
        adId: null,
        adName: null,
        currencyCode,
        spend: record.metrics.costMicros === undefined ? null : normalizeMicrosMoney(record.metrics.costMicros),
        impressions: record.metrics.impressions === undefined ? null : normalizeCount(record.metrics.impressions),
        clicks: record.metrics.clicks === undefined ? null : normalizeCount(record.metrics.clicks),
        conversions: normalizeCount(decimalText(record.metrics.conversions) ?? ""),
        attributedRevenue: normalizeMoney(decimalText(record.metrics.conversionsValue) ?? ""),
        provenance: {
          ...input.provenance,
          providerRecordLocator: `${record.segments.date}:${record.campaign.id}:${record.adGroup.id}`,
        },
      } satisfies AdvertisingObservation;
    } catch (error) {
      if (error instanceof GoogleAdsNormalizationError) throw error;
      throw new GoogleAdsNormalizationError("Google Ads returned an invalid reporting value.");
    }
  });
}
