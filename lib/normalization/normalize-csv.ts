import { prepareCsvFile } from "../intake/csv/intake";
import {
  applyMappingOverrides,
  approveFieldMapping,
  proposeFieldMapping,
  type MappingOverride,
  type MappingProposal,
} from "../mapping/field-mapping";
import { normalizeGoogleAds } from "./google-ads";
import { normalizeMetaAds } from "./meta-ads";
import { normalizeShopify } from "./shopify";
import type { AdvertisingObservation, CommerceObservation } from "./types";

export type NormalizationFinding = {
  code: "MIXED_CURRENCIES";
  severity: "warning";
  message: string;
};

export type NormalizationSummary = {
  normalizedRowCount: number;
  dateRange: { start: string; end: string };
  currencies: string[];
  mappedFieldCount: number;
  ignoredFields: string[];
  warnings: string[];
};

export type CsvNormalizationResult =
  | {
      status: "normalized";
      provider: "meta_ads" | "google_ads" | "shopify";
      mapping: MappingProposal;
      observations: (AdvertisingObservation | CommerceObservation)[];
      summary: NormalizationSummary;
      findings: NormalizationFinding[];
    }
  | {
      status: "mapping_required";
      provider: "meta_ads" | "google_ads" | "shopify";
      mapping: MappingProposal;
    }
  | { status: "source_unsupported" };

export type NormalizeCsvOptions = {
  ingestionId: string;
  mappingOverrides?: MappingOverride[];
};

function summarize(
  observations: (AdvertisingObservation | CommerceObservation)[],
  mapping: MappingProposal,
): { summary: NormalizationSummary; findings: NormalizationFinding[] } {
  const dates = observations.map((observation) => observation.date).sort();
  const currencies = [...new Set(observations.flatMap((observation) => (observation.currencyCode ? [observation.currencyCode] : [])))]
    .sort();
  const findings: NormalizationFinding[] =
    currencies.length > 1
      ? [
          {
            code: "MIXED_CURRENCIES",
            severity: "warning",
            message: "The normalized observations contain multiple currencies and cannot be combined without conversion.",
          },
        ]
      : [];
  return {
    summary: {
      normalizedRowCount: observations.length,
      dateRange: { start: dates[0] ?? "", end: dates[dates.length - 1] ?? "" },
      currencies,
      mappedFieldCount: mapping.fields.filter((field) => field.status === "mapped").length,
      ignoredFields: mapping.fields.filter((field) => field.status === "ignored").map((field) => field.header),
      warnings: findings.map((finding) => finding.code),
    },
    findings,
  };
}

export async function normalizeCsvFile(
  file: File | null | undefined,
  options: NormalizeCsvOptions,
): Promise<CsvNormalizationResult> {
  const prepared = await prepareCsvFile(file);
  if (prepared.sourceDetection.source === "unknown") return { status: "source_unsupported" };

  const proposed = proposeFieldMapping(prepared.sourceDetection.source, prepared.parsed.headers);
  const mapping = applyMappingOverrides(proposed, options.mappingOverrides);
  if (mapping.status !== "ready") {
    return { status: "mapping_required", provider: prepared.sourceDetection.source, mapping };
  }

  const normalizerInput = {
    headers: prepared.parsed.headers,
    rows: prepared.parsed.rows,
    mapping: approveFieldMapping(mapping),
    fileName: prepared.file.name,
    ingestionId: options.ingestionId,
  };
  const observations =
    prepared.sourceDetection.source === "meta_ads"
      ? normalizeMetaAds(normalizerInput)
      : prepared.sourceDetection.source === "google_ads"
        ? normalizeGoogleAds(normalizerInput)
        : normalizeShopify(normalizerInput);
  const { summary, findings } = summarize(observations, mapping);

  return {
    status: "normalized",
    provider: prepared.sourceDetection.source,
    mapping,
    observations,
    summary,
    findings,
  };
}
