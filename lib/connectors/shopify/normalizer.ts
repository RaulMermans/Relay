import type { ExternalAccount, ProviderFetchProvenance } from "../types";
import type { CommerceObservation } from "../../normalization/types";
import { normalizeCurrency, normalizeMoney } from "../../normalization/values";
import type { ShopifyOrder } from "./types";

export class ShopifyNormalizationError extends Error {
  constructor(
    readonly code: "INVALID_SHOPIFY_ORDER" | "UNSUPPORTED_SHOPIFY_ORDER_GRAIN",
    message: string,
  ) {
    super(message);
    this.name = "ShopifyNormalizationError";
  }
}

function storeCalendarDate(timestamp: string, timeZone: string): string {
  const instant = new Date(timestamp);
  if (Number.isNaN(instant.valueOf())) {
    throw new ShopifyNormalizationError("INVALID_SHOPIFY_ORDER", "Shopify returned an invalid order timestamp.");
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value;
  const year = value("year");
  const month = value("month");
  const day = value("day");
  if (!year || !month || !day) {
    throw new ShopifyNormalizationError("INVALID_SHOPIFY_ORDER", "Shopify order timezone conversion failed.");
  }
  return `${year}-${month}-${day}`;
}

export function normalizeShopifyOrders(input: {
  records: readonly ShopifyOrder[];
  externalAccount: ExternalAccount;
  provenance: ProviderFetchProvenance;
}): CommerceObservation[] {
  if (!input.externalAccount.timezone) {
    throw new ShopifyNormalizationError("INVALID_SHOPIFY_ORDER", "Shopify store timezone is required.");
  }
  if (input.externalAccount.id !== input.provenance.externalAccountId) {
    throw new ShopifyNormalizationError("INVALID_SHOPIFY_ORDER", "Shopify store identity does not match fetch provenance.");
  }

  const seenOrderIds = new Set<string>();
  return input.records.map((record) => {
    if (seenOrderIds.has(record.id)) {
      throw new ShopifyNormalizationError(
        "UNSUPPORTED_SHOPIFY_ORDER_GRAIN",
        "Repeated Shopify order identifiers are unsupported.",
      );
    }
    seenOrderIds.add(record.id);

    const date = storeCalendarDate(record.createdAt, input.externalAccount.timezone!);
    if (date < input.provenance.dateRange.start || date > input.provenance.dateRange.end) {
      throw new ShopifyNormalizationError("INVALID_SHOPIFY_ORDER", "Shopify returned an order outside the requested date range.");
    }
    const grossRevenue = normalizeMoney(record.totalPriceSet.shopMoney.amount);
    const currencyCode = normalizeCurrency(record.totalPriceSet.shopMoney.currencyCode);
    if (grossRevenue === null || currencyCode === null) {
      throw new ShopifyNormalizationError("INVALID_SHOPIFY_ORDER", "Shopify returned incomplete order money.");
    }

    return {
      domain: "commerce",
      source: "shopify",
      sourceStoreId: input.externalAccount.id,
      sourceStoreName: input.externalAccount.name,
      orderId: record.name,
      date,
      sourceTimezone: null,
      currencyCode,
      orders: "1",
      grossRevenue,
      netRevenue: null,
      refunds: null,
      customers: null,
      newCustomers: null,
      provenance: {
        ...input.provenance,
        providerRecordLocator: record.id,
      },
    } satisfies CommerceObservation;
  });
}
