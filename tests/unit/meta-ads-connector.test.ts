import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import { META_ADS_API_VERSION, META_ADS_CAPABILITIES, MetaAdsConnector } from "../../lib/connectors/meta-ads/client";
import { MetaAdsNormalizationError, normalizeMetaAdsInsights } from "../../lib/connectors/meta-ads/normalizer";
import { parseMetaAccountsResponse, parseMetaInsightsResponse, type MetaInsightRecord } from "../../lib/connectors/meta-ads/types";
import type { Connection, FetchRequest, ProviderFetchProvenance } from "../../lib/connectors/types";

type RepresentativeFixture = { synthetic: true; accounts: unknown; pages: unknown[] };
type EdgeFixture = { synthetic: true; zeroAndMissing: unknown[]; timezoneBoundary: unknown; malformed: unknown; authError: unknown; rateLimitError: unknown; inaccessibleAccount: unknown; paginationFailure: unknown };

async function fixture<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(new URL(`../../fixtures/connectors/meta-ads/${name}`, import.meta.url), "utf8")) as T;
}

function response(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

function connection(overrides: Partial<Connection> = {}): Connection {
  return {
    provider: "meta_ads",
    status: "ready",
    externalAccountId: "act_100000001",
    externalAccountName: "Synthetic Relay Ad Account",
    grantedScopes: ["ads_read"],
    capabilities: [...META_ADS_CAPABILITIES],
    credentialReference: "synthetic-request-scoped-credential",
    ...overrides,
  };
}

const request: FetchRequest = {
  provider: "meta_ads",
  externalAccountId: "act_100000001",
  dateRange: { start: "2026-07-01", end: "2026-07-02" },
  requestedGrain: "daily",
};

const provenance: ProviderFetchProvenance = {
  transport: "api",
  provider: "meta_ads",
  externalAccountId: "act_100000001",
  fetchRequestId: "meta-fetch-1",
  dateRange: request.dateRange,
};

describe("Meta Ads provider validation", () => {
  it("validates the authoritative act_ account identity and safe metadata", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    expect(parseMetaAccountsResponse(representative.accounts).data[0]).toEqual({
      id: "act_100000001",
      account_id: "100000001",
      name: "Synthetic Relay Ad Account",
      currency: "USD",
      timezone_name: "America/New_York",
      account_status: 1,
    });
    expect(() => parseMetaAccountsResponse({ data: [{ id: "100000001", account_id: "100000001", name: "Bad", currency: "USD", timezone_name: "UTC", account_status: 1 }] })).toThrow();
  });

  it("validates daily ad-grain Insights rows and Graph cursors", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const page = parseMetaInsightsResponse(representative.pages[0]);
    expect(page.data[0]).toMatchObject({ date_start: "2026-07-01", date_stop: "2026-07-01", ad_id: "400000001" });
    expect(page.paging?.cursors?.after).toBe("after-1");
  });

  it("rejects a Graph continuation without a usable after cursor", () => {
    const malformedPaging = { paging: { next: "https://graph.facebook.com/v26.0/redacted" } };
    expect(() => parseMetaAccountsResponse({ data: [], ...malformedPaging })).toThrow();
    expect(() => parseMetaInsightsResponse({ data: [], ...malformedPaging })).toThrow();
  });

  it("rejects unbounded provider text and action collections", () => {
    const oversizedName = "x".repeat(501);
    expect(() => parseMetaAccountsResponse({
      data: [{ id: "act_100000001", account_id: "100000001", name: oversizedName, currency: "USD", timezone_name: "UTC", account_status: 1 }],
    })).toThrow();
    expect(() => parseMetaInsightsResponse({
      data: [{
        date_start: "2026-07-01", date_stop: "2026-07-01", account_id: "100000001", account_name: "Synthetic",
        account_currency: "USD", campaign_id: "1", campaign_name: "Campaign", adset_id: "2", adset_name: "Set",
        ad_id: "3", ad_name: "Ad", spend: "1", impressions: "1", inline_link_clicks: "1",
        actions: Array.from({ length: 101 }, () => ({ action_type: "lead", value: "1" })),
      }],
    })).toThrow();
  });
});

