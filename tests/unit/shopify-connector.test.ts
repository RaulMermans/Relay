import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import { ConnectorFailure } from "../../lib/connectors/errors";
import { ShopifyConnector, SHOPIFY_API_VERSION, SHOPIFY_CAPABILITIES, storeDateRangeToUtc } from "../../lib/connectors/shopify/client";
import { normalizeShopifyOrders } from "../../lib/connectors/shopify/normalizer";
import {
  parseShopifyOrdersResponse,
  parseShopifyShopResponse,
} from "../../lib/connectors/shopify/types";
import type { Connection, FetchRequest } from "../../lib/connectors/types";

type RepresentativeFixture = {
  synthetic: true;
  shop: unknown;
  pages: unknown[];
};

type EdgeFixture = {
  synthetic: true;
  boundaryPage: unknown;
  duplicatePage: unknown;
  malformed: unknown;
  providerError: unknown;
};

async function fixture<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(new URL(`../../fixtures/connectors/shopify/${name}`, import.meta.url), "utf8")) as T;
}

function connection(overrides: Partial<Connection> = {}): Connection {
  return {
    provider: "shopify",
    status: "ready",
    externalAccountId: "gid://shopify/Shop/100000001",
    externalAccountName: "Synthetic Relay Store",
    grantedScopes: ["read_orders"],
    capabilities: [...SHOPIFY_CAPABILITIES],
    credentialReference: "request-scoped-shopify-credential",
    ...overrides,
  };
}

const request: FetchRequest = {
  provider: "shopify",
  externalAccountId: "gid://shopify/Shop/100000001",
  dateRange: { start: "2026-07-01", end: "2026-07-02" },
  requestedGrain: "daily",
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("Shopify GraphQL contracts", () => {
  it("translates inclusive store dates into DST-aware UTC query boundaries", () => {
    expect(storeDateRangeToUtc(
      { start: "2026-07-01", end: "2026-07-02" },
      "America/New_York",
    )).toEqual({
      startInclusive: "2026-07-01T04:00:00.000Z",
      endExclusive: "2026-07-03T04:00:00.000Z",
    });
  });

  it("validates stable shop identity and rejects an unsafe domain", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    expect(parseShopifyShopResponse(representative.shop)).toEqual({
      id: "gid://shopify/Shop/100000001",
      name: "Synthetic Relay Store",
      currencyCode: "USD",
      ianaTimezone: "America/New_York",
      myshopifyDomain: "synthetic-relay-store.myshopify.com",
    });
    expect(() => parseShopifyShopResponse({
      data: { shop: { id: "gid://shopify/Shop/1", name: "Unsafe", currencyCode: "USD", ianaTimezone: "UTC", myshopifyDomain: "evil.example" } },
    })).toThrow();
  });

  it("validates order pages, currencies, zero money, and malformed pagination", async () => {
    const edge = await fixture<EdgeFixture>("edge-cases.json");
    const boundary = parseShopifyOrdersResponse(edge.boundaryPage);
    expect(boundary.data.orders.edges[0]?.node.totalPriceSet.shopMoney.amount).toBe("0.00");
    expect(boundary.data.orders.edges[1]?.node.totalPriceSet.shopMoney.currencyCode).toBe("EUR");
    expect(() => parseShopifyOrdersResponse(edge.malformed)).toThrow();
  });

  it("keeps the UTC boundary on the correct store-local reporting date", async () => {
    const edge = await fixture<EdgeFixture>("edge-cases.json");
    const boundary = parseShopifyOrdersResponse(edge.boundaryPage);
    const input = {
      externalAccount: { id: "gid://shopify/Shop/1", name: "Synthetic", currency: "USD", timezone: "America/New_York" },
      provenance: { transport: "api" as const, provider: "shopify" as const, externalAccountId: "gid://shopify/Shop/1", fetchRequestId: "fetch", dateRange: { start: "2026-07-01", end: "2026-07-01" } },
    };

    expect(normalizeShopifyOrders({ records: [boundary.data.orders.edges[1]!.node], ...input })[0]?.date).toBe("2026-07-01");
    expect(() => normalizeShopifyOrders({ records: [boundary.data.orders.edges[0]!.node], ...input })).toThrowError(
      expect.objectContaining({ code: "INVALID_SHOPIFY_ORDER" }),
    );
  });
});

