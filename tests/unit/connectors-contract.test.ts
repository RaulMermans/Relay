import { describe, expect, it } from "vitest";

import { selectExternalAccount } from "../../lib/connectors/account-selection";
import { canTransition, connectionStateDefinition } from "../../lib/connectors/lifecycle";
import { assessConnectorReadiness } from "../../lib/connectors/readiness";
import { CONNECTOR_REGISTRY } from "../../lib/connectors/registry";
import {
  externalAccountSchema,
  fetchRequestSchema,
  type Connection,
} from "../../lib/connectors/types";

const readyConnection: Connection = {
  provider: "meta_ads",
  status: "ready",
  externalAccountId: "act_1",
  externalAccountName: "Relay Demo",
  grantedScopes: ["reporting.read"],
  capabilities: ["account_discovery", "reporting_fetch", "date_range_fetch", "pagination"],
  connectedAt: "2026-08-12T08:00:00.000Z",
  credentialReference: "credential-ref-1",
};

describe("connector contract", () => {
  it("accepts only provider-neutral daily fetch intent", () => {
    expect(
      fetchRequestSchema.parse({
        provider: "meta_ads",
        externalAccountId: "act_1",
        dateRange: { start: "2026-07-01", end: "2026-07-31" },
        requestedGrain: "daily",
      }),
    ).toEqual({
      provider: "meta_ads",
      externalAccountId: "act_1",
      dateRange: { start: "2026-07-01", end: "2026-07-31" },
      requestedGrain: "daily",
    });

    expect(() =>
      fetchRequestSchema.parse({
        provider: "meta_ads",
        externalAccountId: "act_1",
        dateRange: { start: "2026-07-31", end: "2026-07-01" },
        requestedGrain: "campaign",
        providerFields: ["purchase_roas"],
      }),
    ).toThrow();
  });

  it("keeps optional account metadata provider-neutral", () => {
    expect(
      externalAccountSchema.parse({
        id: "act_1",
        name: "Relay Demo",
        status: "active",
        currency: "usd",
        timezone: "Europe/Madrid",
      }),
    ).toEqual({
      id: "act_1",
      name: "Relay Demo",
      status: "active",
      currency: "USD",
      timezone: "Europe/Madrid",
    });
    expect(() => externalAccountSchema.parse({ id: "act_1", name: "Relay", accessToken: "secret" })).toThrow();
  });

  it("allows only explicit lifecycle transitions and never converts a fetch outage into credential state", () => {
    expect(canTransition("not_connected", "authorization_required")).toBe(true);
    expect(canTransition("authorizing", "connected")).toBe(true);
    expect(canTransition("connected", "account_selection_required")).toBe(true);
    expect(canTransition("account_selection_required", "ready")).toBe(true);
    expect(canTransition("ready", "expired")).toBe(true);
    expect(canTransition("ready", "unavailable")).toBe(false);
    expect(canTransition("expired", "ready")).toBe(false);
  });

  it("defines fetch eligibility and user action for every lifecycle state", () => {
    expect(connectionStateDefinition.ready).toMatchObject({ fetchAllowed: true, userActionRequired: false });
    expect(connectionStateDefinition.account_selection_required).toMatchObject({
      fetchAllowed: false,
      userActionRequired: true,
    });
    expect(Object.keys(connectionStateDefinition)).toHaveLength(10);
  });

  it("selects only an account returned by server-side discovery", () => {
    const accounts = [
      { id: "act_1", name: "Relay Demo" },
      { id: "act_2", name: "Relay Sandbox" },
    ];

    expect(selectExternalAccount(accounts, "act_2")).toEqual(accounts[1]);
    expect(() => selectExternalAccount(accounts, "injected-account")).toThrowError(
      expect.objectContaining({ code: "ACCOUNT_NOT_FOUND" }),
    );
  });

  it("distinguishes connector existence, configuration, connection state, and fetch readiness", () => {
    expect(
      assessConnectorReadiness({
        connectorExists: true,
        connectorConfigured: true,
        connection: readyConnection,
      }),
    ).toEqual({
      connectorExists: true,
      connectorConfigured: true,
      connectionReady: true,
      fetchPossible: true,
      reason: null,
    });

    expect(
      assessConnectorReadiness({
        connectorExists: true,
        connectorConfigured: true,
        connection: { ...readyConnection, externalAccountId: undefined },
      }),
    ).toMatchObject({ connectionReady: false, fetchPossible: false, reason: "account_selection_required" });

    expect(
      assessConnectorReadiness({
        connectorExists: true,
        connectorConfigured: false,
        connection: readyConnection,
      }),
    ).toMatchObject({ connectionReady: false, fetchPossible: false, reason: "connector_not_configured" });
  });

  it("keeps credentials out of the analytical connection object", () => {
    expect(readyConnection).not.toHaveProperty("accessToken");
    expect(readyConnection).not.toHaveProperty("refreshToken");
    expect(readyConnection.credentialReference).toBe("credential-ref-1");
  });

  it("registers the Shopify adapter without pretending live configuration exists", () => {
    expect(CONNECTOR_REGISTRY).toEqual([
      expect.objectContaining({ provider: "shopify", frameworkStatus: "ready", implementationStatus: "implemented", configured: false, connector: null }),
      expect.objectContaining({ provider: "meta_ads", frameworkStatus: "ready", implementationStatus: "not_built", configured: false }),
      expect.objectContaining({ provider: "google_ads", frameworkStatus: "ready", implementationStatus: "not_built", configured: false }),
    ]);
    expect(CONNECTOR_REGISTRY.every((entry) => entry.connector === null)).toBe(true);
  });
});
