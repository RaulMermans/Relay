import { ConnectorFailure, toConnectorError } from "../errors";
import { paginate } from "../pagination";
import { withRetry } from "../retry";
import { fetchRequestSchema, type Connection, type Connector, type ConnectorCapability, type ExternalAccount, type FetchRequest, type ProviderFetchResult } from "../types";
import { parseShopDomain, parseShopifyGraphqlEnvelope, parseShopifyOrdersResponse, parseShopifyShopResponse, type ShopifyGraphqlEnvelope, type ShopifyOrder } from "./types";

export const SHOPIFY_API_VERSION = "2026-07";
export const SHOPIFY_CAPABILITIES = ["account_discovery", "reporting_fetch", "date_range_fetch", "pagination"] as const satisfies readonly ConnectorCapability[];

const SHOP_QUERY = `query RelayShopIdentity {
  shop { id name currencyCode ianaTimezone myshopifyDomain }
}`;

const ORDERS_QUERY = `query RelayOrders($first: Int!, $after: String, $query: String!) {
  orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT) {
    edges {
      cursor
      node { id name createdAt totalPriceSet { shopMoney { amount currencyCode } } }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type ShopifyConnectorOptions = {
  shopDomain: string;
  accessToken: string;
  fetchImpl?: FetchLike;
  fetchRequestId?: () => string;
  delay?: (milliseconds: number) => Promise<void>;
  now?: () => Date;
};

function failure(code: Parameters<typeof toConnectorError>[0]["code"], options: { retryable?: boolean; retryAfterMs?: number; category?: Parameters<typeof toConnectorError>[0]["causeCategory"] } = {}): ConnectorFailure {
  return new ConnectorFailure(toConnectorError({
    provider: "shopify",
    code,
    ...(options.retryable !== undefined ? { retryable: options.retryable } : {}),
    ...(options.retryAfterMs !== undefined ? { retryAfterMs: options.retryAfterMs } : {}),
    ...(options.category ? { causeCategory: options.category } : {}),
  }));
}

function errorCode(envelope: ShopifyGraphqlEnvelope): string | undefined {
  return envelope.errors?.map((item) => item.extensions?.code).find((code): code is string => Boolean(code));
}

function throttleDelay(envelope: ShopifyGraphqlEnvelope): number | undefined {
  const cost = envelope.extensions?.cost;
  const status = cost?.throttleStatus;
  if (!status) return undefined;
  const requestedCost = cost.requestedQueryCost ?? 1;
  return Math.max(0, Math.min(300_000, Math.ceil((Math.max(requestedCost - status.currentlyAvailable, 0) / status.restoreRate) * 1_000)));
}

function mapGraphqlError(envelope: ShopifyGraphqlEnvelope): ConnectorFailure {
  switch (errorCode(envelope)) {
    case "THROTTLED":
      return failure("RATE_LIMITED", { retryable: true, retryAfterMs: throttleDelay(envelope), category: "rate_limit" });
    case "ACCESS_DENIED":
    case "FORBIDDEN":
      return failure("PERMISSION_DENIED", { category: "permission" });
    case "UNAUTHORIZED":
      return failure("AUTH_REQUIRED", { category: "authorization" });
    case "SHOP_INACTIVE":
    case "SHOP_UNAVAILABLE":
      return failure("ACCOUNT_NOT_FOUND", { category: "account" });
    default:
      return failure("FETCH_FAILED", { category: "provider_error" });
  }
}

function mapHttpError(status: number, retryAfter: string | null): ConnectorFailure {
  if (status === 401) return failure("AUTH_REQUIRED", { category: "authorization" });
  if (status === 403) return failure("PERMISSION_DENIED", { category: "permission" });
  if (status === 404) return failure("ACCOUNT_NOT_FOUND", { category: "account" });
  if (status === 429) {
    const seconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : undefined;
    return failure("RATE_LIMITED", { retryable: true, retryAfterMs: seconds === undefined ? undefined : seconds * 1_000, category: "rate_limit" });
  }
  if (status >= 500) return failure("PROVIDER_UNAVAILABLE", { retryable: true, category: "provider_outage" });
  return failure("FETCH_FAILED", { category: "provider_error" });
}

function dateParts(date: string): [number, number, number] {
  const [year, month, day] = date.split("-").map(Number);
  return [year!, month!, day!];
}

function localMidnightUtc(date: string, timeZone: string): string {
  const [year, month, day] = dateParts(date);
  const wanted = Date.UTC(year, month - 1, day);
  let candidate = wanted;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatter.formatToParts(new Date(candidate));
    const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
    const represented = Date.UTC(read("year"), read("month") - 1, read("day"), read("hour"), read("minute"), read("second"));
    const difference = represented - wanted;
    candidate -= difference;
    if (difference === 0) return new Date(candidate).toISOString();
  }
  const parts = formatter.formatToParts(new Date(candidate));
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  if (read("year") !== year || read("month") !== month || read("day") !== day || read("hour") !== 0) {
    throw failure("INVALID_PROVIDER_RESPONSE", { category: "provider_response" });
  }
  return new Date(candidate).toISOString();
}

function nextDate(date: string): string {
  const [year, month, day] = dateParts(date);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

export function storeDateRangeToUtc(range: FetchRequest["dateRange"], timeZone: string): { startInclusive: string; endExclusive: string } {
  return {
    startInclusive: localMidnightUtc(range.start, timeZone),
    endExclusive: localMidnightUtc(nextDate(range.end), timeZone),
  };
}

export class ShopifyConnector implements Connector<ShopifyOrder> {
  readonly provider = "shopify" as const;
  readonly #shopDomain: string;
  readonly #accessToken: string;
  readonly #fetchImpl: FetchLike;
  readonly #fetchRequestId: () => string;
  readonly #delay: (milliseconds: number) => Promise<void>;
  readonly #now: () => Date;

  constructor(options: ShopifyConnectorOptions) {
    this.#shopDomain = parseShopDomain(options.shopDomain);
    if (!options.accessToken.trim()) throw failure("AUTH_REQUIRED", { category: "authorization" });
    this.#accessToken = options.accessToken;
    this.#fetchImpl = options.fetchImpl ?? fetch;
    this.#fetchRequestId = options.fetchRequestId ?? (() => crypto.randomUUID());
    this.#delay = options.delay ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.#now = options.now ?? (() => new Date());
  }

  async getConnectionStatus(connection: Connection): Promise<Connection["status"]> {
    return connection.provider === "shopify" ? connection.status : "unavailable";
  }

  async #graphql(query: string, variables: Record<string, unknown>): Promise<unknown> {
    return withRetry(async () => {
      let response: Response;
      try {
        response = await this.#fetchImpl(
          `https://${this.#shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              "X-Shopify-Access-Token": this.#accessToken,
            },
            body: JSON.stringify({ query, variables }),
          },
        );
      } catch {
        throw failure("PROVIDER_UNAVAILABLE", { retryable: true, category: "network" });
      }
      if (!response.ok) throw mapHttpError(response.status, response.headers.get("retry-after"));
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw failure("INVALID_PROVIDER_RESPONSE", { category: "provider_response" });
      }
      let envelope: ShopifyGraphqlEnvelope;
      try {
        envelope = parseShopifyGraphqlEnvelope(body);
      } catch {
        throw failure("INVALID_PROVIDER_RESPONSE", { category: "provider_response" });
      }
      if (envelope.errors?.length) throw mapGraphqlError(envelope);
      return body;
    }, { maxAttempts: 3, baseDelayMs: 250, maxDelayMs: 5_000, delay: this.#delay });
  }

  #assertConnection(connection: Connection, requiredCapabilities: readonly ConnectorCapability[]): void {
    if (connection.provider !== "shopify") throw failure("AUTH_REQUIRED", { category: "authorization" });
    if (connection.status === "expired") throw failure("AUTH_EXPIRED", { category: "authorization" });
    if (connection.status !== "ready" || !connection.credentialReference) throw failure("AUTH_REQUIRED", { category: "authorization" });
    if (!connection.grantedScopes.includes("read_orders")) throw failure("PERMISSION_DENIED", { category: "permission" });
    if (requiredCapabilities.some((capability) => !connection.capabilities.includes(capability))) {
      throw failure("FETCH_FAILED", { category: "provider_response" });
    }
  }

  async discoverAccounts(connection: Connection): Promise<ExternalAccount[]> {
    this.#assertConnection(connection, ["account_discovery"]);
    let shop;
    try {
      shop = parseShopifyShopResponse(await this.#graphql(SHOP_QUERY, {}));
    } catch (error) {
      if (error instanceof ConnectorFailure) throw error;
      throw failure("INVALID_PROVIDER_RESPONSE", { category: "provider_response" });
    }
    if (shop.myshopifyDomain !== this.#shopDomain) throw failure("ACCOUNT_NOT_FOUND", { category: "account" });
    return [{ id: shop.id, name: shop.name, currency: shop.currencyCode, timezone: shop.ianaTimezone, status: "installed" }];
  }

  async fetch(connection: Connection, untrustedRequest: FetchRequest): Promise<ProviderFetchResult<ShopifyOrder>> {
    this.#assertConnection(connection, ["reporting_fetch", "date_range_fetch", "pagination"]);
    let request: FetchRequest;
    try {
      request = fetchRequestSchema.parse(untrustedRequest);
    } catch {
      throw failure("FETCH_FAILED", { category: "provider_response" });
    }
    if (request.provider !== "shopify") throw failure("FETCH_FAILED", { category: "provider_response" });
    const currentDate = this.#now();
    if (Number.isNaN(currentDate.valueOf())) throw failure("FETCH_FAILED", { category: "unknown" });
    const oldestDefaultInstant = Date.UTC(
      currentDate.getUTCFullYear(),
      currentDate.getUTCMonth(),
      currentDate.getUTCDate() - 59,
    );
    const oldestDefaultDate = new Date(oldestDefaultInstant).toISOString().slice(0, 10);
    if (request.dateRange.start < oldestDefaultDate && !connection.grantedScopes.includes("read_all_orders")) {
      throw failure("PERMISSION_DENIED", { category: "permission" });
    }
    const accounts = await this.discoverAccounts(connection);
    const externalAccount = accounts.find((account) => account.id === request.externalAccountId);
    if (!externalAccount || connection.externalAccountId !== externalAccount.id) throw failure("ACCOUNT_NOT_FOUND", { category: "account" });
    const bounds = storeDateRangeToUtc(request.dateRange, externalAccount.timezone!);
    const searchQuery = `created_at:>='${bounds.startInclusive}' created_at:<'${bounds.endExclusive}'`;
    const result = await paginate(async (after?: string) => {
      let page;
      try {
        page = parseShopifyOrdersResponse(await this.#graphql(ORDERS_QUERY, { first: 100, after: after ?? null, query: searchQuery }));
      } catch (error) {
        if (error instanceof ConnectorFailure) throw error;
        throw failure("INVALID_PROVIDER_RESPONSE", { category: "provider_response" });
      }
      return {
        records: page.data.orders.edges.map((edge) => edge.node),
        ...(page.data.orders.pageInfo.hasNextPage ? { nextToken: page.data.orders.pageInfo.endCursor! } : {}),
      };
    }, { provider: "shopify", maxPages: 100, maxRecords: 10_000, tokenKey: (token) => token });

    return {
      provider: "shopify",
      externalAccount,
      dateRange: request.dateRange,
      pagesFetched: result.pagesFetched,
      records: result.records,
      provenance: {
        transport: "api",
        provider: "shopify",
        externalAccountId: externalAccount.id,
        fetchRequestId: this.#fetchRequestId(),
        dateRange: request.dateRange,
      },
      warnings: [],
    };
  }
}
