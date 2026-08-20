import type { Connection } from "./types";

export type ConnectorReadinessReason =
  | "connector_missing"
  | "connector_not_configured"
  | "connection_missing"
  | "connection_not_ready"
  | "account_selection_required"
  | "credential_reference_missing"
  | "reporting_fetch_unsupported";

export type ConnectorReadiness = {
  connectorExists: boolean;
  connectorConfigured: boolean;
  connectionReady: boolean;
  fetchPossible: boolean;
  reason: ConnectorReadinessReason | null;
};

export function assessConnectorReadiness(input: {
  connectorExists: boolean;
  connectorConfigured: boolean;
  connection?: Connection;
}): ConnectorReadiness {
  let reason: ConnectorReadinessReason | null = null;
  if (!input.connectorExists) reason = "connector_missing";
  else if (!input.connectorConfigured) reason = "connector_not_configured";
  else if (!input.connection) reason = "connection_missing";
  else if (input.connection.status !== "ready") reason = "connection_not_ready";
  else if (!input.connection.externalAccountId) reason = "account_selection_required";
  else if (!input.connection.credentialReference) reason = "credential_reference_missing";
  else if (!input.connection.capabilities.includes("reporting_fetch")) reason = "reporting_fetch_unsupported";

  const connectionReady = reason === null;
  return {
    connectorExists: input.connectorExists,
    connectorConfigured: input.connectorConfigured,
    connectionReady,
    fetchPossible: connectionReady,
    reason,
  };
}