describe("Meta Ads client", () => {
  it("uses current v26.0 bearer-authenticated read-only account discovery", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const fetchImpl = vi.fn().mockResolvedValue(response(representative.accounts));
    const connector = new MetaAdsConnector({ accessToken: "synthetic-secret", fetchImpl, delay: async () => undefined });

    await expect(connector.discoverAccounts(connection())).resolves.toEqual([{
      id: "act_100000001",
      name: "Synthetic Relay Ad Account",
      currency: "USD",
      timezone: "America/New_York",
      status: "active",
    }]);
    expect(META_ADS_API_VERSION).toBe("v26.0");
    const url = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(`${url.origin}${url.pathname}`).toBe("https://graph.facebook.com/v26.0/me/adaccounts");
    expect(url.searchParams.get("fields")).toBe("id,account_id,name,currency,timezone_name,account_status");
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toEqual(expect.objectContaining({ Authorization: "Bearer synthetic-secret" }));
    expect(String(fetchImpl.mock.calls[0]?.[0])).not.toContain("synthetic-secret");
  });

  it("fetches minimal daily ad-level Insights through bounded cursor pagination", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const providerResponses = [representative.accounts, ...representative.pages];
    let call = 0;
    const fetchImpl = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>(async () => response(providerResponses[call++]));
    const connector = new MetaAdsConnector({ accessToken: "synthetic-secret", fetchImpl, fetchRequestId: () => "meta-fetch-1", delay: async () => undefined });
    const result = await connector.fetch(connection(), request);

    expect(result.pagesFetched).toBe(2);
    expect(result.records).toHaveLength(2);
    expect(result.provenance).toEqual(provenance);
    const firstInsightsUrl = new URL(String(fetchImpl.mock.calls[1]?.[0]));
    expect(`${firstInsightsUrl.origin}${firstInsightsUrl.pathname}`).toBe("https://graph.facebook.com/v26.0/act_100000001/insights");
    expect(firstInsightsUrl.searchParams.get("level")).toBe("ad");
    expect(firstInsightsUrl.searchParams.get("time_increment")).toBe("1");
    expect(firstInsightsUrl.searchParams.get("time_range")).toBe(JSON.stringify({ since: "2026-07-01", until: "2026-07-02" }));
    expect(firstInsightsUrl.searchParams.get("use_unified_attribution_setting")).toBe("true");
    expect(firstInsightsUrl.searchParams.has("breakdowns")).toBe(false);
    expect(firstInsightsUrl.searchParams.get("fields")?.split(",")).toContain("inline_link_clicks");
    expect(firstInsightsUrl.searchParams.get("fields")?.split(",")).not.toContain("clicks");
    expect(firstInsightsUrl.searchParams.get("fields")).not.toMatch(/ctr|cpc|cpa|roas/i);
    expect(new URL(String(fetchImpl.mock.calls[2]?.[0])).searchParams.get("after")).toBe("after-1");
    expect(JSON.stringify(result)).not.toContain("paging");
  });

  it("requires a ready ads_read connection with all reporting capabilities", async () => {
    const connector = new MetaAdsConnector({ accessToken: "synthetic-secret", fetchImpl: async () => response({ data: [] }), delay: async () => undefined });
    await expect(connector.discoverAccounts(connection({ grantedScopes: [] }))).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(connector.fetch(connection({ capabilities: ["account_discovery"] }), request)).rejects.toMatchObject({ code: "FETCH_FAILED" });
    await expect(connector.fetch(connection({ status: "expired" }), request)).rejects.toMatchObject({ code: "AUTH_EXPIRED" });
  });

  it("rejects a synchronous date range longer than 31 inclusive days before network access", async () => {
    const fetchImpl = vi.fn(async () => response({ data: [] }));
    const connector = new MetaAdsConnector({ accessToken: "synthetic-secret", fetchImpl, delay: async () => undefined });
    await expect(connector.fetch(connection(), {
      ...request,
      dateRange: { start: "2026-07-01", end: "2026-08-01" },
    })).rejects.toMatchObject({ code: "FETCH_FAILED", retryable: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects an account not discovered for the current credential", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const connector = new MetaAdsConnector({ accessToken: "synthetic-secret", fetchImpl: async () => response(representative.accounts), delay: async () => undefined });
    await expect(connector.fetch(connection({ externalAccountId: "act_999999999" }), { ...request, externalAccountId: "act_999999999" })).rejects.toMatchObject({ code: "ACCOUNT_NOT_FOUND" });
  });

  it("fails closed on a repeated Meta cursor without following paging.next", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const edge = await fixture<EdgeFixture>("edge-cases.json");
    const responses = [representative.accounts, edge.paginationFailure, edge.paginationFailure];
    let call = 0;
    const connector = new MetaAdsConnector({ accessToken: "synthetic-secret", fetchImpl: async () => response(responses[call++]), delay: async () => undefined });
    await expect(connector.fetch(connection(), request)).rejects.toMatchObject({ code: "PAGINATION_LIMIT_EXCEEDED", retryable: false });
    expect(call).toBe(3);
  });

  it("fails closed at the Meta Insights maximum page guard", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const firstPage = parseMetaInsightsResponse(representative.pages[0]);
    const pages = Array.from({ length: 100 }, (_, index) => ({
      data: [{ ...firstPage.data[0], ad_id: `${500000000 + index}` }],
      paging: {
        cursors: { after: `page-${index + 1}` },
        next: "https://graph.facebook.com/v26.0/redacted",
      },
    }));
    const providerResponses = [representative.accounts, ...pages];
    let providerCall = 0;
    const connector = new MetaAdsConnector({
      accessToken: "synthetic-secret",
      fetchImpl: async () => response(providerResponses[providerCall++]),
      delay: async () => undefined,
    });

    await expect(connector.fetch(connection(), request)).rejects.toMatchObject({
      code: "PAGINATION_LIMIT_EXCEEDED",
      retryable: false,
    });
    expect(providerCall).toBe(101);
  });

  it.each([
    [401, { error: { code: 190, error_subcode: 463, message: "secret expired detail" } }, "AUTH_EXPIRED", false],
    [403, { error: { code: 200, message: "secret permission detail" } }, "PERMISSION_DENIED", false],
    [400, { error: { code: 100, error_subcode: 33, message: "secret account detail" } }, "ACCOUNT_NOT_FOUND", false],
    [429, { error: { code: 4, error_subcode: 1504022, message: "secret throttle detail" } }, "RATE_LIMITED", true],
    [500, { error: { code: 2, is_transient: true, message: "secret outage detail" } }, "PROVIDER_UNAVAILABLE", true],
  ])("maps HTTP/provider failure %i to %s without exposing provider details", async (status, body, code, retryable) => {
    const connector = new MetaAdsConnector({ accessToken: "synthetic-secret", fetchImpl: async () => response(body, status, status === 429 ? { "retry-after": "1" } : undefined), delay: async () => undefined });
    const error = await connector.discoverAccounts(connection()).catch((cause: unknown) => cause);
    expect(error).toMatchObject({ code, retryable });
    expect(JSON.stringify(error)).not.toMatch(/secret|trace/i);
  });

  it("retries a documented Meta rate error with injected delay", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const edge = await fixture<EdgeFixture>("edge-cases.json");
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(edge.rateLimitError, 400, { "retry-after": "2", "x-fb-ads-insights-throttle": "{\"app_id_util_pct\":100}" })).mockResolvedValueOnce(response(representative.accounts));
    const delay = vi.fn(async () => undefined);
    const connector = new MetaAdsConnector({ accessToken: "synthetic-secret", fetchImpl, delay });
    await expect(connector.discoverAccounts(connection())).resolves.toHaveLength(1);
    expect(delay).toHaveBeenCalledWith(2_000);
  });

  it("maps malformed JSON and malformed provider schemas to terminal invalid response", async () => {
    const malformedJson = new MetaAdsConnector({ accessToken: "synthetic-secret", fetchImpl: async () => new Response("not-json"), delay: async () => undefined });
    await expect(malformedJson.discoverAccounts(connection())).rejects.toMatchObject({ code: "INVALID_PROVIDER_RESPONSE", retryable: false });
    const malformedSchema = new MetaAdsConnector({ accessToken: "synthetic-secret", fetchImpl: async () => response({ data: [{ id: "act_secret" }] }), delay: async () => undefined });
    await expect(malformedSchema.discoverAccounts(connection())).rejects.toMatchObject({ code: "INVALID_PROVIDER_RESPONSE", retryable: false });
  });
});

