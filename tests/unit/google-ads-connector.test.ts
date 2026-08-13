import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import {
  GOOGLE_ADS_API_VERSION,
  GOOGLE_ADS_CAPABILITIES,
  GOOGLE_ADS_MAX_RANGE_DAYS,
  GOOGLE_ADS_OAUTH_SCOPE,
  GoogleAdsConnector,
} from "../../lib/connectors/google-ads/client";
import { normalizeGoogleAdsRows } from "../../lib/connectors/google-ads/normalizer";
import { parseGoogleAdsSearchResponse, type GoogleAdsReportRow } from "../../lib/connectors/google-ads/types";
import type { Connection, FetchRequest, ProviderFetchProvenance } from "../../lib/connectors/types";

type RepresentativeFixture = {
  accessibleCustomers: unknown;
  rootCustomer: unknown;
  hierarchyPages: unknown[];
  reportPages: unknown[];
};

type EdgeFixture = {
  directAccessibleCustomers: unknown;
  directCustomer: unknown;
  zeroAndMissing: unknown[];
  timezoneBoundary: unknown;
  oauthError: unknown;
  developerTokenError: unknown;
  quotaError: unknown;
  providerUnavailableError: unknown;
  inaccessibleCustomerError: unknown;
  malformedResponse: unknown;
  repeatedPage: unknown;
};

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

async function fixture<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(new URL(`../../fixtures/connectors/google-ads/${name}`, import.meta.url), "utf8")) as T;
}

function response(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

function connection(overrides: Partial<Connection> = {}): Connection {
  return {
    provider: "google_ads",
    status: "ready",
    externalAccountId: "2222222222",
    externalAccountName: "Synthetic Relay Ads",
    grantedScopes: [GOOGLE_ADS_OAUTH_SCOPE],
    capabilities: [...GOOGLE_ADS_CAPABILITIES],
    credentialReference: "synthetic-request-scoped-credential",
    ...overrides,
  };
}

const request: FetchRequest = {
  provider: "google_ads",
  externalAccountId: "2222222222",
  dateRange: { start: "2026-07-01", end: "2026-07-02" },
  requestedGrain: "daily",
};

const provenance: ProviderFetchProvenance = {
  transport: "api",
  provider: "google_ads",
  externalAccountId: "2222222222",
  fetchRequestId: "google-fetch-1",
  dateRange: request.dateRange,
};

describe("Google Ads account and response validation", () => {
  it("accepts current REST customer, hierarchy, report, and fixed-page response shapes", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    expect(() => parseGoogleAdsSearchResponse(representative.rootCustomer, "customer")).not.toThrow();
    expect(() => parseGoogleAdsSearchResponse(representative.hierarchyPages[0], "customer_client")).not.toThrow();
    expect(() => parseGoogleAdsSearchResponse(representative.reportPages[0], "report")).not.toThrow();
  });

  it("rejects malformed or unbounded provider results", async () => {
    const edge = await fixture<EdgeFixture>("edge-cases.json");
    expect(() => parseGoogleAdsSearchResponse(edge.malformedResponse, "report")).toThrow();
    expect(() => parseGoogleAdsSearchResponse({ results: Array.from({ length: 10_001 }, () => ({})) }, "report")).toThrow();
  });
});

