import { z } from "zod";

const customerIdSchema = z.string().regex(/^\d{10}$/);
const resourceNameSchema = z.string().regex(/^customers\/\d{10}$/);
const currencySchema = z.string().regex(/^[A-Z]{3}$/);
const calendarDateSchema = z.string().refine((value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
});
const int64Schema = z.string().max(40).regex(/^\d+$/);
const decimalStringSchema = z.string().max(256).regex(/^-?\d+(?:\.\d+)?$/);
const providerDecimalSchema = z.union([decimalStringSchema, z.number().finite()]);

function validTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

const customerStatusSchema = z.enum(["ENABLED", "CANCELED", "CLOSED", "SUSPENDED", "UNKNOWN", "UNSPECIFIED"]);

const customerSchema = z.object({
  resourceName: resourceNameSchema,
  id: customerIdSchema,
  descriptiveName: z.string().trim().min(1).max(500),
  currencyCode: currencySchema,
  timeZone: z.string().trim().min(1).max(120).refine(validTimeZone),
  status: customerStatusSchema,
  manager: z.boolean(),
  testAccount: z.boolean().optional(),
}).strict().refine((customer) => customer.resourceName === `customers/${customer.id}`);

const customerClientSchema = z.object({
  clientCustomer: resourceNameSchema,
  id: customerIdSchema,
  descriptiveName: z.string().trim().min(1).max(500),
  currencyCode: currencySchema,
  timeZone: z.string().trim().min(1).max(120).refine(validTimeZone),
  status: customerStatusSchema,
  manager: z.boolean(),
  level: int64Schema,
  testAccount: z.boolean().optional(),
}).strict().refine((customer) => customer.clientCustomer === `customers/${customer.id}`);

const reportRowSchema = z.object({
  customer: z.object({
    id: customerIdSchema,
    descriptiveName: z.string().trim().min(1).max(500),
    currencyCode: currencySchema,
    timeZone: z.string().trim().min(1).max(120).refine(validTimeZone),
  }).strict(),
  campaign: z.object({ id: int64Schema, name: z.string().trim().min(1).max(500) }).strict(),
  adGroup: z.object({ id: int64Schema, name: z.string().trim().min(1).max(500) }).strict(),
  segments: z.object({ date: calendarDateSchema }).strict(),
  metrics: z.object({
    costMicros: int64Schema.optional(),
    impressions: int64Schema.optional(),
    clicks: int64Schema.optional(),
    conversions: providerDecimalSchema.optional(),
    conversionsValue: providerDecimalSchema.optional(),
  }).strict().refine((metrics) => Object.keys(metrics).length > 0),
}).strict();

function searchResponseSchema<Row extends z.ZodType>(row: Row) {
  return z.object({
    results: z.array(row).max(10_000).default([]),
    nextPageToken: z.string().min(1).max(2_048).optional(),
    totalResultsCount: int64Schema.optional(),
    fieldMask: z.string().max(4_096).optional(),
  }).passthrough();
}

const customerResponseSchema = searchResponseSchema(z.object({ customer: customerSchema }).strict());
const customerClientResponseSchema = searchResponseSchema(z.object({ customerClient: customerClientSchema }).strict());
const reportResponseSchema = searchResponseSchema(reportRowSchema);

const accessibleCustomersSchema = z.object({
  resourceNames: z.array(resourceNameSchema).max(1_000),
}).strict();

const googleAdsFailureSchema = z.object({
  error: z.object({
    code: z.number().int().optional(),
    message: z.string().optional(),
    status: z.string().optional(),
    details: z.array(z.object({
      "@type": z.string().optional(),
      errors: z.array(z.object({
        errorCode: z.record(z.string(), z.string()).optional(),
        message: z.string().optional(),
      }).passthrough()).optional(),
      requestId: z.string().optional(),
    }).passthrough()).optional(),
  }).passthrough(),
}).passthrough();

export type GoogleAdsCustomer = z.infer<typeof customerSchema>;
export type GoogleAdsCustomerClient = z.infer<typeof customerClientSchema>;
export type GoogleAdsReportRow = z.infer<typeof reportRowSchema>;
export type GoogleAdsFailure = z.infer<typeof googleAdsFailureSchema>["error"];

export function parseAccessibleCustomers(input: unknown): z.infer<typeof accessibleCustomersSchema> {
  return accessibleCustomersSchema.parse(input);
}

export function parseGoogleAdsSearchResponse(input: unknown, kind: "customer"): z.infer<typeof customerResponseSchema>;
export function parseGoogleAdsSearchResponse(input: unknown, kind: "customer_client"): z.infer<typeof customerClientResponseSchema>;
export function parseGoogleAdsSearchResponse(input: unknown, kind: "report"): z.infer<typeof reportResponseSchema>;
export function parseGoogleAdsSearchResponse(input: unknown, kind: "customer" | "customer_client" | "report") {
  if (kind === "customer") return customerResponseSchema.parse(input);
  if (kind === "customer_client") return customerClientResponseSchema.parse(input);
  return reportResponseSchema.parse(input);
}

export function parseGoogleAdsFailure(input: unknown): GoogleAdsFailure | null {
  const parsed = googleAdsFailureSchema.safeParse(input);
  return parsed.success ? parsed.data.error : null;
}