describe("Shopify normalizer", () => {
  it("uses store-local dates, preserves fixed decimals, and emits safe API provenance", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const pages = representative.pages.map(parseShopifyOrdersResponse);
    const records = pages.flatMap((page) => page.data.orders.edges.map((edge) => edge.node));
    const normalized = normalizeShopifyOrders({
      records,
      externalAccount: {
        id: "gid://shopify/Shop/100000001",
        name: "Synthetic Relay Store",
        currency: "USD",
        timezone: "America/New_York",
      },
      provenance: {
        transport: "api",
        provider: "shopify",
        externalAccountId: "gid://shopify/Shop/100000001",
        fetchRequestId: "shopify-fetch-1",
        dateRange: request.dateRange,
      },
    });

    expect(normalized).toEqual([
      expect.objectContaining({ orderId: "#1001", date: "2026-07-01", grossRevenue: "126", currencyCode: "USD", orders: "1" }),
      expect.objectContaining({ orderId: "#1002", date: "2026-07-02", grossRevenue: "60.5", currencyCode: "USD", orders: "1" }),
    ]);
    expect(normalized.every((item) => item.netRevenue === null && item.refunds === null)).toBe(true);
    expect(normalized.every((item) => !("attributedRevenue" in item))).toBe(true);
    expect(normalized[0]?.provenance).toEqual(expect.objectContaining({
      transport: "api",
      provider: "shopify",
      providerRecordLocator: "gid://shopify/Order/1001",
    }));
  });

  it("rejects duplicate order IDs rather than multiplying order totals", async () => {
    const edge = await fixture<EdgeFixture>("edge-cases.json");
    const duplicate = parseShopifyOrdersResponse(edge.duplicatePage);
    expect(() => normalizeShopifyOrders({
      records: duplicate.data.orders.edges.map((item) => item.node),
      externalAccount: { id: "gid://shopify/Shop/1", name: "Synthetic", currency: "USD", timezone: "UTC" },
      provenance: { transport: "api", provider: "shopify", externalAccountId: "gid://shopify/Shop/1", fetchRequestId: "fetch", dateRange: { start: "2026-07-01", end: "2026-07-01" } },
    })).toThrowError(expect.objectContaining({ code: "UNSUPPORTED_SHOPIFY_ORDER_GRAIN" }));
  });
});

