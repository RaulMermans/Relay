import type { AdvertisingObservation, NormalizerInput } from "./types";
import { assertProvider, mappedValue, optionalText, provenanceFor } from "./types";
import {
  NormalizationError,
  normalizeCount,
  normalizeCurrency,
  normalizeDate,
  normalizeMicrosMoney,
  normalizeMoney,
} from "./values";

type AdvertisingProvider = "meta_ads" | "google_ads";

function requiredDate(value: string): string {
  const date = normalizeDate(value);
  if (!date) throw new NormalizationError("ROW_REQUIRED_VALUE_MISSING", "A required date value is missing.");
  return date;
}

function hasAdvertiserContext(observation: AdvertisingObservation): boolean {
  return Boolean(
    observation.sourceAccountId ||
      observation.sourceAccountName ||
      observation.campaignId ||
      observation.campaignName ||
      observation.groupId ||
      observation.groupName ||
      observation.adId ||
      observation.adName,
  );
}

function hasMeasure(observation: AdvertisingObservation): boolean {
  return Boolean(
    observation.spend ||
      observation.impressions ||
      observation.clicks ||
      observation.conversions ||
      observation.attributedRevenue,
  );
}

function googleSpend(value: string, header: string | undefined): string | null {
  if (header?.replace(/^\uFEFF/, "").trim().replace(/\s+/g, " ").toLowerCase() === "cost (micros)") {
    return normalizeMicrosMoney(value);
  }
  return normalizeMoney(value);
}

export function normalizeAdvertising(
  provider: AdvertisingProvider,
  input: NormalizerInput,
): AdvertisingObservation[] {
  assertProvider(input, provider);
  return input.rows.map((row, rowIndex) => {
    const spend =
      provider === "google_ads"
        ? googleSpend(mappedValue(input, row, "spend"), input.mapping.fields.spend?.header)
        : normalizeMoney(mappedValue(input, row, "spend"));
    const attributedRevenue = normalizeMoney(mappedValue(input, row, "attributed_revenue"));
    const currencyCode = normalizeCurrency(mappedValue(input, row, "currency"));
    if ((spend || attributedRevenue) && !currencyCode) {
      throw new NormalizationError("CURRENCY_REQUIRED", "A currency is required for reported money values.");
    }

    const observation: AdvertisingObservation = {
      domain: "advertising",
      source: provider,
      sourceAccountId: optionalText(mappedValue(input, row, "source_account_id")),
      sourceAccountName: optionalText(mappedValue(input, row, "source_account_name")),
      date: requiredDate(mappedValue(input, row, "date")),
      sourceTimezone: null,
      campaignId: optionalText(mappedValue(input, row, "campaign_id")),
      campaignName: optionalText(mappedValue(input, row, "campaign_name")),
      groupId: optionalText(mappedValue(input, row, "group_id")),
      groupName: optionalText(mappedValue(input, row, "group_name")),
      adId: optionalText(mappedValue(input, row, "ad_id")),
      adName: optionalText(mappedValue(input, row, "ad_name")),
      currencyCode,
      spend,
      impressions: normalizeCount(mappedValue(input, row, "impressions")),
      clicks: normalizeCount(mappedValue(input, row, "clicks")),
      conversions: normalizeCount(mappedValue(input, row, "conversions")),
      attributedRevenue,
      provenance: provenanceFor(input, rowIndex + 2),
    };

    if (!hasAdvertiserContext(observation) || !hasMeasure(observation)) {
      throw new NormalizationError(
        "ROW_REQUIRED_VALUE_MISSING",
        "A required advertising context or measure value is missing.",
      );
    }
    return observation;
  });
}
