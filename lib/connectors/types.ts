import { z } from "zod";

import type { ProviderSource } from "../mapping/types";

export type Provider = ProviderSource;

export const CONNECTION_STATUSES = [
  "not_connected",
  "authorization_required",
  "authorizing",
  "connected",
  "account_selection_required",
  "ready",
  "expired",
  "permission_error",
  "disconnected",
  "unavailable",
] as const;

export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export const CONNECTOR_CAPABILITIES = [
  "account_discovery",
  "reporting_fetch",
  "date_range_fetch",
  "pagination",
] as const;

export type ConnectorCapability = (typeof CONNECTOR_CAPABILITIES)[number];

export type Connection = {
  provider: Provider;
  status: ConnectionStatus;
  externalAccountId?: string;
  externalAccountName?: string;
  grantedScopes: string[];
  connectedAt?: string;
  lastSuccessfulFetchAt?: string;
  capabilities: ConnectorCapability[];
  credentialReference?: string;
};

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
  );
}

const canonicalDateSchema = z.string().refine(isCalendarDate, "Expected an ISO calendar date.");

export const dateRangeSchema = z
  .object({
    start: canonicalDateSchema,
    end: canonicalDateSchema,
  })
  .strict()
  .refine(({ start, end }) => start <= end, { message: "Date range start must not be after end." });

export type ConnectorDateRange = z.infer<typeof dateRangeSchema>;

export const externalAccountSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    status: z.string().trim().min(1).optional(),
    currency: z
      .string()
      .regex(/^[A-Za-z]{3}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    timezone: z.string().trim().min(1).optional(),
  })
  .strict();

export type ExternalAccount = z.infer<typeof externalAccountSchema>;

export const fetchRequestSchema = z
  .object({
    provider: z.enum(["meta_ads", "google_ads", "shopify"]),
    externalAccountId: z.string().trim().min(1),
    dateRange: dateRangeSchema,
    requestedGrain: z.literal("daily"),
  })
  .strict();

export type FetchRequest = z.infer<typeof fetchRequestSchema>;

export type ProviderFetchProvenance = {
  transport: "api";
  provider: Provider;
  externalAccountId: string;
  fetchRequestId: string;
  dateRange: ConnectorDateRange;
};

export type ProviderFetchResult<RecordType = unknown> = {
  provider: Provider;
  externalAccount: ExternalAccount;
  dateRange: ConnectorDateRange;
  pagesFetched: number;
  records: RecordType[];
  provenance: ProviderFetchProvenance;
  warnings: string[];
};

export interface Connector<RecordType = unknown> {
  readonly provider: Provider;
  getConnectionStatus(connection: Connection): Promise<ConnectionStatus>;
  discoverAccounts(connection: Connection): Promise<ExternalAccount[]>;
  fetch(connection: Connection, request: FetchRequest): Promise<ProviderFetchResult<RecordType>>;
}
