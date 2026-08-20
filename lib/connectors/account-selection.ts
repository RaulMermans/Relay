import type { ExternalAccount } from "./types";

export class AccountSelectionError extends Error {
  readonly code = "ACCOUNT_NOT_FOUND";

  constructor() {
    super("The selected provider account is not available to this connection.");
    this.name = "AccountSelectionError";
  }
}

export function selectExternalAccount(
  discoveredAccounts: readonly ExternalAccount[],
  externalAccountId: string,
): ExternalAccount {
  const selected = discoveredAccounts.find((account) => account.id === externalAccountId);
  if (!selected) throw new AccountSelectionError();
  return selected;
}
