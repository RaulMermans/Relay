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
import { mapMetaResponseError, metaFailure } from "./errors";
import { parseMetaAccountsResponse, parseMetaGraphError, parseMetaInsightsResponse, type MetaInsightRecord } from "./types";

export const META_ADS_API_VERSION = "v26.0";
export const META_ADS_MAX_SYNC_DAYS = 31;
export const META_ADS_CAPABILITIES = ["account_discovery", "reporting_fetch", "date_range_fetch", "pagination"] as const satisfies readonly ConnectorCapability[];

const ACCOUNT_FIELDS = ["id", "account_id", "name", "currency", "timezone_name", "account_status"] as const;
const INSIGHT_FIELDS = [
  "date_start", "date_stop", "account_id", "account_name", "account_currency",
  "campaign_id", "campaign_name", "adset_id", "adset_name", "ad_id", "ad_name",
  "spend", "impressions", "inline_link_clicks", "actions", "action_values",
] as const;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function inclusiveCalendarDays(start: string, end: string): number {
  const startMilliseconds = Date.parse(`${start}T00:00:00Z`);
  const endMilliseconds = Date.parse(`${end}T00:00:00Z`);
  return Math.floor((endMilliseconds - startMilliseconds) / 86_400_000) + 1;
}

type MetaAdsConnectorOptions = {
  accessToken: string;
  fetchImpl?: FetchLike;
  fetchRequestId?: () => string;
  delay?: (milliseconds: number) => Promise<void>;
};

const ACCOUNT_STATUS: Record<number, string> = {
  1: "active",
  2: "disabled",
  3: "unsettled",
  7: "pending_risk_review",
  8: "pending_settlement",
  9: "in_grace_period",
  100: "pending_closure",
  101: "closed",
  201: "any_active",
  202: "any_closed",
};

export class MetaAdsConnector implements Connector<MetaInsightRecord> {
  readonly provider = "meta_ads" as const;
  readonly #accessToken: string;
  readonly #fetchImpl: FetchLike;
  readonly #fetchRequestId: () => string;
  readonly #delay: (milliseconds: number) => Promise<void>;

  constructor(options: MetaAdsConnectorOptions) {
    if (!options.accessToken.trim()) throw metaFailure("AUTH_REQUIRED", { category: "authorization" });
    this.#accessToken = options.accessToken;
    this.#fetchImpl = options.fetchImpl ?? fetch;
    this.#fetchRequestId = options.fetchRequestId ?? (() => crypto.randomUUID());
    this.#delay = options.delay ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  async getConnectionStatus(connection: Connection): Promise<Connection["status"]> {
    return connection.provider === "meta_ads" ? connection.status : "unavailable";
  }

