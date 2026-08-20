import type { AdvertisingObservation } from "../../normalization/types";
import { normalizeCount, normalizeCurrency, normalizeMoney } from "../../normalization/values";
import type { ExternalAccount, ProviderFetchProvenance } from "../types";
import type { MetaActionStats, MetaInsightRecord } from "./types";

export class MetaAdsNormalizationError extends Error {
  constructor(
    readonly code: "INVALID_META_INSIGHT" | "UNSUPPORTED_META_ACTION_GRAIN",
    message: string,
  ) {
    super(message);
    this.name = "MetaAdsNormalizationError";
  }
}

function purchaseValue(items: readonly MetaActionStats[] | undefined, field: "count" | "value"): string | null {
  const purchaseItems = items?.filter((item) => item.action_type === "purchase") ?? [];
  if (purchaseItems.length > 1) {
    throw new MetaAdsNormalizationError("UNSUPPORTED_META_ACTION_GRAIN", `Meta returned duplicate purchase ${field} entries.`);
  }
  if (purchaseItems.length === 0) return null;
  return field === "count" ? normalizeCount(purchaseItems[0]!.value) : normalizeMoney(purchaseItems[0]!.value);
}

export function normalizeMetaAdsInsights(input: {
  records: readonly MetaInsightRecord[];
  externalAccount: ExternalAccount;
  provenance: ProviderFetchProvenance;
}): AdvertisingObservation[] {
  if (input.provenance.provider !== "meta_ads" || input.externalAccount.id !== input.provenance.externalAccountId) {
    throw new MetaAdsNormalizationError("INVALID_META_INSIGHT", "Meta account identity does not match fetch provenance.");
  }
  if (!input.externalAccount.currency || !input.externalAccount.timezone) {
    throw new MetaAdsNormalizationError("INVALID_META_INSIGHT", "Meta account currency and timezone are required.");
  }

  return input.records.map((record) => {
    try {
      if (`act_${record.account_id}` !== input.externalAccount.id) {
        throw new MetaAdsNormalizationError("INVALID_META_INSIGHT", "Meta insight account identity does not match selection.");
      }
      if (record.date_start !== record.date_stop) {
        throw new MetaAdsNormalizationError("INVALID_META_INSIGHT", "Meta insight row is not a single account-timezone day.");
      }
      if (record.date_start < input.provenance.dateRange.start || record.date_start > input.provenance.dateRange.end) {
        throw new MetaAdsNormalizationError("INVALID_META_INSIGHT", "Meta insight row is outside the requested date range.");
      }

      const currencyCode = normalizeCurrency(record.account_currency);
      if (!currencyCode || currencyCode !== input.externalAccount.currency) {
        throw new MetaAdsNormalizationError("INVALID_META_INSIGHT", "Meta insight currency does not match the selected account.");
      }

      return {
        domain: "advertising",
        source: "meta_ads",
        sourceAccountId: input.externalAccount.id,
        sourceAccountName: input.externalAccount.name,
        date: record.date_start,
        sourceTimezone: null,
        campaignId: record.campaign_id,
        campaignName: record.campaign_name,
        groupId: record.adset_id,
        groupName: record.adset_name,
        adId: record.ad_id,
        adName: record.ad_name,
        currencyCode,
        spend: normalizeMoney(record.spend),
        impressions: normalizeCount(record.impressions),
        clicks: normalizeCount(record.inline_link_clicks),
        conversions: purchaseValue(record.actions, "count"),
        attributedRevenue: purchaseValue(record.action_values, "value"),
        provenance: {
          ...input.provenance,
          providerRecordLocator: `${record.date_start}:${record.ad_id}`,
        },
      } satisfies AdvertisingObservation;
    } catch (error) {
      if (error instanceof MetaAdsNormalizationError) throw error;
      throw new MetaAdsNormalizationError("INVALID_META_INSIGHT", "Meta returned an invalid numeric insight value.");
    }
  });
}
