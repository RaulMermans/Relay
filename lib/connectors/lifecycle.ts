import type { ConnectionStatus } from "./types";

type ConnectionStateDefinition = {
  meaning: string;
  allowedNext: readonly ConnectionStatus[];
  fetchAllowed: boolean;
  userActionRequired: boolean;
};

export const connectionStateDefinition: Record<ConnectionStatus, ConnectionStateDefinition> = {
  not_connected: {
    meaning: "No authorization session or connection exists.",
    allowedNext: ["authorization_required"],
    fetchAllowed: false,
    userActionRequired: true,
  },
  authorization_required: {
    meaning: "The user must begin or repeat provider authorization.",
    allowedNext: ["authorizing", "disconnected"],
    fetchAllowed: false,
    userActionRequired: true,
  },
  authorizing: {
    meaning: "A server-side authorization exchange is in progress.",
    allowedNext: ["connected", "authorization_required", "permission_error", "unavailable"],
    fetchAllowed: false,
    userActionRequired: false,
  },
  connected: {
    meaning: "Authorization is valid but fetch readiness has not been established.",
    allowedNext: ["account_selection_required", "ready", "expired", "permission_error", "disconnected"],
    fetchAllowed: false,
    userActionRequired: false,
  },
  account_selection_required: {
    meaning: "Authorization is valid and one discovered account must be selected.",
    allowedNext: ["ready", "expired", "permission_error", "disconnected"],
    fetchAllowed: false,
    userActionRequired: true,
  },
  ready: {
    meaning: "Authorization, validated account selection, and reporting capability permit fetch.",
    allowedNext: ["expired", "permission_error", "account_selection_required", "disconnected"],
    fetchAllowed: true,
    userActionRequired: false,
  },
  expired: {
    meaning: "Credential material is no longer valid and reauthorization is required.",
    allowedNext: ["authorization_required", "disconnected"],
    fetchAllowed: false,
    userActionRequired: true,
  },
  permission_error: {
    meaning: "Authorization lacks required read-only reporting permission.",
    allowedNext: ["authorization_required", "disconnected"],
    fetchAllowed: false,
    userActionRequired: true,
  },
  disconnected: {
    meaning: "The connection was explicitly disconnected or revoked.",
    allowedNext: ["authorization_required", "not_connected"],
    fetchAllowed: false,
    userActionRequired: true,
  },
  unavailable: {
    meaning: "The connector cannot currently complete authorization or configuration.",
    allowedNext: ["authorization_required", "not_connected"],
    fetchAllowed: false,
    userActionRequired: false,
  },
};

export function canTransition(from: ConnectionStatus, to: ConnectionStatus): boolean {
  return connectionStateDefinition[from].allowedNext.includes(to);
}
