import { describe, expect, it, vi } from "vitest";

import {
  ConnectorFailure,
  redactProviderError,
  toConnectorError,
} from "../../lib/connectors/errors";
import { paginate } from "../../lib/connectors/pagination";
import { withRetry } from "../../lib/connectors/retry";

describe("connector errors and redaction", () => {
  it("classifies only explicitly transient connector failures as retryable", () => {
    expect(toConnectorError({ provider: "meta_ads", code: "RATE_LIMITED" })).toMatchObject({
      code: "RATE_LIMITED",
      provider: "meta_ads",
      retryable: true,
      safeUserMessage: "The provider rate limit was reached. Try again later.",
    });
    expect(toConnectorError({ provider: "meta_ads", code: "PERMISSION_DENIED" })).toMatchObject({
      code: "PERMISSION_DENIED",
      retryable: false,
    });
    expect(toConnectorError({ provider: "meta_ads", code: "INVALID_PROVIDER_RESPONSE" })).not.toHaveProperty(
      "cause",
    );
  });

  it("redacts dangerous provider error strings without serializing structured payloads", () => {
    const secret = "very-secret-token";
    const detail = redactProviderError(
      new Error(
        `GET https://api.example.test/report?access_token=${secret}&account_id=act_private Authorization: Bearer ${secret} client_secret=${secret}`,
      ),
    );

    expect(detail.safeDetail).not.toContain(secret);
    expect(detail.safeDetail).not.toContain("act_private");
    expect(detail.safeDetail).not.toContain("https://");
    expect(detail.safeDetail).toContain("[REDACTED]");
    expect(redactProviderError({ headers: { authorization: `Bearer ${secret}` }, payload: { customer: "Private" } })).toEqual({
      causeCategory: "provider_response",
      safeDetail: "The provider returned a structured error.",
    });
  });

  it("keeps retry-after as bounded metadata without exposing a raw cause", () => {
    expect(
      toConnectorError({
        provider: "google_ads",
        code: "RATE_LIMITED",
        causeCategory: "rate_limit",
        retryAfterMs: 30_000,
        cause: new Error("Bearer secret"),
      }),
    ).toEqual({
      code: "RATE_LIMITED",
      provider: "google_ads",
      retryable: true,
      safeUserMessage: "The provider rate limit was reached. Try again later.",
      internalCauseCategory: "rate_limit",
      retryAfterMs: 30_000,
    });
  });
});

describe("connector pagination", () => {
  it("accumulates provider pages without returning pagination tokens", async () => {
    const result = await paginate(
      async (token?: string) =>
        token === undefined
          ? { records: [1, 2], nextToken: "page-2" }
          : { records: [3], nextToken: undefined },
      { provider: "meta_ads", maxPages: 3, maxRecords: 10 },
    );

    expect(result).toEqual({ records: [1, 2, 3], pagesFetched: 2 });
    expect(result).not.toHaveProperty("nextToken");
  });

  it("blocks repeated tokens, no-progress pages, maximum pages, and maximum records", async () => {
    await expect(
      paginate(async () => ({ records: [1], nextToken: "same" }), {
        provider: "meta_ads",
        maxPages: 5,
        maxRecords: 10,
      }),
    ).rejects.toMatchObject({ code: "PAGINATION_LIMIT_EXCEEDED" });

    await expect(
      paginate(async () => ({ records: [], nextToken: "next" }), {
        provider: "meta_ads",
        maxPages: 5,
        maxRecords: 10,
      }),
    ).rejects.toMatchObject({ code: "PAGINATION_LIMIT_EXCEEDED" });

    await expect(
      paginate(
        async (token?: number) => ({ records: [token ?? 0], nextToken: (token ?? 0) + 1 }),
        { provider: "meta_ads", maxPages: 2, maxRecords: 10 },
      ),
    ).rejects.toMatchObject({ code: "PAGINATION_LIMIT_EXCEEDED" });

    await expect(
      paginate(async () => ({ records: [1, 2, 3] }), {
        provider: "meta_ads",
        maxPages: 2,
        maxRecords: 2,
      }),
    ).rejects.toMatchObject({ code: "PAGINATION_LIMIT_EXCEEDED" });
  });
});

describe("connector retry", () => {
  it("retries explicit retryable failures with injected deterministic delay", async () => {
    const delay = vi.fn(async () => undefined);
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new ConnectorFailure(
            toConnectorError({ provider: "shopify", code: "PROVIDER_UNAVAILABLE", retryAfterMs: 25 }),
          );
        }
        return "ok";
      },
      { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100, delay },
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
    expect(delay).toHaveBeenNthCalledWith(1, 25);
    expect(delay).toHaveBeenNthCalledWith(2, 25);
  });

  it("does not retry terminal failures and never exceeds maximum attempts", async () => {
    const delay = vi.fn(async () => undefined);
    let terminalAttempts = 0;
    await expect(
      withRetry(
        async () => {
          terminalAttempts += 1;
          throw new ConnectorFailure(toConnectorError({ provider: "meta_ads", code: "PERMISSION_DENIED" }));
        },
        { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100, delay },
      ),
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    expect(terminalAttempts).toBe(1);
    expect(delay).not.toHaveBeenCalled();

    let retryableAttempts = 0;
    await expect(
      withRetry(
        async () => {
          retryableAttempts += 1;
          throw new ConnectorFailure(toConnectorError({ provider: "meta_ads", code: "FETCH_FAILED", retryable: true }));
        },
        { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 100, delay },
      ),
    ).rejects.toMatchObject({ code: "FETCH_FAILED" });
    expect(retryableAttempts).toBe(2);
  });
});