  #assertConnection(connection: Connection, requiredCapabilities: readonly ConnectorCapability[]): void {
    if (connection.provider !== "meta_ads") throw metaFailure("AUTH_REQUIRED", { category: "authorization" });
    if (connection.status === "expired") throw metaFailure("AUTH_EXPIRED", { category: "authorization" });
    if (connection.status !== "ready" || !connection.credentialReference) {
      throw metaFailure("AUTH_REQUIRED", { category: "authorization" });
    }
    if (!connection.grantedScopes.includes("ads_read")) throw metaFailure("PERMISSION_DENIED", { category: "permission" });
    if (requiredCapabilities.some((capability) => !connection.capabilities.includes(capability))) {
      throw metaFailure("FETCH_FAILED", { category: "provider_response" });
    }
  }

  async #get(path: string, parameters: Record<string, string>): Promise<unknown> {
    return withRetry(async () => {
      const url = new URL(`https://graph.facebook.com/${META_ADS_API_VERSION}/${path}`);
      for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);

      let response: Response;
      try {
        response = await this.#fetchImpl(url, {
          method: "GET",
          headers: { Accept: "application/json", Authorization: `Bearer ${this.#accessToken}` },
        });
      } catch {
        throw metaFailure("PROVIDER_UNAVAILABLE", { retryable: true, category: "network" });
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        if (!response.ok) throw mapMetaResponseError(response.status, null, response.headers.get("retry-after"));
        throw metaFailure("INVALID_PROVIDER_RESPONSE", { category: "provider_response" });
      }
      if (!response.ok || parseMetaGraphError(body)) {
        throw mapMetaResponseError(response.status, body, response.headers.get("retry-after"));
      }
      return body;
    }, { maxAttempts: 3, baseDelayMs: 250, maxDelayMs: 5_000, delay: this.#delay });
  }

  async discoverAccounts(connection: Connection): Promise<ExternalAccount[]> {
    this.#assertConnection(connection, ["account_discovery"]);
    const result = await paginate(async (after?: string) => {
      let page;
      try {
        page = parseMetaAccountsResponse(await this.#get("me/adaccounts", {
          fields: ACCOUNT_FIELDS.join(","),
          limit: "100",
          ...(after ? { after } : {}),
        }));
      } catch (error) {
        if (error instanceof ConnectorFailure) throw error;
        throw metaFailure("INVALID_PROVIDER_RESPONSE", { category: "provider_response" });
      }
      return {
        records: page.data.map((account) => ({
          id: account.id,
          name: account.name,
          currency: account.currency,
          timezone: account.timezone_name,
          status: ACCOUNT_STATUS[account.account_status] ?? `status_${account.account_status}`,
        })),
        ...(page.paging?.cursors?.after && page.paging.next ? { nextToken: page.paging.cursors.after } : {}),
      };
    }, { provider: "meta_ads", maxPages: 10, maxRecords: 1_000, tokenKey: (token) => token });
    return result.records;
  }

  async fetch(connection: Connection, untrustedRequest: FetchRequest): Promise<ProviderFetchResult<MetaInsightRecord>> {
    this.#assertConnection(connection, ["reporting_fetch", "date_range_fetch", "pagination"]);
    let request: FetchRequest;
    try {
      request = fetchRequestSchema.parse(untrustedRequest);
    } catch {
      throw metaFailure("FETCH_FAILED", { category: "provider_response" });
    }
    if (request.provider !== "meta_ads") throw metaFailure("FETCH_FAILED", { category: "provider_response" });
    if (inclusiveCalendarDays(request.dateRange.start, request.dateRange.end) > META_ADS_MAX_SYNC_DAYS) {
      throw metaFailure("FETCH_FAILED", { category: "provider_response" });
    }

    const accounts = await this.discoverAccounts(connection);
    const externalAccount = accounts.find((account) => account.id === request.externalAccountId);
    if (!externalAccount || connection.externalAccountId !== externalAccount.id) {
      throw metaFailure("ACCOUNT_NOT_FOUND", { category: "account" });
    }

    const result = await paginate(async (after?: string) => {
      let page;
      try {
        page = parseMetaInsightsResponse(await this.#get(`${externalAccount.id}/insights`, {
          fields: INSIGHT_FIELDS.join(","),
          level: "ad",
          time_range: JSON.stringify({ since: request.dateRange.start, until: request.dateRange.end }),
          time_increment: "1",
          use_unified_attribution_setting: "true",
          limit: "100",
          ...(after ? { after } : {}),
        }));
      } catch (error) {
        if (error instanceof ConnectorFailure) throw error;
        throw metaFailure("INVALID_PROVIDER_RESPONSE", { category: "provider_response" });
      }
      return {
        records: page.data,
        ...(page.paging?.cursors?.after && page.paging.next ? { nextToken: page.paging.cursors.after } : {}),
      };
    }, { provider: "meta_ads", maxPages: 100, maxRecords: 10_000, tokenKey: (token) => token });

    return {
      provider: "meta_ads",
      externalAccount,
      dateRange: request.dateRange,
      pagesFetched: result.pagesFetched,
      records: result.records,
      provenance: {
        transport: "api",
        provider: "meta_ads",
        externalAccountId: externalAccount.id,
        fetchRequestId: this.#fetchRequestId(),
        dateRange: request.dateRange,
      },
      warnings: [],
    };
  }
}