describe("Google Ads client", () => {
  it("discovers serving customers under a directly accessible manager and excludes manager accounts", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const responses = [representative.accessibleCustomers, representative.rootCustomer, ...representative.hierarchyPages];
    let call = 0;
    const fetchImpl = vi.fn<FetchLike>(async () => response(responses[call++]));
    const connector = new GoogleAdsConnector({ accessToken: "synthetic-access", developerToken: "synthetic-developer", fetchImpl, delay: async () => undefined });

    await expect(connector.discoverAccounts(connection())).resolves.toEqual([
      { id: "2222222222", name: "Synthetic Relay Ads", currency: "USD", timezone: "America/New_York", status: "enabled" },
      { id: "4444444444", name: "Synthetic Nested Client", currency: "USD", timezone: "America/Chicago", status: "enabled" },
    ]);
    expect(GOOGLE_ADS_API_VERSION).toBe("v25");
    const listCall = fetchImpl.mock.calls[0]!;
    expect(String(listCall[0])).toBe("https://googleads.googleapis.com/v25/customers:listAccessibleCustomers");
    expect(listCall[1]).toMatchObject({ method: "GET" });
    expect(listCall[1]?.headers).toEqual(expect.objectContaining({ Authorization: "Bearer synthetic-access", "developer-token": "synthetic-developer" }));
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain("refresh_token");
  });

  it("discovers a directly accessible serving customer without inventing manager context", async () => {
    const edge = await fixture<EdgeFixture>("edge-cases.json");
    const responses = [edge.directAccessibleCustomers, edge.directCustomer];
    let call = 0;
    const fetchImpl = vi.fn<FetchLike>(async () => response(responses[call++]));
    const connector = new GoogleAdsConnector({ accessToken: "synthetic-access", developerToken: "synthetic-developer", fetchImpl, delay: async () => undefined });
    await expect(connector.discoverAccounts(connection())).resolves.toEqual([
      { id: "2222222222", name: "Synthetic Direct Ads", currency: "USD", timezone: "America/Los_Angeles", status: "enabled" },
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1]?.[1]?.headers).not.toEqual(expect.objectContaining({ "login-customer-id": expect.anything() }));
  });

  it("fails closed before expanding an excessive number of directly accessible roots", async () => {
    const resourceNames = Array.from({ length: 21 }, (_, index) => `customers/${String(1_000_000_000 + index)}`);
    const fetchImpl = vi.fn<FetchLike>(async () => response({ resourceNames }));
    const connector = new GoogleAdsConnector({ accessToken: "synthetic", developerToken: "synthetic", fetchImpl, delay: async () => undefined });

    await expect(connector.discoverAccounts(connection())).rejects.toMatchObject({ code: "PAGINATION_LIMIT_EXCEEDED" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("fetches the minimal daily ad-group report through the discovered manager context and bounded Search pages", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const responses = [representative.accessibleCustomers, representative.rootCustomer, ...representative.hierarchyPages, ...representative.reportPages];
    let call = 0;
    const fetchImpl = vi.fn<FetchLike>(async () => response(responses[call++]));
    const connector = new GoogleAdsConnector({ accessToken: "synthetic-access", developerToken: "synthetic-developer", fetchImpl, fetchRequestId: () => "google-fetch-1", delay: async () => undefined });
    const result = await connector.fetch(connection(), request);

    expect(result).toMatchObject({ pagesFetched: 2, provenance });
    expect(result.records).toHaveLength(2);
    const firstReport = fetchImpl.mock.calls[3]!;
    expect(String(firstReport[0])).toBe("https://googleads.googleapis.com/v25/customers/2222222222/googleAds:search");
    expect(firstReport[1]?.headers).toEqual(expect.objectContaining({ "login-customer-id": "1111111111" }));
    const firstBody = JSON.parse(String(firstReport[1]?.body)) as { query: string; pageToken?: string; pageSize?: number };
    expect(firstBody.query).toContain("FROM ad_group");
    expect(firstBody.query).toContain("segments.date BETWEEN '2026-07-01' AND '2026-07-02'");
    expect(firstBody.query).toContain("metrics.cost_micros");
    expect(firstBody.query).toContain("metrics.conversions_value");
    expect(firstBody.query).not.toMatch(/metrics\.(ctr|average_cpc|cost_per_conversion|conversions_value_per_cost)/);
    expect(firstBody).not.toHaveProperty("pageSize");
    expect(JSON.parse(String(fetchImpl.mock.calls[4]?.[1]?.body))).toMatchObject({ pageToken: "synthetic-report-page-2" });
  });

  it("requires a ready scoped connection and both request-scoped credentials", async () => {
    expect(() => new GoogleAdsConnector({ accessToken: "", developerToken: "synthetic" })).toThrowError();
    expect(() => new GoogleAdsConnector({ accessToken: "synthetic", developerToken: "" })).toThrowError();
    const connector = new GoogleAdsConnector({ accessToken: "synthetic", developerToken: "synthetic", fetchImpl: async () => response({ resourceNames: [] }), delay: async () => undefined });
    await expect(connector.discoverAccounts(connection({ grantedScopes: [] }))).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(connector.fetch(connection({ status: "expired" }), request)).rejects.toMatchObject({ code: "AUTH_EXPIRED" });
  });

  it("rejects oversized date ranges and an undiscovered customer before reporting", async () => {
    const fetchImpl = vi.fn(async () => response({ resourceNames: [] }));
    const connector = new GoogleAdsConnector({ accessToken: "synthetic", developerToken: "synthetic", fetchImpl, delay: async () => undefined });
    await expect(connector.fetch(connection(), { ...request, dateRange: { start: "2026-01-01", end: "2026-02-01" } })).rejects.toMatchObject({ code: "FETCH_FAILED" });
    expect(GOOGLE_ADS_MAX_RANGE_DAYS).toBe(31);
    expect(fetchImpl).not.toHaveBeenCalled();
    await expect(connector.fetch(connection({ externalAccountId: "9999999999" }), { ...request, externalAccountId: "9999999999" })).rejects.toMatchObject({ code: "ACCOUNT_NOT_FOUND" });
  });

  it("fails closed on a repeated Search page token", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const edge = await fixture<EdgeFixture>("edge-cases.json");
    const responses = [representative.accessibleCustomers, representative.rootCustomer, ...representative.hierarchyPages, edge.repeatedPage, edge.repeatedPage];
    let call = 0;
    const connector = new GoogleAdsConnector({ accessToken: "synthetic", developerToken: "synthetic", fetchImpl: async () => response(responses[call++]), delay: async () => undefined });
    await expect(connector.fetch(connection(), request)).rejects.toMatchObject({ code: "PAGINATION_LIMIT_EXCEEDED", retryable: false });
  });

  it.each([
    [401, "oauthError", "AUTH_EXPIRED", false],
    [403, "developerTokenError", "PERMISSION_DENIED", false],
    [403, "inaccessibleCustomerError", "ACCOUNT_NOT_FOUND", false],
    [429, "quotaError", "RATE_LIMITED", true],
    [503, "providerUnavailableError", "PROVIDER_UNAVAILABLE", true],
  ] as const)("maps Google failure %i/%s to safe %s", async (status, key, code, retryable) => {
    const edge = await fixture<EdgeFixture>("edge-cases.json");
    const connector = new GoogleAdsConnector({ accessToken: "synthetic", developerToken: "synthetic", fetchImpl: async () => response(edge[key], status, status === 429 ? { "retry-after": "2" } : undefined), delay: async () => undefined });
    const error = await connector.discoverAccounts(connection()).catch((cause: unknown) => cause);
    expect(error).toMatchObject({ code, retryable });
    expect(JSON.stringify(error)).not.toMatch(/Synthetic .* rejected|synthetic-error-request|synthetic-quota-request/i);
  });

  it("retries quota exhaustion with bounded injected delay and never sleeps", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const edge = await fixture<EdgeFixture>("edge-cases.json");
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(edge.quotaError, 429, { "retry-after": "2" })).mockResolvedValueOnce(response(representative.accessibleCustomers)).mockResolvedValueOnce(response(representative.rootCustomer)).mockResolvedValueOnce(response(representative.hierarchyPages[0]));
    const delay = vi.fn(async () => undefined);
    const connector = new GoogleAdsConnector({ accessToken: "synthetic", developerToken: "synthetic", fetchImpl, delay });
    await expect(connector.discoverAccounts(connection())).resolves.toHaveLength(2);
    expect(delay).toHaveBeenCalledWith(2_000);
  });
});

