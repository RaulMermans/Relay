import type { CommerceObservation, NormalizerInput } from "./types";
import { assertProvider, mappedValue, optionalText, provenanceFor } from "./types";
import { NormalizationError, normalizeCount, normalizeCurrency, normalizeDate, normalizeMoney } from "./values";

function requiredText(value: string, message: string): string {
  const normalized = optionalText(value);
  if (!normalized) throw new NormalizationError("ROW_REQUIRED_VALUE_MISSING", message);
  return normalized;
}

export function normalizeShopify(input: NormalizerInput): CommerceObservation[] {
  assertProvider(input, "shopify");
  const orderIds = new Set<string>();

  return input.rows.map((row, rowIndex) => {
    const orderId = requiredText(mappedValue(input, row, "order_id"), "A required order identifier is missing.");
    if (orderIds.has(orderId)) {
      throw new NormalizationError(
        "UNSUPPORTED_SHOPIFY_EXPORT_GRAIN",
        "Repeated order identifiers are unsupported because they may be line-item rows.",
      );
    }
    orderIds.add(orderId);

    const date = normalizeDate(mappedValue(input, row, "date"));
    const grossRevenue = normalizeMoney(mappedValue(input, row, "gross_revenue"));
    const currencyCode = normalizeCurrency(mappedValue(input, row, "currency"));
    if (!date || !grossRevenue || !currencyCode) {
      throw new NormalizationError("ROW_REQUIRED_VALUE_MISSING", "A required Shopify order value is missing.");
    }

    return {
      domain: "commerce",
      source: "shopify",
      sourceStoreId: optionalText(mappedValue(input, row, "source_store_id")),
      sourceStoreName: optionalText(mappedValue(input, row, "source_store_name")),
      orderId,
      date,
      sourceTimezone: null,
      currencyCode,
      orders: "1",
      grossRevenue,
      netRevenue: normalizeMoney(mappedValue(input, row, "net_revenue")),
      refunds: normalizeMoney(mappedValue(input, row, "refunds")),
      customers: normalizeCount(mappedValue(input, row, "customers")),
      newCustomers: normalizeCount(mappedValue(input, row, "new_customers")),
      provenance: provenanceFor(input, rowIndex + 2),
    } satisfies CommerceObservation;
  });
}
