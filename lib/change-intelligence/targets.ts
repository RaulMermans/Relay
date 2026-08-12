import type { ProviderSource } from "../data-health/types";
import { compare, isValidDecimal } from "../kpi/arithmetic";
import type { KpiMetricKey, KpiMetricResult, KpiResult, KpiUnit } from "../kpi/types";
import type { ChangeEvidence, ChangeScope, ChangeTarget, TargetEvaluation, TargetOperator } from "./types";

const MAX_TARGET_INPUT_CHARACTERS = 8_192;
const MAX_TARGETS = 10;
const TARGET_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const METRICS = new Set<KpiMetricKey>([
  "spend", "commerce_revenue", "orders", "impressions", "clicks", "conversions",
  "attributed_revenue", "ctr", "cpc", "cpa", "roas", "mer", "aov", "conversion_rate",
]);
const UNITS = new Set<KpiUnit>(["currency", "count", "ratio"]);
const OPERATORS = new Set<TargetOperator>([">", ">=", "<", "<="]);
const SOURCES = new Set<ProviderSource>(["meta_ads", "google_ads", "shopify"]);
const REPORT_METRICS = new Set<KpiMetricKey>([
  "spend", "commerce_revenue", "orders", "impressions", "clicks", "conversions",
  "ctr", "cpc", "cpa", "mer", "aov", "conversion_rate",
]);
const ADVERTISING_SOURCE_METRICS = new Set<KpiMetricKey>([
  "spend", "impressions", "clicks", "conversions", "attributed_revenue", "ctr", "cpc", "cpa", "roas", "conversion_rate",
]);
const SHOPIFY_SOURCE_METRICS = new Set<KpiMetricKey>(["commerce_revenue", "orders", "aov"]);
const TARGET_KEYS = new Set(["id", "metric", "scope", "source", "operator", "value", "unit", "currencyCode"]);

export class ChangeIntelligenceInputError extends Error {
  readonly code = "INVALID_CHANGE_INTELLIGENCE_TARGETS" as const;

  constructor() {
    super("The Change Intelligence target request is invalid.");
    this.name = "ChangeIntelligenceInputError";
  }
}

function invalid(): never {
  throw new ChangeIntelligenceInputError();
}

function targetSupported(metric: KpiMetricKey, scope: ChangeScope, source?: ProviderSource): boolean {
  if (scope === "report") return REPORT_METRICS.has(metric);
  return source === "shopify" ? SHOPIFY_SOURCE_METRICS.has(metric) : ADVERTISING_SOURCE_METRICS.has(metric);
}

function parseTarget(value: unknown): ChangeTarget {
  if (typeof value !== "object" || value === null || Array.isArray(value)) invalid();
  const item = value as Record<string, unknown>;
  if (Object.keys(item).some((key) => !TARGET_KEYS.has(key))) invalid();
  if (typeof item.id !== "string" || !TARGET_ID_PATTERN.test(item.id)) invalid();
  if (typeof item.metric !== "string" || !METRICS.has(item.metric as KpiMetricKey)) invalid();
  if (item.scope !== "report" && item.scope !== "source") invalid();
  if (typeof item.operator !== "string" || !OPERATORS.has(item.operator as TargetOperator)) invalid();
  if (typeof item.value !== "string" || !isValidDecimal(item.value)) invalid();
  if (typeof item.unit !== "string" || !UNITS.has(item.unit as KpiUnit)) invalid();

  const source = item.source;
  if (item.scope === "source") {
    if (typeof source !== "string" || !SOURCES.has(source as ProviderSource)) invalid();
  } else if (source !== undefined) invalid();

  const currencyCode = item.currencyCode;
  if (item.unit === "currency") {
    if (typeof currencyCode !== "string" || !CURRENCY_PATTERN.test(currencyCode)) invalid();
  } else if (currencyCode !== undefined) invalid();

  const metric = item.metric as KpiMetricKey;
  const typedSource = source as ProviderSource | undefined;
  if (!targetSupported(metric, item.scope, typedSource)) invalid();
  return {
    id: item.id,
    metric,
    scope: item.scope,
    ...(typedSource ? { source: typedSource } : {}),
    operator: item.operator as TargetOperator,
    value: item.value,
    unit: item.unit as KpiUnit,
    ...(typeof currencyCode === "string" ? { currencyCode } : {}),
  };
}

export function parseChangeTargets(value: unknown): ChangeTarget[] {
  if (value === null || value === undefined || value === "") return [];
  if (typeof value !== "string" || value.length > MAX_TARGET_INPUT_CHARACTERS) invalid();
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    invalid();
  }
  if (!Array.isArray(parsed) || parsed.length > MAX_TARGETS) invalid();
  const targets = parsed.map(parseTarget);
  if (new Set(targets.map((target) => target.id)).size !== targets.length) invalid();
  return targets;
}

function findMetric(kpis: KpiResult, target: ChangeTarget): KpiMetricResult | undefined {
  if (target.scope === "report") return kpis.metrics.find((metric) => metric.key === target.metric);
  return kpis.sourceBreakdown
    .find((breakdown) => breakdown.source === target.source)
    ?.metrics.find((metric) => metric.key === target.metric);
}

function targetEvidence(metric: KpiMetricResult, target: ChangeTarget): ChangeEvidence {
  return {
    metric: metric.key,
    scope: target.scope,
    ...(target.source ? { source: target.source } : {}),
    unit: metric.unit,
    current: metric.comparison.current,
    previous: metric.comparison.previous,
    absoluteChange: metric.comparison.absoluteChange,
    percentageChange: metric.comparison.percentageChange,
  };
}

function currentCurrency(metric: KpiMetricResult): string | null {
  const currencies = new Set(metric.inputs.filter((input) => input.period === "current").map((input) => input.currencyCode).filter((value): value is string => Boolean(value)));
  return currencies.size === 1 ? [...currencies][0]! : null;
}

function targetMet(actual: string, operator: TargetOperator, target: string): boolean {
  const order = compare(actual, target);
  switch (operator) {
    case ">": return order > 0;
    case ">=": return order >= 0;
    case "<": return order < 0;
    case "<=": return order <= 0;
  }
}

export function evaluateTargets(kpis: KpiResult, targets: ChangeTarget[]): TargetEvaluation[] {
  return targets.map((target) => {
    const metric = findMetric(kpis, target);
    if (!metric || metric.status === "unavailable" || metric.value === null) {
      return { target, status: "unavailable", actualValue: null, evidence: [], unavailableReason: "METRIC_UNAVAILABLE" };
    }
    const evidence = [targetEvidence(metric, target)];
    if (metric.unit !== target.unit) {
      return { target, status: "unavailable", actualValue: metric.value, evidence, unavailableReason: "UNIT_INCOMPATIBLE" };
    }
    if (target.unit === "currency" && currentCurrency(metric) !== target.currencyCode) {
      return { target, status: "unavailable", actualValue: metric.value, evidence, unavailableReason: "CURRENCY_INCOMPATIBLE" };
    }
    return {
      target,
      status: targetMet(metric.value, target.operator, target.value) ? "met" : "breached",
      actualValue: metric.value,
      evidence,
    };
  });
}
