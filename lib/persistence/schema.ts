import { z } from "zod";

import { MAX_CHANGE_TARGETS, parseChangeTargetList } from "../change-intelligence/targets";
import type { ChangeTarget } from "../change-intelligence/types";
import type { RelayMemoryV1 } from "./types";

export const MEMORY_LIMITS = {
  clients: 50,
  historyPerClient: 52,
  targetsPerClient: MAX_CHANGE_TARGETS,
  mappingsPerClient: 128,
  notesPerClient: 20,
  noteCharacters: 500,
  serializedCharacters: 2_000_000,
} as const;

const idSchema = z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/);
const timestampSchema = z.string().datetime();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const decimalSchema = z.string().max(256).regex(/^-?\d+(?:\.\d+)?$/);
const providerSchema = z.enum(["meta_ads", "google_ads", "shopify"]);
const canonicalFieldSchema = z.enum([
  "date", "source_account_id", "source_account_name", "campaign_id", "campaign_name", "group_id", "group_name",
  "ad_id", "ad_name", "currency", "spend", "impressions", "clicks", "conversions", "attributed_revenue",
  "source_store_id", "source_store_name", "order_id", "gross_revenue", "net_revenue", "refunds", "customers", "new_customers",
]);
const metricSchema = z.enum([
  "spend", "commerce_revenue", "orders", "impressions", "clicks", "conversions", "attributed_revenue",
  "ctr", "cpc", "cpa", "roas", "mer", "aov", "conversion_rate",
]);
const unitSchema = z.enum(["currency", "count", "ratio"]);
const periodSchema = z.object({ start: dateSchema, end: dateSchema }).strict();
const resolvedPeriodSchema = z.object({ currentPeriod: periodSchema, comparisonPeriod: periodSchema }).strict();

const targetSchema = z.custom<ChangeTarget>((value) => {
  try {
    parseChangeTargetList([value]);
    return true;
  } catch {
    return false;
  }
}, "Invalid Change Intelligence target.");

const evidenceSchema = z.object({
  metric: metricSchema,
  scope: z.enum(["report", "source"]),
  source: providerSchema.optional(),
  unit: unitSchema,
  current: decimalSchema.nullable(),
  previous: decimalSchema.nullable(),
  absoluteChange: decimalSchema.nullable(),
  percentageChange: decimalSchema.nullable(),
}).strict();

const observationSchema = z.object({
  id: z.string().min(1).max(240),
  type: z.enum(["METRIC_CHANGE", "CPA_MOVEMENT", "ROAS_MOVEMENT", "MER_MOVEMENT", "COMMERCE_REVENUE_CHANGE", "ORDERS_CHANGE", "SPEND_REVENUE_DIVERGENCE", "SOURCE_EFFICIENCY_IMPROVEMENT", "SOURCE_EFFICIENCY_DETERIORATION", "TARGET_BREACH", "RULE_BASED_SIGNAL"]),
  metric: metricSchema,
  scope: z.enum(["report", "source"]),
  source: providerSchema.optional(),
  currentValue: decimalSchema.nullable(),
  previousValue: decimalSchema.nullable(),
  absoluteChange: decimalSchema.nullable().optional(),
  percentageChange: decimalSchema.nullable().optional(),
  direction: z.enum(["increased", "decreased", "unchanged", "unavailable"]),
  assessment: z.enum(["favorable", "unfavorable", "neutral", "context_required"]),
  significance: z.enum(["minor", "notable", "major", "unavailable"]),
  priority: z.number().int().min(0).max(1_000),
  evidence: z.array(evidenceSchema).max(20),
  target: targetSchema.optional(),
  signalCode: z.enum(["SPEND_OUTPACED_COMMERCE_REVENUE", "COMMERCE_REVENUE_OUTPACED_SPEND", "SPEND_UP_CONVERSIONS_DOWN", "SPEND_UP_ATTRIBUTED_REVENUE_DOWN", "COMMERCE_REVENUE_UP_ORDERS_DOWN", "CLICKS_UP_CONVERSIONS_DOWN"]).optional(),
}).strict();

const targetEvaluationSchema = z.object({
  target: targetSchema,
  status: z.enum(["met", "breached", "unavailable"]),
  actualValue: decimalSchema.nullable(),
  evidence: z.array(evidenceSchema).max(20),
  unavailableReason: z.enum(["METRIC_UNAVAILABLE", "UNIT_INCOMPATIBLE", "CURRENCY_INCOMPATIBLE"]).optional(),
}).strict();

