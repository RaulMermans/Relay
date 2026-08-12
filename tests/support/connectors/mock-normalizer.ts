import type { ProviderFetchResult } from "../../../lib/connectors/types";
import type { AdvertisingObservation } from "../../../lib/normalization/types";
import {
  normalizeCount,
  normalizeCurrency,
  normalizeDate,
  normalizeMoney,
} from "../../../lib/normalization/values";
import type { MockAdvertisingRecord } from "./mock-connector";

function optionalText(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function normalizeMockAdvertisingRecords(
  result: ProviderFetchResult<MockAdvertisingRecord>,
): AdvertisingObservation[] {
  return result.records.map((record) => {
    const date = normalizeDate(record.date);
    if (!date) throw new Error("The synthetic mock record requires a date.");
    return {
      domain: "advertising",
      source: "meta_ads",
      sourceAccountId: optionalText(record.sourceAccountId),
      sourceAccountName: optionalText(record.sourceAccountName),
      date,
      sourceTimezone: null,
      campaignId: optionalText(record.campaignId),
      campaignName: optionalText(record.campaignName),
      groupId: optionalText(record.groupId),
      groupName: optionalText(record.groupName),
      adId: optionalText(record.adId),
      adName: optionalText(record.adName),
      currencyCode: normalizeCurrency(record.currency),
      spend: normalizeMoney(record.spend ?? ""),
      impressions: normalizeCount(record.impressions ?? ""),
      clicks: normalizeCount(record.clicks ?? ""),
      conversions: normalizeCount(record.conversions ?? ""),
      attributedRevenue: normalizeMoney(record.purchaseValue ?? ""),
      provenance: {
        transport: "api",
        provider: result.provider,
        externalAccountId: result.provenance.externalAccountId,
        fetchRequestId: result.provenance.fetchRequestId,
        dateRange: result.dateRange,
        providerRecordLocator: record.recordId,
      },
    };
  });
}
