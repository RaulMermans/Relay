import { z } from "zod";

const accountIdSchema = z.string().max(44).regex(/^act_\d+$/);
const numericIdSchema = z.string().max(40).regex(/^\d+$/);
const currencySchema = z.string().regex(/^[A-Z]{3}$/);
const decimalSchema = z.string().max(256).regex(/^-?\d+(?:\.\d+)?$/);
const countSchema = z.string().max(256).regex(/^\d+(?:\.\d+)?$/);
const calendarDateSchema = z.string().refine((value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
});

function validTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

const graphPagingSchema = z.object({
  cursors: z.object({
    before: z.string().min(1).max(2_048).optional(),
    after: z.string().min(1).max(2_048).optional(),
  }).passthrough().optional(),
  next: z.string().min(1).max(2_048).optional(),
  previous: z.string().min(1).max(2_048).optional(),
}).passthrough().superRefine((paging, context) => {
  if (paging.next && !paging.cursors?.after) {
    context.addIssue({ code: "custom", message: "Graph continuation requires an after cursor." });
  }
});

const accountSchema = z.object({
  id: accountIdSchema,
  account_id: numericIdSchema,
  name: z.string().trim().min(1).max(500),
  currency: currencySchema,
  timezone_name: z.string().trim().min(1).refine(validTimeZone),
  account_status: z.number().int().nonnegative(),
}).strict().refine((account) => account.id === `act_${account.account_id}`);

const actionStatsSchema = z.object({
  action_type: z.string().trim().min(1).max(120),
  value: countSchema,
}).passthrough();

const actionValueStatsSchema = actionStatsSchema.extend({ value: decimalSchema });

const insightRecordSchema = z.object({
  date_start: calendarDateSchema,
  date_stop: calendarDateSchema,
  account_id: numericIdSchema,
  account_name: z.string().trim().min(1).max(500),
  account_currency: currencySchema,
  campaign_id: numericIdSchema,
  campaign_name: z.string().trim().min(1).max(500),
  adset_id: numericIdSchema,
  adset_name: z.string().trim().min(1).max(500),
  ad_id: numericIdSchema,
  ad_name: z.string().trim().min(1).max(500),
  spend: decimalSchema,
  impressions: countSchema,
  inline_link_clicks: countSchema,
  actions: z.array(actionStatsSchema).max(100).optional(),
  action_values: z.array(actionValueStatsSchema).max(100).optional(),
}).strict();

const accountsResponseSchema = z.object({
  data: z.array(accountSchema).max(100),
  paging: graphPagingSchema.optional(),
}).strict();

const insightsResponseSchema = z.object({
  data: z.array(insightRecordSchema).max(100),
  paging: graphPagingSchema.optional(),
}).strict();

const graphErrorSchema = z.object({
  message: z.string().optional(),
  type: z.string().optional(),
  code: z.number().int().optional(),
  error_subcode: z.number().int().optional(),
  is_transient: z.boolean().optional(),
  fbtrace_id: z.string().optional(),
}).passthrough();

const graphErrorEnvelopeSchema = z.object({ error: graphErrorSchema }).passthrough();

export type MetaAccount = z.infer<typeof accountSchema>;
export type MetaActionStats = z.infer<typeof actionStatsSchema>;
export type MetaInsightRecord = z.infer<typeof insightRecordSchema>;
export type MetaAccountsResponse = z.infer<typeof accountsResponseSchema>;
export type MetaInsightsResponse = z.infer<typeof insightsResponseSchema>;
export type MetaGraphError = z.infer<typeof graphErrorSchema>;

export function parseMetaAccountsResponse(input: unknown): MetaAccountsResponse {
  return accountsResponseSchema.parse(input);
}

export function parseMetaInsightsResponse(input: unknown): MetaInsightsResponse {
  return insightsResponseSchema.parse(input);
}

export function parseMetaGraphError(input: unknown): MetaGraphError | null {
  const parsed = graphErrorEnvelopeSchema.safeParse(input);
  return parsed.success ? parsed.data.error : null;
}
