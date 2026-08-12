import { selectExternalAccount } from "../../../lib/connectors/account-selection";
import { ConnectorFailure, toConnectorError } from "../../../lib/connectors/errors";
import { paginate } from "../../../lib/connectors/pagination";
import { assessConnectorReadiness } from "../../../lib/connectors/readiness";
import {
  fetchRequestSchema,
  type Connection,
  type ConnectionStatus,
  type Connector,
  type ConnectorDateRange,
  type ExternalAccount,
  type FetchRequest,
  type ProviderFetchResult,
} from "../../../lib/connectors/types";

export type MockAdvertisingRecord = {
  recordId: string;
  date: string;
  sourceAccountId?: string;
  sourceAccountName?: string;
  campaignId?: string;
  campaignName?: string;
  groupId?: string;
  groupName?: string;
  adId?: string;
  adName?: string;
  currency: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  conversions?: string;
  purchaseValue?: string;
};

export type MockConnectorFixture = {
  fixtureType: "synthetic_provider_neutral_mock";
  providerCompatibilityClaim: "none";
  externalAccount: ExternalAccount;
  dateRange: ConnectorDateRange;
  pages: Array<{ records: MockAdvertisingRecord[]; nextToken?: string }>;
};

export class MockAdvertisingConnector implements Connector<MockAdvertisingRecord> {
  readonly provider = "meta_ads" as const;
  pageFetchCount = 0;

  constructor(
    private readonly fixture: MockConnectorFixture,
    private readonly options: { failure?: "retryable" | "terminal" } = {},
  ) {}

  async getConnectionStatus(connection: Connection): Promise<ConnectionStatus> {
    return connection.status;
  }

  async discoverAccounts(connection: Connection): Promise<ExternalAccount[]> {
    void connection;
    return [this.fixture.externalAccount];
  }

  async fetch(
    connection: Connection,
    untrustedRequest: FetchRequest,
  ): Promise<ProviderFetchResult<MockAdvertisingRecord>> {
    const request = fetchRequestSchema.parse(untrustedRequest);
    if (connection.status === "expired") {
      throw new ConnectorFailure(toConnectorError({ provider: this.provider, code: "AUTH_EXPIRED" }));
    }
    if (connection.status === "permission_error") {
      throw new ConnectorFailure(toConnectorError({ provider: this.provider, code: "PERMISSION_DENIED" }));
    }

    const readiness = assessConnectorReadiness({ connectorExists: true, connectorConfigured: true, connection });
    if (!readiness.fetchPossible) {
      throw new ConnectorFailure(toConnectorError({ provider: this.provider, code: "AUTH_REQUIRED" }));
    }
    if (request.provider !== this.provider || request.externalAccountId !== connection.externalAccountId) {
      throw new ConnectorFailure(toConnectorError({ provider: this.provider, code: "ACCOUNT_NOT_FOUND" }));
    }
    const externalAccount = selectExternalAccount(await this.discoverAccounts(connection), request.externalAccountId);

    if (this.options.failure === "retryable") {
      throw new ConnectorFailure(
        toConnectorError({ provider: this.provider, code: "PROVIDER_UNAVAILABLE", causeCategory: "provider_outage" }),
      );
    }
    if (this.options.failure === "terminal") {
      throw new ConnectorFailure(
        toConnectorError({ provider: this.provider, code: "PERMISSION_DENIED", causeCategory: "permission" }),
      );
    }

    const paginated = await paginate<MockAdvertisingRecord, string>(
      async () => {
        const page = this.fixture.pages[this.pageFetchCount];
        this.pageFetchCount += 1;
        return page ?? { records: [] };
      },
      { provider: this.provider, maxPages: 10, maxRecords: 50_000 },
    );

    return {
      provider: this.provider,
      externalAccount,
      dateRange: request.dateRange,
      pagesFetched: paginated.pagesFetched,
      records: paginated.records,
      provenance: {
        transport: "api",
        provider: this.provider,
        externalAccountId: externalAccount.id,
        fetchRequestId: "mock_fetch_request",
        dateRange: request.dateRange,
      },
      warnings: [],
    };
  }
}
