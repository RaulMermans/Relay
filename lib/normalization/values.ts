export class NormalizationError extends Error {
  constructor(
    readonly code:
      | "NORMALIZATION_INVALID_VALUE"
      | "NORMALIZATION_INVALID_DATE"
      | "CURRENCY_REQUIRED"
      | "UNSUPPORTED_SHOPIFY_EXPORT_GRAIN"
      | "ROW_REQUIRED_VALUE_MISSING",
    message: string,
  ) {
    super(message);
    this.name = "NormalizationError";
  }
}

function normalizeDecimal(value: string, allowNegative: boolean): string | null {
  const input = value.trim();
  if (input.length === 0) return null;

  const pattern = allowNegative
    ? /^-?(?:(?:\d{1,3}(?:,\d{3})+)|\d+)(?:\.\d+)?$/
    : /^(?:(?:\d{1,3}(?:,\d{3})+)|\d+)(?:\.\d+)?$/;
  if (!pattern.test(input)) {
    throw new NormalizationError("NORMALIZATION_INVALID_VALUE", "The CSV contains an invalid numeric value.");
  }

  const unsigned = input.replace("-", "").replace(/,/g, "");
  const [whole, fraction = ""] = unsigned.split(".");
  const canonicalWhole = whole.replace(/^0+(?=\d)/, "");
  const canonicalFraction = fraction.replace(/0+$/, "");
  const isZero = canonicalWhole === "0" && canonicalFraction.length === 0;
  const sign = input.startsWith("-") && !isZero ? "-" : "";
  return `${sign}${canonicalWhole}${canonicalFraction ? `.${canonicalFraction}` : ""}`;
}

export function normalizeMoney(value: string): string | null {
  return normalizeDecimal(value, true);
}

export function normalizeCount(value: string): string | null {
  return normalizeDecimal(value, false);
}

export function normalizeMicrosMoney(value: string): string | null {
  const micros = value.trim();
  if (micros.length === 0) return null;
  if (!/^-?\d+$/.test(micros)) {
    throw new NormalizationError("NORMALIZATION_INVALID_VALUE", "The CSV contains an invalid numeric value.");
  }

  const sign = micros.startsWith("-") ? "-" : "";
  const digits = micros.replace("-", "").replace(/^0+/, "") || "0";
  const padded = digits.padStart(7, "0");
  const valueAsDecimal = `${sign}${padded.slice(0, -6)}.${padded.slice(-6)}`;
  return normalizeMoney(valueAsDecimal);
}

export function normalizeCurrency(value: string): string | null {
  const currency = value.trim();
  if (currency.length === 0) return null;
  const normalized = currency.toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new NormalizationError("NORMALIZATION_INVALID_VALUE", "The CSV contains an invalid currency code.");
  }
  return normalized;
}

export function normalizeDate(value: string): string | null {
  const input = value.trim();
  if (input.length === 0) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):?[0-5]\d)?)?$/.exec(input);
  if (!match) {
    throw new NormalizationError("NORMALIZATION_INVALID_DATE", "The CSV contains an invalid date.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const hour = match[4] ? Number(match[4]) : 0;
  const minute = match[5] ? Number(match[5]) : 0;
  const second = match[6] ? Number(match[6]) : 0;
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    throw new NormalizationError("NORMALIZATION_INVALID_DATE", "The CSV contains an invalid date.");
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}
