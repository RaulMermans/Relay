import { ConnectorFailure } from "../errors";
import { paginate } from "../pagination";
import { withRetry } from "../retry";
import {
  fetchRequestSchema,
  type Connection,
  type Connector,
  type ConnectorCapability,
  type ExternalAccount,
  type FetchRequest,
  type ProviderFetchResult,
} from "../types";
import { googleAdsFailure, mapGoogleAdsResponseError } from "./errors";
import {
  parseAccessibleCustomers,
  parseGoogleAdsFailure,
  parseGoogleAdsSearchResponse,
  type GoogleAdsCustomer,
  type GoogleAdsCustomerClient,
  type GoogleAdsReportRow,
} from "./types";

export const GOOGLE_ADS_API_VERSION = "v25";
export const GOOGLE_ADS_OAUTH_SCOPE = "https://www.googleapis.com/auth/adwords";
export const GOOGLE_ADS_MAX_RANGE_DAYS = 31;
export const GOOGLE_ADS_MAX_ACCESSIBLE_ROOTS = 20;
export const GOOGLE_ADS_MAX_DISCOVERED_ACCOUNTS = 1_000;
export const GOOGLE_ADS_CAPABILITIES = ["account_discovery", "reporting_fetch", "date_range_fetch", "pagination"] as const satisfies readonly ConnectorCapability[];

const CUSTOMER_QUERY = `SELECT
  customer.resource_name,
  customer.id,
  customer.descriptive_name,
  customer.currency_code,
  customer.time_zone,
  customer.status,
  customer.manager,
  customer.test_account
FROM customer
LIMIT 1`;

const CUSTOMER_CLIENT_QUERY = `SELECT
  customer_client.client_customer,
  customer_client.id,
  customer_client.descriptive_name,
  customer_client.currency_code,
  customer_client.time_zone,
  customer_client.status,
  customer_client.manager,
  customer_client.level,
  customer_client.test_account
FROM customer_client
ORDER BY customer_client.level, customer_client.id`;

