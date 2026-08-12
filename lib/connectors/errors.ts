import type { Provider } from "./types";

export const CONNECTOR_ERROR_CODES = [
  "AUTH_REQUIRED",
  "AUTH_EXPIRED",
  "PERMISSION_DENIED",
  "ACCOUNT_NOT_FOUND",
  "ACCOUNT_SELECTION_REQUIRED",
  "PROVIDER_UNAVAILABLE",
  "RATE_LIMITED",
  "FETCH_FAILED",
  "INVALID_PROVIDER_RESPONSE",
  "PAGINATION_LIMIT_EXCEEDED",
] as const;

export type ConnectorErrorCode = (typeof CONNECTOR_ERROR_CODES)[number];

export type ConnectorCauseCategory =
  | "authorization"
  | "permission"
  | "account"
  | "network"
  | "provider_outage"
  | "rate_limit"
  | "provider_response"
  | "pagination"
  | "provider_error"
  | "unknown";

export type ConnectorError = {
  code: ConnectorErrorCode;
  provider: Provider;
  retryable: boolean;
  safeUserMessage: string;
  internalCauseCategory?: ConnectorCauseCategory;
  retryAfterMs?: number;
};

const ERROR_DEFINITIONS: Record<ConnectorErrorCode, { retryable: boolean; safeUserMessage: string }> = {
  AUTH_REQUIRED: { retryable: false, safeUserMessage: "Provider authorization is required." },
  AUTH_EXPIRED: { retryable: false, safeUserMessage: "Provider authorization has expired. Reconnect the source." },
  PERMISSION_DENIED: { retryable: false, safeUserMessage: "The connection lacks required reporting permission." },
  ACCOUNT_NOT_FOUND: { retryable: false, safeUserMessage: "The selected provider account is unavailable." },
  ACCOUNT_SELECTION_REQUIRED: { retryable: false, safeUserMessage: "Select an available provider account." },
  PROVIDER_UNAVAILABLE: { retryable: true, safeUserMessage: "The provider is temporarily unavailable. Try again later." },
  RATE_LIMITED: { retryable: true, safeUserMessage: "The provider rate limit was reached. Try again later." },
  FETCH_FAILED: { retryable: false, safeUserMessage: "The provider report could not be fetched." },
  INVALID_PROVIDER_RESPONSE: { retryable: false, safeUserMessage: "The provider returned an invalid reporting response." },
  PAGINATION_LIMIT_EXCEEDED: { retryable: false, safeUserMessage: "The provider report exceeded safe pagination limits." },
};

export function toConnectorError(input: {
  provider: Provider;
  code: ConnectorErrorCode;
  retryable?: boolean;
  causeCategory?: ConnectorCauseCategory;
  retryAfterMs?: number;
  cause?: unknown;
}): ConnectorError {
  const definition = ERROR_DEFINITIONS[input.code];
  return {
    code: input.code,
    provider: input.provider,
    retryable: input.retryable ?? definition.retryable,
    safeUserMessage: definition.safeUserMessage,
    ...(input.causeCategory ? { internalCauseCategory: input.causeCategory } : {}),
    ...(input.retryAfterMs !== undefined ? { retryAfterMs: Math.max(0, Math.min(input.retryAfterMs, 300_000)) } : {}),
  };
}

export class ConnectorFailure extends Error implements ConnectorError {
  readonly code: ConnectorErrorCode;
  readonly provider: Provider;
  readonly retryable: boolean;
  readonly safeUserMessage: string;
  readonly internalCauseCategory?: ConnectorCauseCategory;
  readonly retryAfterMs?: number;

  constructor(error: ConnectorError) {
    super(error.safeUserMessage);
    this.name = "ConnectorFailure";
    this.code = error.code;
    this.provider = error.provider;
    this.retryable = error.retryable;
    this.safeUserMessage = error.safeUserMessage;
    this.internalCauseCategory = error.internalCauseCategory;
    this.retryAfterMs = error.retryAfterMs;
  }
}

export type RedactedProviderError = {
  causeCategory: ConnectorCauseCategory;
  safeDetail: string;
};

function redactMessage(message: string): string {
  return message
    .replace(/https?:\/\/\S+/gi, "[REDACTED]")
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(/\b(?:access_token|refresh_token|client_secret|authorization|account_id)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 240);
}

export function redactProviderError(cause: unknown): RedactedProviderError {
  if (cause instanceof Error) {
    return {
      causeCategory: "provider_error",
      safeDetail: redactMessage(cause.message || "The provider returned an error."),
    };
  }
  if (typeof cause === "object" && cause !== null) {
    return {
      causeCategory: "provider_response",
      safeDetail: "The provider returned a structured error.",
    };
  }
  return {
    causeCategory: "unknown",
    safeDetail: "The provider returned an unclassified error.",
  };
}
