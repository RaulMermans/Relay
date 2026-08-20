import type { ApprovedFieldMapping, CanonicalField } from "../mapping/field-mapping";
import type { MappingOrigin, ProviderSource } from "../mapping/types";

export type FixedDecimalString = string;

export type CsvObservationProvenance = {
  transport: "csv";
  ingestionId: string;
  originalFileName: string;
  sourceRow: number;
  mappingOrigins: Partial<Record<CanonicalField, Exclude<MappingOrigin, null>>>;
};

export type ApiObservationProvenance = {
  transport: "api";
  provider: ProviderSource;
  externalAccountId: string;
  fetchRequestId: string;
  dateRange: { start: string; end: string };
  providerRecordLocator?: string;
};

export type ObservationProvenance = CsvObservationProvenance | ApiObservationProvenance;

export type AdvertisingObservation = {
  domain: "advertising";
  source: "meta_ads" | "google_ads";
  sourceAccountId: string | null;
  sourceAccountName: string | null;
  date: string;
  sourceTimezone: null;
  campaignId: string | null;
  campaignName: string | null;
  groupId: string | null;
  groupName: string | null;
  adId: string | null;
  adName: string | null;
  currencyCode: string | null;
  spend: FixedDecimalString | null;
  impressions: FixedDecimalString | null;
  clicks: FixedDecimalString | null;
  conversions: FixedDecimalString | null;
  attributedRevenue: FixedDecimalString | null;
  provenance: ObservationProvenance;
};

export type CommerceObservation = {
  domain: "commerce";
  source: "shopify";
  sourceStoreId: string | null;
  sourceStoreName: string | null;
  orderId: string;
  date: string;
  sourceTimezone: null;
  currencyCode: string;
  orders: FixedDecimalString;
  grossRevenue: FixedDecimalString;
  netRevenue: FixedDecimalString | null;
  refunds: FixedDecimalString | null;
  customers: FixedDecimalString | null;
  newCustomers: FixedDecimalString | null;
  provenance: ObservationProvenance;
};

export type NormalizerInput = {
  headers: string[];
  rows: string[][];
  mapping: ApprovedFieldMapping;
  fileName: string;
  ingestionId: string;
};

export function mappedValue(input: NormalizerInput, row: string[], field: CanonicalField): string {
  const mapping = input.mapping.fields[field];
  return mapping ? (row[mapping.columnIndex] ?? "") : "";
}

export function optionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function provenanceFor(
  input: NormalizerInput,
  sourceRow: number,
): ObservationProvenance {
  const mappingOrigins: CsvObservationProvenance["mappingOrigins"] = {};
  for (const [field, mapping] of Object.entries(input.mapping.fields)) {
    if (mapping?.origin) mappingOrigins[field as CanonicalField] = mapping.origin;
  }
  return {
    transport: "csv",
    ingestionId: input.ingestionId,
    originalFileName: input.fileName,
    sourceRow,
    mappingOrigins,
  };
}

export function assertProvider(input: NormalizerInput, provider: ProviderSource): void {
  if (input.mapping.provider !== provider) {
    throw new Error("Normalizer provider does not match the approved mapping.");
  }
}
