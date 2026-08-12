import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { ConnectorFailure } from "../../lib/connectors/errors";
import { selectExternalAccount } from "../../lib/connectors/account-selection";
import type { Connection, FetchRequest } from "../../lib/connectors/types";
import { checkProvenance } from "../../lib/data-health/checks/provenance";
import { normalizeCsvFile } from "../../lib/normalization/normalize-csv";
import { MockAdvertisingConnector, type MockConnectorFixture } from "../support/connectors/mock-connector";
import { normalizeMockAdvertisingRecords } from "../support/connectors/mock-normalizer";
import { compareCanonicalSemantics } from "../support/connectors/semantic-equivalence";

async function csvFixture(): Promise<File> {
  const content = await readFile(new URL("../../fixtures/raw/meta_ads/representative-export.csv", import.meta.url), "utf8");
  return new File([content], "representative-export.csv", { type: "text/csv" });
}

async function mockFixture(): Promise<MockConnectorFixture> {
  const content = await readFile(new URL("../../fixtures/connectors/mock/meta-ads-equivalent.json", import.meta.url), "utf8");
  return JSON.parse(content) as MockConnectorFixture;
}

function connection(status: Connection["status"] = "ready"): Connection {
  return {
    provider: "meta_ads",
    status,
    externalAccountId: "act_mock",
    externalAccountName: "Synthetic Relay Account",
    grantedScopes: ["reporting.read"],
    connectedAt: "2026-08-12T08:00:00.000Z",
    capabilities: ["account_discovery", "reporting_fetch", "date_range_fetch", "pagination"],
    credentialReference: "request_scoped_mock_credential",
  };
}

const request: FetchRequest = {
  provider: "meta_ads",
  externalAccountId: "act_mock",
  dateRange: { start: "2026-07-01", end: "2026-07-01" },
  requestedGrain: "daily",
};

describe("generic connector framework", () => {
  it("discovers, validates, fetches, normalizes, and matches existing CSV canonical semantics", async () => {
    const connector = new MockAdvertisingConnector(await mockFixture());
    const discovered = await connector.discoverAccounts(connection());
    const selected = selectExternalAccount(discovered, request.externalAccountId);
    const fetched = await connector.fetch(connection(), request);
    const apiCanonical = normalizeMockAdvertisingRecords(fetched);
    const csv = await normalizeCsvFile(await csvFixture(), { ingestionId: "fixture-meta" });

    expect(selected.id).toBe("act_mock");
    expect(fetched.pagesFetched).toBe(2);
    expect(fetched).not.toHaveProperty("nextToken");
    expect(csv.status).toBe("normalized");
    if (csv.status !== "normalized") throw new Error("Expected the existing CSV fixture to normalize.");

    expect(compareCanonicalSemantics(csv.observations, apiCanonical).equivalent).toBe(true);
    expect(checkProvenance(apiCanonical)).toEqual([]);
    expect(apiCanonical.every((observation) => observation.domain === "advertising")).toBe(true);
    expect(apiCanonical.every((observation) => observation.attributedRevenue !== null)).toBe(true);
    expect(apiCanonical.every((observation) => !("grossRevenue" in observation))).toBe(true);
  });

  it("surfaces a safe retryable failure without leaking the provider cause", async () => {
    const connector = new MockAdvertisingConnector(await mockFixture(), { failure: "retryable" });
    await expect(connector.fetch(connection(), request)).rejects.toEqual(
      expect.objectContaining({
        code: "PROVIDER_UNAVAILABLE",
        retryable: true,
        safeUserMessage: "The provider is temporarily unavailable. Try again later.",
      }),
    );
    await expect(connector.fetch(connection(), request)).rejects.not.toHaveProperty("cause");
  });

  it("blocks terminal authorization state before any provider page fetch", async () => {
    const connector = new MockAdvertisingConnector(await mockFixture());
    await expect(connector.fetch(connection("expired"), request)).rejects.toMatchObject({
      code: "AUTH_EXPIRED",
      retryable: false,
    });
    expect(connector.pageFetchCount).toBe(0);
  });

  it("blocks runaway pagination through the generic coordinator", async () => {
    const fixture = await mockFixture();
    const record = fixture.pages[0]?.records[0];
    if (!record) throw new Error("Expected a synthetic mock record.");
    const connector = new MockAdvertisingConnector({
      ...fixture,
      pages: [
        { records: [record], nextToken: "repeat" },
        { records: [record], nextToken: "repeat" },
      ],
    });

    await expect(connector.fetch(connection(), request)).rejects.toMatchObject({
      code: "PAGINATION_LIMIT_EXCEEDED",
      retryable: false,
    });
  });

  it("supports a terminal mock fixture without network access", async () => {
    const connector = new MockAdvertisingConnector(await mockFixture(), { failure: "terminal" });
    await expect(connector.fetch(connection(), request)).rejects.toBeInstanceOf(ConnectorFailure);
    await expect(connector.fetch(connection(), request)).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
      retryable: false,
    });
  });
});