const safeEvidenceValueSchema = z.union([
  z.string().max(500),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(120)).max(32),
]);
const findingSchema = z.object({
  id: z.string().min(1).max(300),
  code: z.string().min(1).max(120),
  category: z.enum(["structure", "mapping", "dates", "currency", "duplicates", "provenance", "source_coverage", "reconciliation"]),
  severity: z.enum(["info", "warning", "error"]),
  status: z.literal("open"),
  source: providerSchema.optional(),
  field: z.string().max(120).optional(),
  period: periodSchema.optional(),
  message: z.string().min(1).max(1_000),
  evidence: z.record(z.string().max(120), safeEvidenceValueSchema),
  blocking: z.boolean(),
}).strict();
const sourceCoverageSchema = z.object({
  source: providerSchema,
  status: z.enum(["ready", "review", "blocked", "missing"]),
  observationCount: z.number().int().nonnegative().max(50_000),
  currentPeriodObservationCount: z.number().int().nonnegative().max(50_000),
  start: dateSchema.nullable(),
  end: dateSchema.nullable(),
  currencies: z.array(z.string().regex(/^[A-Z]{3}$/)).max(16),
}).strict();
const dataHealthSchema = z.object({
  status: z.enum(["healthy", "review_required", "blocked"]),
  counts: z.object({ info: z.number().int().nonnegative(), warning: z.number().int().nonnegative(), error: z.number().int().nonnegative() }).strict(),
  checksRun: z.array(z.string().min(1).max(120)).max(64),
  findings: z.array(findingSchema).max(64),
  sourceCoverage: z.array(sourceCoverageSchema).max(3),
  reportingPeriod: resolvedPeriodSchema,
}).strict();

const kpiInputSchema = z.object({
  source: providerSchema,
  field: z.string().min(1).max(120),
  period: z.enum(["current", "comparison"]),
  observationCount: z.number().int().nonnegative().max(50_000),
  currencyCode: z.string().regex(/^[A-Z]{3}$/).optional(),
}).strict();
const comparisonSchema = z.object({
  current: decimalSchema.nullable(),
  previous: decimalSchema.nullable(),
  absoluteChange: decimalSchema.nullable(),
  percentageChange: decimalSchema.nullable(),
}).strict();
const metricResultSchema = z.object({
  key: metricSchema,
  value: decimalSchema.nullable(),
  unit: unitSchema,
  status: z.enum(["available", "unavailable"]),
  unavailableReason: z.enum(["INPUT_UNAVAILABLE", "ZERO_DENOMINATOR", "CURRENCY_INCOMPATIBLE", "INVALID_INPUT"]).optional(),
  inputs: z.array(kpiInputSchema).max(64),
  formula: z.string().min(1).max(500),
  comparison: comparisonSchema,
}).strict();
const sourceBreakdownSchema = z.object({ source: providerSchema, metrics: z.array(metricResultSchema).max(20) }).strict();
const kpiReadySchema = z.object({
  status: z.literal("ready"),
  period: resolvedPeriodSchema,
  metrics: z.array(metricResultSchema).max(20),
  sourceBreakdown: z.array(sourceBreakdownSchema).max(3),
  warnings: z.array(z.object({ code: z.literal("INVALID_DECIMAL_INPUT"), message: z.string().max(500), source: providerSchema.optional() }).strict()).max(20).optional(),
}).strict();
const kpiBlockedSchema = z.object({
  status: z.literal("blocked"),
  code: z.literal("DATA_HEALTH_BLOCKED"),
  message: z.literal("KPI execution is unavailable because Data Health is blocked."),
  period: resolvedPeriodSchema,
  metrics: z.tuple([]),
  sourceBreakdown: z.tuple([]),
}).strict();

const sourceSummarySchema = z.object({
  source: providerSchema,
  status: z.enum(["ready", "review", "blocked", "missing"]),
  normalizedRowCount: z.number().int().nonnegative().max(50_000),
  dateRange: periodSchema,
  currencies: z.array(z.string().regex(/^[A-Z]{3}$/)).max(16),
}).strict();
const trendPointSchema = z.object({ date: dateSchema, paidSpend: decimalSchema.nullable(), commerceRevenue: decimalSchema.nullable() }).strict();
const sourceFreshnessSchema = z.object({ source: providerSchema, dataThrough: dateSchema, observationCount: z.number().int().nonnegative().max(50_000) }).strict();
const snapshotSchema = z.object({
  id: idSchema,
  analyzedAt: timestampSchema,
  reportingPeriod: resolvedPeriodSchema,
  sourceFreshness: z.array(sourceFreshnessSchema).max(3),
  sources: z.array(sourceSummarySchema).max(3),
  dataHealth: dataHealthSchema,
  kpis: z.discriminatedUnion("status", [kpiReadySchema, kpiBlockedSchema]),
  changeIntelligence: z.object({
    status: z.enum(["ready", "blocked"]),
    observations: z.array(observationSchema).max(12),
    targetEvaluations: z.array(targetEvaluationSchema).max(MEMORY_LIMITS.targetsPerClient),
  }).strict(),
  trend: z.array(trendPointSchema).max(370),
}).strict();