describe("Shopify connector transport", () => {
  it("discovers the installed store and fetches bounded cursor pages using the pinned API version", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(representative.shop))
      .mockResolvedValueOnce(response(representative.shop))
      .mockResolvedValueOnce(response(representative.pages[0]))
      .mockResolvedValueOnce(response(representative.pages[1]));
    const connector = new ShopifyConnector({
      shopDomain: "synthetic-relay-store.myshopify.com",
      accessToken: "request-scoped-secret",
      fetchImpl,
      fetchRequestId: () => "shopify-fetch-1",
      delay: async () => undefined,
    });

    expect(await connector.discoverAccounts(connection())).toEqual([{
      id: "gid://shopify/Shop/100000001",
      name: "Synthetic Relay Store",
      currency: "USD",
      timezone: "America/New_York",
      status: "installed",
    }]);
    const result = await connector.fetch(connection(), request);
    expect(result.pagesFetched).toBe(2);
    expect(result.records).toHaveLength(2);
    expect(result.provenance.fetchRequestId).toBe("shopify-fetch-1");
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    const urls = fetchImpl.mock.calls.map(([url]) => String(url));
    expect(urls.every((url) => url === `https://synthetic-relay-store.myshopify.com/admin/api/${SHOPIFY_API_VERSION}/graphql.json`)).toBe(true);
    const finalBody = JSON.parse(String(fetchImpl.mock.calls[3]?.[1]?.body));
    expect(finalBody.variables.after).toBe("synthetic-cursor-1");
    expect(finalBody.query).not.toMatch(/email|phone|address|customer|lineItems/i);
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toEqual(expect.objectContaining({ "X-Shopify-Access-Token": "request-scoped-secret" }));
  });

  it("blocks wrong provider, unready connection, wrong selected store, and missing read scope before order fetch", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const fetchImpl = vi.fn().mockResolvedValue(response(representative.shop));
    const connector = new ShopifyConnector({ shopDomain: "synthetic-relay-store.myshopify.com", accessToken: "secret", fetchImpl, delay: async () => undefined });

    await expect(connector.fetch(connection({ status: "expired" }), request)).rejects.toMatchObject({ code: "AUTH_EXPIRED" });
    await expect(connector.fetch(connection({ grantedScopes: [] }), request)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(connector.fetch(connection(), { ...request, externalAccountId: "gid://shopify/Shop/other" })).rejects.toMatchObject({ code: "ACCOUNT_NOT_FOUND" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("enforces declared discovery and reporting capabilities before provider requests", async () => {
    const fetchImpl = vi.fn();
    const connector = new ShopifyConnector({
      shopDomain: "synthetic-relay-store.myshopify.com",
      accessToken: "secret",
      fetchImpl,
      delay: async () => undefined,
    });

    await expect(connector.discoverAccounts(connection({
      capabilities: ["reporting_fetch", "date_range_fetch", "pagination"],
    }))).rejects.toMatchObject({ code: "FETCH_FAILED", retryable: false });
    await expect(connector.fetch(connection({
      capabilities: ["account_discovery", "date_range_fetch", "pagination"],
    }), request)).rejects.toMatchObject({ code: "FETCH_FAILED", retryable: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("requires separately approved all-orders access before fetching beyond Shopify's default 60-day window", async () => {
    const fetchImpl = vi.fn();
    const connector = new ShopifyConnector({
      shopDomain: "synthetic-relay-store.myshopify.com",
      accessToken: "secret",
      fetchImpl,
      now: () => new Date("2026-08-12T12:00:00Z"),
      delay: async () => undefined,
    });
    await expect(connector.fetch(connection(), {
      ...request,
      dateRange: { start: "2026-06-01", end: "2026-06-02" },
    })).rejects.toMatchObject({ code: "PERMISSION_DENIED", retryable: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps throttling and provider failures safely and retries without real sleep", async () => {
    const edge = await fixture<EdgeFixture>("edge-cases.json");
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const delay = vi.fn(async () => undefined);
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(representative.shop))
      .mockResolvedValueOnce(response(edge.providerError))
      .mockResolvedValueOnce(response(representative.pages[0]))
      .mockResolvedValueOnce(response(representative.pages[1]));
    const connector = new ShopifyConnector({ shopDomain: "synthetic-relay-store.myshopify.com", accessToken: "secret", fetchImpl, delay });
    await expect(connector.fetch(connection(), request)).resolves.toMatchObject({ pagesFetched: 2 });
    expect(delay).toHaveBeenCalledWith(2020);

    const denied = new ShopifyConnector({
      shopDomain: "synthetic-relay-store.myshopify.com",
      accessToken: "secret",
      fetchImpl: async () => response({ errors: [{ message: "secret raw provider text", extensions: { code: "ACCESS_DENIED" } }] }),
      delay: async () => undefined,
    });
    const error = await denied.discoverAccounts(connection()).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ConnectorFailure);
    expect(error).toMatchObject({ code: "PERMISSION_DENIED", retryable: false });
    expect(error).not.toHaveProperty("cause");
    expect(String(error)).not.toContain("secret raw provider text");
  });

  it.each([
    [401, "AUTH_REQUIRED", false],
    [403, "PERMISSION_DENIED", false],
    [404, "ACCOUNT_NOT_FOUND", false],
    [429, "RATE_LIMITED", true],
    [500, "PROVIDER_UNAVAILABLE", true],
  ])("maps HTTP %i to %s without exposing response content", async (status, code, retryable) => {
    const connector = new ShopifyConnector({
      shopDomain: "synthetic-relay-store.myshopify.com",
      accessToken: "secret",
      fetchImpl: async () => new Response("sensitive provider body", {
        status,
        headers: status === 429 ? { "retry-after": "1" } : undefined,
      }),
      delay: async () => undefined,
    });
    const error = await connector.discoverAccounts(connection()).catch((cause: unknown) => cause);
    expect(error).toMatchObject({ code, retryable });
    expect(String(error)).not.toContain("sensitive provider body");
  });

  it("maps malformed JSON to a terminal invalid-response error", async () => {
    const connector = new ShopifyConnector({
      shopDomain: "synthetic-relay-store.myshopify.com",
      accessToken: "secret",
      fetchImpl: async () => new Response("not-json"),
      delay: async () => undefined,
    });
    await expect(connector.discoverAccounts(connection())).rejects.toMatchObject({
      code: "INVALID_PROVIDER_RESPONSE",
      retryable: false,
    });
  });

  it("fails closed on a repeated Shopify cursor", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(representative.shop))
      .mockResolvedValueOnce(response(representative.pages[0]))
      .mockResolvedValueOnce(response(representative.pages[0]));
    const connector = new ShopifyConnector({ shopDomain: "synthetic-relay-store.myshopify.com", accessToken: "secret", fetchImpl, delay: async () => undefined });

    await expect(connector.fetch(connection(), request)).rejects.toMatchObject({
      code: "PAGINATION_LIMIT_EXCEEDED",
      retryable: false,
    });
  });

  it("fails closed at the Shopify maximum page guard", async () => {
    const representative = await fixture<RepresentativeFixture>("representative-equivalent.json");
    const firstPage = parseShopifyOrdersResponse(representative.pages[0]);
    const pages = Array.from({ length: 100 }, (_, index) => ({
      data: {
        orders: {
          edges: [{ ...firstPage.data.orders.edges[0], cursor: `edge-${index}` }],
          pageInfo: { hasNextPage: true, endCursor: `page-${index + 1}` },
        },
      },
    }));
    const providerResponses = [representative.shop, ...pages];
    let providerCall = 0;
    const connector = new ShopifyConnector({
      shopDomain: "synthetic-relay-store.myshopify.com",
      accessToken: "secret",
      fetchImpl: async () => response(providerResponses[providerCall++]),
      delay: async () => undefined,
    });

    await expect(connector.fetch(connection(), request)).rejects.toMatchObject({
      code: "PAGINATION_LIMIT_EXCEEDED",
      retryable: false,
    });
    expect(providerCall).toBe(101);
  });
});