describe("Google Ads normalization", () => {
  const account = { id: "2222222222", name: "Synthetic Relay Ads", currency: "USD", timezone: "America/New_York", status: "enabled" };

  it("converts micros without floating point and preserves Google attribution as advertising revenue", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const rows = representative.reportPages.flatMap((page) => parseGoogleAdsSearchResponse(page, "report").results) as GoogleAdsReportRow[];
    const observations = normalizeGoogleAdsRows({ records: rows, externalAccount: account, provenance });
    expect(observations[0]).toMatchObject({
      domain: "advertising", source: "google_ads", sourceAccountId: "2222222222", sourceAccountName: "Synthetic Relay Ads",
      date: "2026-07-01", sourceTimezone: null, campaignId: "5000000001", campaignName: "Brand search",
      groupId: "6000000001", groupName: "Brand terms", adId: null, adName: null, currencyCode: "USD",
      spend: "89.3", impressions: "7000", clicks: "412", conversions: "23", attributedRevenue: "690",
      provenance: { ...provenance, providerRecordLocator: "2026-07-01:5000000001:6000000001" },
    });
    expect(observations[0]).not.toHaveProperty("grossRevenue");
  });

  it("preserves explicit zero separately from unavailable metrics", async () => {
    const edge = await fixture<EdgeFixture>("edge-cases.json");
    const rows = edge.zeroAndMissing.flatMap((row) => parseGoogleAdsSearchResponse({ results: [row] }, "report").results) as GoogleAdsReportRow[];
    const observations = normalizeGoogleAdsRows({ records: rows, externalAccount: account, provenance });
    expect(observations[0]).toMatchObject({ spend: "0", impressions: "0", clicks: "0", conversions: "0", attributedRevenue: "0" });
    expect(observations[1]).toMatchObject({ spend: null, impressions: "1", clicks: null, conversions: null, attributedRevenue: null });
  });

  it("preserves the customer-timezone calendar date and rejects identity, currency, and range mismatches", async () => {
    const edge = await fixture<EdgeFixture>("edge-cases.json");
    const row = parseGoogleAdsSearchResponse({ results: [edge.timezoneBoundary] }, "report").results[0] as GoogleAdsReportRow;
    expect(normalizeGoogleAdsRows({ records: [row], externalAccount: account, provenance })[0]?.date).toBe("2026-07-01");
    expect(() => normalizeGoogleAdsRows({ records: [{ ...row, customer: { ...row.customer, id: "9999999999" } }], externalAccount: account, provenance })).toThrow();
    expect(() => normalizeGoogleAdsRows({ records: [{ ...row, customer: { ...row.customer, currencyCode: "EUR" } }], externalAccount: account, provenance })).toThrow();
    expect(() => normalizeGoogleAdsRows({ records: [{ ...row, segments: { date: "2026-07-03" } }], externalAccount: account, provenance })).toThrow();
  });
});