export function buildGoogleAdsReportQuery(dateRange: FetchRequest["dateRange"]): string {
  return `SELECT
  customer.id,
  customer.descriptive_name,
  customer.currency_code,
  customer.time_zone,
  campaign.id,
  campaign.name,
  ad_group.id,
  ad_group.name,
  segments.date,
  metrics.cost_micros,
  metrics.impressions,
  metrics.clicks,
  metrics.conversions,
  metrics.conversions_value
FROM ad_group
WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
ORDER BY segments.date, campaign.id, ad_group.id`;
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type SearchResponse<Row> = {
  results: Row[];
  nextPageToken?: string;
};

type GoogleAdsConnectorOptions = {
  accessToken: string;
  developerToken: string;
  fetchImpl?: FetchLike;
  fetchRequestId?: () => string;
  delay?: (milliseconds: number) => Promise<void>;
};

type AccountContext = {
  account: ExternalAccount;
  loginCustomerId?: string;
};

function inclusiveCalendarDays(start: string, end: string): number {
  return Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
}

function toExternalAccount(customer: GoogleAdsCustomer | GoogleAdsCustomerClient): ExternalAccount {
  return {
    id: customer.id,
    name: customer.descriptiveName,
    currency: customer.currencyCode,
    timezone: customer.timeZone,
    status: customer.status.toLowerCase(),
  };
}

export class GoogleAdsConnector implements Connector<GoogleAdsReportRow> {
  readonly provider = "google_ads" as const;
  readonly #accessToken: string;
  readonly #developerToken: string;
  readonly #fetchImpl: FetchLike;
  readonly #fetchRequestId: () => string;
  readonly #delay: (milliseconds: number) => Promise<void>;

  constructor(options: GoogleAdsConnectorOptions) {
    if (!options.accessToken.trim() || !options.developerToken.trim()) {
      throw googleAdsFailure("AUTH_REQUIRED", { category: "authorization" });
    }
    this.#accessToken = options.accessToken;
    this.#developerToken = options.developerToken;
    this.#fetchImpl = options.fetchImpl ?? fetch;
    this.#fetchRequestId = options.fetchRequestId ?? (() => crypto.randomUUID());
    this.#delay = options.delay ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  async getConnectionStatus(connection: Connection): Promise<Connection["status"]> {
    return connection.provider === "google_ads" ? connection.status : "unavailable";
  }

  #assertConnection(connection: Connection, requiredCapabilities: readonly ConnectorCapability[]): void {
    if (connection.provider !== "google_ads") throw googleAdsFailure("AUTH_REQUIRED", { category: "authorization" });
    if (connection.status === "expired") throw googleAdsFailure("AUTH_EXPIRED", { category: "authorization" });
    if (connection.status !== "ready" || !connection.credentialReference) {
      throw googleAdsFailure("AUTH_REQUIRED", { category: "authorization" });
    }
    if (!connection.grantedScopes.includes(GOOGLE_ADS_OAUTH_SCOPE)) {
      throw googleAdsFailure("PERMISSION_DENIED", { category: "permission" });
    }
    if (requiredCapabilities.some((capability) => !connection.capabilities.includes(capability))) {
      throw googleAdsFailure("FETCH_FAILED", { category: "provider_response" });
    }
  }

  async #request(path: string, init: RequestInit, loginCustomerId?: string): Promise<unknown> {
    return withRetry(async () => {
      let response: Response;
      try {
        response = await this.#fetchImpl(`https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/${path}`, {
          ...init,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${this.#accessToken}`,
            "developer-token": this.#developerToken,
            ...(init.body ? { "content-type": "application/json" } : {}),
            ...(loginCustomerId ? { "login-customer-id": loginCustomerId } : {}),
          },
        });
      } catch {
        throw googleAdsFailure("PROVIDER_UNAVAILABLE", { retryable: true, category: "network" });
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        if (!response.ok) throw mapGoogleAdsResponseError(response.status, null, response.headers.get("retry-after"));
        throw googleAdsFailure("INVALID_PROVIDER_RESPONSE", { category: "provider_response" });
      }
      if (!response.ok || parseGoogleAdsFailure(body)) {
        throw mapGoogleAdsResponseError(response.status, body, response.headers.get("retry-after"));
      }
      return body;
    }, { maxAttempts: 3, baseDelayMs: 1_000, maxDelayMs: 8_000, delay: this.#delay });
  }

  async #search<Row>(
    customerId: string,
    query: string,
    parse: (input: unknown) => SearchResponse<Row>,
    options: { loginCustomerId?: string; maxPages: number; maxRecords: number },
  ) {
    return paginate<Row, string>(async (pageToken?: string) => {
      let parsed: SearchResponse<Row>;
      try {
        const body = await this.#request(`customers/${customerId}/googleAds:search`, {
          method: "POST",
          body: JSON.stringify({ query, ...(pageToken ? { pageToken } : {}) }),
        }, options.loginCustomerId);
        parsed = parse(body);
      } catch (error) {
        if (error instanceof ConnectorFailure) throw error;
        throw googleAdsFailure("INVALID_PROVIDER_RESPONSE", { category: "provider_response" });
      }
      return {
        records: parsed.results,
        ...(parsed.nextPageToken ? { nextToken: parsed.nextPageToken } : {}),
      };
    }, { provider: "google_ads", maxPages: options.maxPages, maxRecords: options.maxRecords, tokenKey: (token) => token });
  }

  async #discoverAccountContexts(connection: Connection): Promise<AccountContext[]> {
    this.#assertConnection(connection, ["account_discovery"]);
    let accessible;
    try {
      accessible = parseAccessibleCustomers(await this.#request("customers:listAccessibleCustomers", { method: "GET" }));
    } catch (error) {
      if (error instanceof ConnectorFailure) throw error;
      throw googleAdsFailure("INVALID_PROVIDER_RESPONSE", { category: "provider_response" });
    }
    if (accessible.resourceNames.length > GOOGLE_ADS_MAX_ACCESSIBLE_ROOTS) {
      throw googleAdsFailure("PAGINATION_LIMIT_EXCEEDED", { category: "pagination" });
    }

    const contexts = new Map<string, AccountContext>();
    for (const resourceName of accessible.resourceNames) {
      const rootId = resourceName.slice("customers/".length);
      const rootResult = await this.#search(rootId, CUSTOMER_QUERY, (body) => parseGoogleAdsSearchResponse(body, "customer"), { maxPages: 1, maxRecords: 1 });
      const rootRow = rootResult.records[0];
      if (!rootRow) {
        throw googleAdsFailure("INVALID_PROVIDER_RESPONSE", { category: "provider_response" });
      }
      const root = rootRow.customer;
      if (!root.manager) {
        contexts.set(root.id, { account: toExternalAccount(root) });
        continue;
      }

      const hierarchy = await this.#search(root.id, CUSTOMER_CLIENT_QUERY, (body) => parseGoogleAdsSearchResponse(body, "customer_client"), {
        loginCustomerId: root.id,
        maxPages: 5,
        maxRecords: GOOGLE_ADS_MAX_DISCOVERED_ACCOUNTS,
      });
      for (const row of hierarchy.records) {
        if (row.customerClient.manager) continue;
        const candidate = { account: toExternalAccount(row.customerClient), loginCustomerId: root.id };
        const current = contexts.get(candidate.account.id);
        if (!current || (current.loginCustomerId && candidate.loginCustomerId < current.loginCustomerId)) {
          contexts.set(candidate.account.id, candidate);
          if (contexts.size > GOOGLE_ADS_MAX_DISCOVERED_ACCOUNTS) {
            throw googleAdsFailure("PAGINATION_LIMIT_EXCEEDED", { category: "pagination" });
          }
        }
      }
    }
    return [...contexts.values()].sort((left, right) => left.account.id.localeCompare(right.account.id));
  }

  async discoverAccounts(connection: Connection): Promise<ExternalAccount[]> {
    return (await this.#discoverAccountContexts(connection)).map((context) => context.account);
  }

  async fetch(connection: Connection, untrustedRequest: FetchRequest): Promise<ProviderFetchResult<GoogleAdsReportRow>> {
    this.#assertConnection(connection, ["reporting_fetch", "date_range_fetch", "pagination"]);
    let request: FetchRequest;
    try {
      request = fetchRequestSchema.parse(untrustedRequest);
    } catch {
      throw googleAdsFailure("FETCH_FAILED", { category: "provider_response" });
    }
    if (request.provider !== "google_ads" || inclusiveCalendarDays(request.dateRange.start, request.dateRange.end) > GOOGLE_ADS_MAX_RANGE_DAYS) {
      throw googleAdsFailure("FETCH_FAILED", { category: "provider_response" });
    }

    const context = (await this.#discoverAccountContexts(connection)).find((candidate) => candidate.account.id === request.externalAccountId);
    if (!context || connection.externalAccountId !== context.account.id) {
      throw googleAdsFailure("ACCOUNT_NOT_FOUND", { category: "account" });
    }
    const result = await this.#search(context.account.id, buildGoogleAdsReportQuery(request.dateRange), (body) => parseGoogleAdsSearchResponse(body, "report"), {
      ...(context.loginCustomerId ? { loginCustomerId: context.loginCustomerId } : {}),
      maxPages: 5,
      maxRecords: 50_000,
    });

    return {
      provider: "google_ads",
      externalAccount: context.account,
      dateRange: request.dateRange,
      pagesFetched: result.pagesFetched,
      records: result.records,
      provenance: {
        transport: "api",
        provider: "google_ads",
        externalAccountId: context.account.id,
        fetchRequestId: this.#fetchRequestId(),
        dateRange: request.dateRange,
      },
      warnings: [],
    };
  }
}
