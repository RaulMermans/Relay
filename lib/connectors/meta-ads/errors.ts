import { ConnectorFailure, toConnectorError, type ConnectorCauseCategory, type ConnectorErrorCode } from "../errors";
import { parseMetaGraphError } from "./types";

const RATE_LIMIT_CODES = new Set([4, 17, 613, 80000, 80003, 80004, 80014]);

export function metaFailure(
  code: ConnectorErrorCode,
  options: { retryable?: boolean; retryAfterMs?: number; category?: ConnectorCauseCategory } = {},
): ConnectorFailure {
  return new ConnectorFailure(toConnectorError({
    provider: "meta_ads",
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

export function mapMetaResponseError(status: number, body: unknown, retryAfter: string | null): ConnectorFailure {
  const providerError = parseMetaGraphError(body);
  const code = providerError?.code;
  const retryAfterMs = retryAfterMilliseconds(retryAfter);

  if (code === 190 || status === 401) return metaFailure("AUTH_EXPIRED", { category: "authorization" });
  if (code === 10 || code === 200 || code === 294 || status === 403) {
    return metaFailure("PERMISSION_DENIED", { category: "permission" });
  }
  if ((code === 100 && providerError?.error_subcode === 33) || status === 404) {
    return metaFailure("ACCOUNT_NOT_FOUND", { category: "account" });
  }
  if ((code !== undefined && RATE_LIMIT_CODES.has(code)) || status === 429) {
    return metaFailure("RATE_LIMITED", { retryable: true, retryAfterMs, category: "rate_limit" });
  }
  if (providerError?.is_transient || code === 1 || code === 2 || status >= 500) {
    return metaFailure("PROVIDER_UNAVAILABLE", { retryable: true, category: "provider_outage" });
  }
  return metaFailure("FETCH_FAILED", { category: "provider_error" });
}