const reportCycleSchema = z.object({
  id: idSchema,
  period: resolvedPeriodSchema,
  analyzedAt: timestampSchema,
  sources: z.array(providerSchema).max(3),
  healthStatus: z.enum(["healthy", "review_required", "blocked"]),
  headlineKpis: z.array(z.object({ key: metricSchema, value: decimalSchema.nullable(), unit: unitSchema }).strict()).max(4),
  highlightObservationIds: z.array(z.string().min(1).max(240)).max(4),
}).strict();

const sourceConfigSchema = z.object({ expected: z.boolean(), preferredTransport: z.literal("csv") }).strict();
const clientSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(80),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  reporting: z.object({
    cadence: z.enum(["weekly", "monthly"]),
    comparisonMode: z.literal("previous_equal_period"),
    preferredPeriodLength: z.number().int().min(1).max(366).optional(),
  }).strict(),
  sources: z.object({ meta_ads: sourceConfigSchema, google_ads: sourceConfigSchema, shopify: sourceConfigSchema }).strict(),
  targets: z.array(targetSchema).max(MEMORY_LIMITS.targetsPerClient).refine((items) => new Set(items.map((item) => item.id)).size === items.length),
  sourceOfTruth: z.object({
    commerceRevenueSource: z.literal("shopify"),
    advertisingAttribution: z.object({ meta_ads: z.literal("provider_attribution"), google_ads: z.literal("provider_attribution") }).strict(),
  }).strict(),
  attributionNotes: z.array(z.object({ id: idSchema, text: z.string().trim().min(1).max(MEMORY_LIMITS.noteCharacters), updatedAt: timestampSchema }).strict()).max(MEMORY_LIMITS.notesPerClient),
  mappingMemory: z.array(z.object({
    provider: providerSchema,
    header: z.string().trim().min(1).max(256),
    canonicalField: canonicalFieldSchema.nullable(),
    origin: z.enum(["catalog", "manual_current_session"]),
    updatedAt: timestampSchema,
  }).strict()).max(MEMORY_LIMITS.mappingsPerClient).refine((items) => new Set(items.map((item) => `${item.provider}:${item.header.toLocaleLowerCase("en-US")}`)).size === items.length),
  reportPreferences: z.object({ sections: z.array(z.enum(["performance", "what_changed", "channels", "attention", "methodology"])).min(1).max(5).refine((items) => new Set(items).size === items.length) }).strict(),
  latestAnalysisSnapshot: snapshotSchema.optional(),
  reportHistory: z.array(reportCycleSchema).max(MEMORY_LIMITS.historyPerClient),
  workflow: z.object({
    firstSetupStartedAt: timestampSchema.optional(),
    firstAnalysisAt: timestampSchema.optional(),
    lastCycleStartedAt: timestampSchema.optional(),
    mappingReuseCount: z.number().int().nonnegative().max(1_000_000),
    mappingEligibleCount: z.number().int().nonnegative().max(1_000_000),
    dashboardReturnCount: z.number().int().nonnegative().max(1_000_000),
  }).strict(),
}).strict();

export const relayMemorySchema = z.object({
  version: z.literal(1),
  activeClientId: idSchema.optional(),
  clients: z.array(clientSchema).max(MEMORY_LIMITS.clients),
}).strict()
  .refine((memory) => new Set(memory.clients.map((client) => client.id)).size === memory.clients.length, "Client IDs must be unique.")
  .refine((memory) => !memory.activeClientId || memory.clients.some((client) => client.id === memory.activeClientId), "Active client must exist.");

export function migrateRelayMemory(input: unknown): unknown {
  if (typeof input !== "object" || input === null || !("version" in input)) return input;
  if ((input as { version?: unknown }).version === 1) return input;
  throw new Error("UNSUPPORTED_MEMORY_VERSION");
}

function containsDangerousObjectKey(input: unknown): boolean {
  if (Array.isArray(input)) return input.some(containsDangerousObjectKey);
  if (typeof input !== "object" || input === null) return false;
  for (const [key, value] of Object.entries(input)) {
    if (key === "__proto__" || key === "prototype" || key === "constructor") return true;
    if (containsDangerousObjectKey(value)) return true;
  }
  return false;
}

export function parseRelayMemory(input: unknown): RelayMemoryV1 {
  if (containsDangerousObjectKey(input)) throw new Error("UNSAFE_MEMORY_KEY");
  return relayMemorySchema.parse(migrateRelayMemory(input)) as RelayMemoryV1;
}
