import type {
  AdvertisingCanonicalField,
  CommerceCanonicalField,
  ObservationDomain,
  ProviderSource,
} from "./types";

type ProviderFieldCatalog =
  | { domain: Extract<ObservationDomain, "advertising">; fields: Record<AdvertisingCanonicalField, string[]> }
  | { domain: Extract<ObservationDomain, "commerce">; fields: Record<CommerceCanonicalField, string[]> };

const META_ADS_FIELDS: Record<AdvertisingCanonicalField, string[]> = {
  date: ["Date start"],
  source_account_id: ["Account ID"],
  source_account_name: ["Account name"],
  campaign_id: ["Campaign ID"],
  campaign_name: ["Campaign name", "Campaign"],
  group_id: ["Ad set ID"],
  group_name: ["Ad set name", "Ad set"],
  ad_id: ["Ad ID"],
  ad_name: ["Ad name"],
  currency: ["Currency"],
  spend: ["Amount spent", "Spend"],
  impressions: ["Impressions"],
  clicks: ["Link clicks", "Clicks", "Outbound clicks"],
  conversions: ["Purchases", "Website purchases"],
  attributed_revenue: ["Purchase conversion value", "Website purchase conversion value"],
};

const GOOGLE_ADS_FIELDS: Record<AdvertisingCanonicalField, string[]> = {
  date: ["Day"],
  source_account_id: ["Customer ID"],
  source_account_name: ["Customer"],
  campaign_id: ["Campaign ID"],
  campaign_name: ["Campaign", "Campaign name"],
  group_id: ["Ad group ID"],
  group_name: ["Ad group", "Ad group name"],
  ad_id: ["Ad ID"],
  ad_name: ["Ad name"],
  currency: ["Currency code"],
  spend: ["Cost", "Cost (micros)"],
  impressions: ["Impressions", "Impr."],
  clicks: ["Clicks", "Interactions"],
  conversions: ["Conversions", "All conv."],
  attributed_revenue: ["Conv. value", "Conversion value", "All conv. value"],
};

const SHOPIFY_FIELDS: Record<CommerceCanonicalField, string[]> = {
  date: ["Created at", "Paid at", "Processed at"],
  source_store_id: [],
  source_store_name: [],
  order_id: ["Name", "Order", "Order name"],
  currency: ["Currency"],
  gross_revenue: ["Total", "Total sales"],
  net_revenue: [],
  refunds: [],
  customers: [],
  new_customers: [],
};

export const PROVIDER_FIELD_CATALOG: Record<ProviderSource, ProviderFieldCatalog> = {
  meta_ads: { domain: "advertising", fields: META_ADS_FIELDS },
  google_ads: { domain: "advertising", fields: GOOGLE_ADS_FIELDS },
  shopify: { domain: "commerce", fields: SHOPIFY_FIELDS },
};
