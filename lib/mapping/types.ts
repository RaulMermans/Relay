export type ProviderSource = "meta_ads" | "google_ads" | "shopify";

export type ObservationDomain = "advertising" | "commerce";

export type AdvertisingCanonicalField =
  | "date"
  | "source_account_id"
  | "source_account_name"
  | "campaign_id"
  | "campaign_name"
  | "group_id"
  | "group_name"
  | "ad_id"
  | "ad_name"
  | "currency"
  | "spend"
  | "impressions"
  | "clicks"
  | "conversions"
  | "attributed_revenue";

export type CommerceCanonicalField =
  | "date"
  | "source_store_id"
  | "source_store_name"
  | "order_id"
  | "currency"
  | "gross_revenue"
  | "net_revenue"
  | "refunds"
  | "customers"
  | "new_customers";

export type CanonicalField = AdvertisingCanonicalField | CommerceCanonicalField;
export type MappingStatus = "mapped" | "unmapped" | "ambiguous" | "ignored";
export type MappingOrigin = "exact_alias" | "normalized_alias" | "manual" | null;

export type RequiredSemantic =
  | "date"
  | "currency"
  | "advertising_context"
  | "advertising_measure"
  | "order_id"
  | "gross_revenue";

export type FieldMapping = {
  columnIndex: number;
  header: string;
  canonicalField: CanonicalField | null;
  status: MappingStatus;
  origin: MappingOrigin;
  candidates: CanonicalField[];
};

export type MappingProposal = {
  provider: ProviderSource;
  domain: ObservationDomain;
  status: "ready" | "needs_review";
  fields: FieldMapping[];
  requiredMissing: RequiredSemantic[];
  allowedTargets: CanonicalField[];
};

export type MappingOverride = {
  columnIndex: number;
  canonicalField: CanonicalField | null;
};

export type ApprovedFieldMapping = {
  provider: ProviderSource;
  domain: ObservationDomain;
  fields: Partial<Record<CanonicalField, FieldMapping>>;
  ignoredHeaders: string[];
};