describe("Meta Ads normalization", () => {
  const account = { id: "act_100000001", name: "Synthetic Relay Ad Account", currency: "USD", timezone: "America/New_York", status: "active" };

  it("maps only exact purchase action/count values and emits safe API provenance", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const records = representative.pages.flatMap((page) => parseMetaInsightsResponse(page).data);
    const observations = normalizeMetaAdsInsights({ records, externalAccount: account, provenance });
    expect(observations[0]).toMatchObject({
      domain: "advertising", source: "meta_ads", sourceAccountId: "act_100000001", sourceTimezone: null,
      campaignId: "200000001", campaignName: "Summer launch", groupId: "300000001", groupName: "Prospecting",
      adId: "400000001", adName: "Prospecting creative", spend: "123.45", impressions: "10000", clicks: "321",
      conversions: "14", attributedRevenue: "567.89", currencyCode: "USD",
      provenance: { ...provenance, providerRecordLocator: "2026-07-01:400000001" },
    });
    expect(observations[0]).not.toHaveProperty("grossRevenue");
  });

  it("preserves explicit zero and missing purchase entries as different meanings", async () => {
    const edge = await fixture<EdgeFixture>("edge-cases.json");
    const records = edge.zeroAndMissing.map((record) => parseMetaInsightsResponse({ data: [record] }).data[0]!);
    const observations = normalizeMetaAdsInsights({ records, externalAccount: account, provenance });
    expect(observations[0]).toMatchObject({ spend: "0", impressions: "0", clicks: "0", conversions: "0", attributedRevenue: "0" });
    expect(observations[1]).toMatchObject({ conversions: null, attributedRevenue: null });
  });

  it("preserves the provider's account-timezone calendar date at a boundary", async () => {
    const edge = await fixture<EdgeFixture>("edge-cases.json");
    const record = parseMetaInsightsResponse({ data: [edge.timezoneBoundary] }).data[0]!;
    const observations = normalizeMetaAdsInsights({ records: [record], externalAccount: account, provenance });
    expect(observations[0]?.date).toBe("2026-07-01");
  });

  it("preserves negative attributed purchase value while keeping conversion count non-negative", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const source = representative.pages[0] as { data: Array<Record<string, unknown>> };
    const reversed = parseMetaInsightsResponse({
      ...source,
      data: [{ ...source.data[0], action_values: [{ action_type: "purchase", value: "-12.50" }] }],
    }).data[0]!;
    const observations = normalizeMetaAdsInsights({ records: [reversed], externalAccount: account, provenance });
    expect(observations[0]?.attributedRevenue).toBe("-12.5");
  });

  it("treats the discovered account name as metadata rather than authority", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const record = parseMetaInsightsResponse(representative.pages[0]).data[0]!;
    const renamed = { ...record, account_name: "Recently renamed provider display" };
    const observations = normalizeMetaAdsInsights({ records: [renamed], externalAccount: account, provenance });
    expect(observations[0]?.sourceAccountId).toBe("act_100000001");
    expect(observations[0]?.sourceAccountName).toBe("Synthetic Relay Ad Account");
  });

  it("rejects duplicate exact purchase entries instead of summing them", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const record = parseMetaInsightsResponse(representative.pages[0]).data[0]!;
    const duplicate: MetaInsightRecord = { ...record, actions: [...(record.actions ?? []), { action_type: "purchase", value: "1" }] };
    expect(() => normalizeMetaAdsInsights({ records: [duplicate], externalAccount: account, provenance })).toThrowError(MetaAdsNormalizationError);
  });

  it.each([
    ["mismatched account", (record: MetaInsightRecord) => ({ ...record, account_id: "999999999" })],
    ["mismatched currency", (record: MetaInsightRecord) => ({ ...record, account_currency: "EUR" })],
    ["non-daily range", (record: MetaInsightRecord) => ({ ...record, date_stop: "2026-07-02" })],
    ["outside date range", (record: MetaInsightRecord) => ({ ...record, date_start: "2026-07-03", date_stop: "2026-07-03" })],
    ["impossible calendar date", (record: MetaInsightRecord) => ({ ...record, date_start: "2026-02-31", date_stop: "2026-02-31" })],
  ])("rejects %s provider semantics", async (_label, mutate) => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const record = parseMetaInsightsResponse(representative.pages[0]).data[0]!;
    expect(() => normalizeMetaAdsInsights({ records: [mutate(record)], externalAccount: account, provenance })).toThrowError(MetaAdsNormalizationError);
  });
});
