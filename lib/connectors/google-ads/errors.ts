import { ConnectorFailure, toConnectorError, type ConnectorCauseCategory, type ConnectorErrorCode } from "../errors";
import { parseGoogleAdsFailure } from "./types";

export function googleAdsFailure(
  code: ConnectorErrorCode,
  options: { retryable?: boolean; retryAfterMs?: number; category?: ConnectorCauseCategory } = {},
): ConnectorFailure {
  return new ConnectorFailure(toConnectorError({
    provider: "google_ads",
    code,
    ...(options.retryable !== undefined ? { retryable: options.retryable } : {}),
    ...(options.retryAfterMs !== undefined ? { retryAfterMs: options.retryAfterMs } : {}),
    ...(options.category ? { causeCategory: options.category } : {}),
  }));
}

function retryAfterMilliseconds(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  return Math.min(Number(value) * 1_000, 300_000);
}

function providerCodes(body: unknown): Set<string> {
  const failure = parseGoogleAdsFailure(body);
  return new Set(
    failure?.details?.flatMap((detail) => detail.errors?.flatMap((error) => Object.values(error.errorCode ?? {})) ?? []) ?? [],
  );
}

export function mapGoogleAdsResponseError(status: number, body: unknown, retryAfter: string | null): ConnectorFailure {
  const failure = parseGoogleAdsFailure(body);
  const codes = providerCodes(body);
  const canonicalStatus = failure?.status;
  const retryAfterMs = retryAfterMilliseconds(retryAfter);

  if (status === 401 || canonicalStatus === "UNAUTHENTICATED" || [...codes].some((code) => code.includes("OAUTH") || code.includes("AUTHENTICATION"))) {
    return googleAdsFailure("AUTH_EXPIRED", { category: "authorization" });
  }
  if ([...codes].some((code) => code === "CUSTOMER_NOT_FOUND" || code === "CUSTOMER_NOT_ENABLED" || code === "INVALID_LOGIN_CUSTOMER_ID") || status === 404) {
    return googleAdsFailure("ACCOUNT_NOT_FOUND", { category: "account" });
  }
  if (status === 403 || canonicalStatus === "PERMISSION_DENIED" || [...codes].some((code) => code.includes("DEVELOPER_TOKEN") || code.includes("PERMISSION_DENIED"))) {
    return googleAdsFailure("PERMISSION_DENIED", { category: "permission" });
  }
  if (status === 429 || canonicalStatus === "RESOURCE_EXHAUSTED" || [...codes].some((code) => code.includes("RESOURCE_EXHAUSTED") || code.includes("RATE_EXCEEDED"))) {
    return googleAdsFailure("RATE_LIMITED", { retryable: true, retryAfterMs, category: "rate_limit" });
  }
  if (status >= 500 || ["UNAVAILABLE", "INTERNAL", "DEADLINE_EXCEEDED", "UNKNOWN", "ABORTED"].includes(canonicalStatus ?? "")) {
    return googleAdsFailure("PROVIDER_UNAVAILABLE", { retryable: true, category: "provider_outage" });
  }
  return googleAdsFailure("FETCH_FAILED", { category: "provider_error" });
}
