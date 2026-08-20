import { dateInRange } from "../data-health/reporting-period";
import type { ProviderSource } from "../data-health/types";
import { add, compare, divide, isValidDecimal, subtract } from "./arithmetic";
import type {
  KpiComparison,
  KpiExecutionResult,
  KpiInput,
  KpiInputReference,
  KpiMetricKey,
  KpiMetricResult,
  KpiSourceBreakdown,
  KpiUnavailableReason,
  KpiUnit,
} from "./types";

type Period = "current" | "comparison";
type Aggregate = {
  value: string | null;
  reason?: KpiUnavailableReason;
  inputs: KpiInputReference[];
  currencyCode?: string;
};
type ObservationField = "spend" | "impressions" | "clicks" | "conversions" | "attributedRevenue" | "grossRevenue" | "orders";
type AggregateOptions = {
  period: Period;
  field: ObservationField;
  sources?: ProviderSource[];
  monetary?: boolean;
};

const ADVERTISING_SOURCES: ProviderSource[] = ["meta_ads", "google_ads"];
const PROVIDER_ORDER: ProviderSource[] = ["meta_ads", "google_ads", "shopify"];

function observationValue(observation: KpiInput["observations"][number], field: ObservationField): string | null | undefined {
  switch (field) {
    case "spend": return observation.domain === "advertising" ? observation.spend : undefined;
    case "impressions": return observation.domain === "advertising" ? observation.impressions : undefined;
    case "clicks": return observation.domain === "advertising" ? observation.clicks : undefined;
    case "conversions": return observation.domain === "advertising" ? observation.conversions : undefined;
    case "attributedRevenue": return observation.domain === "advertising" ? observation.attributedRevenue : undefined;
    case "grossRevenue": return observation.domain === "commerce" ? observation.grossRevenue : undefined;
    case "orders": return observation.domain === "commerce" ? observation.orders : undefined;
  }
}

function observationsForPeriod(input: KpiInput, period: Period) {
  const range = period === "current" ? input.reportingPeriod.currentPeriod : input.reportingPeriod.comparisonPeriod;
  return input.observations.filter((observation) => dateInRange(observation.date, range));
}

function aggregate(input: KpiInput, options: AggregateOptions): Aggregate {
  const values = observationsForPeriod(input, options.period)
    .filter((observation) => !options.sources || options.sources.includes(observation.source))
    .map((observation) => ({ observation, value: observationValue(observation, options.field) }))
    .filter((item) => item.value !== undefined);
  const applicable = values.filter((item) => item.value !== null);
  if (applicable.length === 0) return { value: null, reason: "INPUT_UNAVAILABLE", inputs: [] };

  if (options.monetary) {
    const currencies = new Set(applicable.map(({ observation }) => observation.currencyCode).filter((currency): currency is string => Boolean(currency)));
    if (currencies.size !== 1 || applicable.some(({ observation }) => !observation.currencyCode)) {
      return { value: null, reason: "CURRENCY_INCOMPATIBLE", inputs: [] };
    }
  }

  let total = "0";
  for (const item of applicable) {
    const value = item.value;
    if (typeof value !== "string" || !isValidDecimal(value)) {
      return { value: null, reason: "INVALID_INPUT", inputs: [] };
    }
    total = add(total, value);
  }

  const inputCounts = new Map<string, number>();
  for (const { observation } of applicable) {
    const currency = options.monetary ? observation.currencyCode ?? undefined : undefined;
    const key = `${observation.source}:${options.field}:${currency ?? ""}`;
    inputCounts.set(key, (inputCounts.get(key) ?? 0) + 1);
  }
  const inputs = [...inputCounts.entries()].map(([key, observationCount]) => {
    const [source, field, currencyCode] = key.split(":");
    return {
      source: source as ProviderSource,
      field,
      period: options.period,
      observationCount,
      ...(currencyCode ? { currencyCode } : {}),
    };
  });
  const currencyCode = options.monetary ? inputs[0]?.currencyCode : undefined;
  return { value: total, inputs, ...(currencyCode ? { currencyCode } : {}) };
}

function combineInputs(...aggregates: Aggregate[]): KpiInputReference[] {
  return aggregates.flatMap((aggregate) => aggregate.inputs);
}

function comparison(current: Aggregate, previous: Aggregate): KpiComparison {
  if (current.value === null || previous.value === null) {
    return { current: current.value, previous: previous.value, absoluteChange: null, percentageChange: null };
  }
  if (current.currencyCode && previous.currencyCode && current.currencyCode !== previous.currencyCode) {
    return { current: current.value, previous: previous.value, absoluteChange: null, percentageChange: null };
  }
  const absoluteChange = subtract(current.value, previous.value);
  return {
    current: current.value,
    previous: previous.value,
    absoluteChange,
    percentageChange: compare(previous.value, "0") === 0 ? null : divide(absoluteChange, previous.value),
  };
}

function result(
  key: KpiMetricKey,
  unit: KpiUnit,
  formula: string,
  current: Aggregate,
  previous: Aggregate,
  inputs: KpiInputReference[] = combineInputs(current, previous),
): KpiMetricResult {
  return {
    key,
    value: current.value,
    unit,
    status: current.value === null ? "unavailable" : "available",
    ...(current.value === null && current.reason ? { unavailableReason: current.reason } : {}),
    inputs,
    formula,
    comparison: comparison(current, previous),
  };
}

function ratio(numerator: Aggregate, denominator: Aggregate): Aggregate {
  if (denominator.value === null) return { value: null, reason: denominator.reason ?? "INPUT_UNAVAILABLE", inputs: combineInputs(numerator, denominator) };
  if (compare(denominator.value, "0") === 0) return { value: null, reason: "ZERO_DENOMINATOR", inputs: combineInputs(numerator, denominator) };
  if (numerator.value === null) return { value: null, reason: numerator.reason ?? "INPUT_UNAVAILABLE", inputs: combineInputs(numerator, denominator) };
  if (numerator.currencyCode && denominator.currencyCode && numerator.currencyCode !== denominator.currencyCode) {
    return { value: null, reason: "CURRENCY_INCOMPATIBLE", inputs: combineInputs(numerator, denominator) };
  }
  return {
    value: divide(numerator.value, denominator.value),
    inputs: combineInputs(numerator, denominator),
    ...(numerator.currencyCode ? { currencyCode: numerator.currencyCode } : {}),
  };
}

function primitive(input: KpiInput, key: KpiMetricKey, unit: KpiUnit, formula: string, field: ObservationField, options: Omit<AggregateOptions, "period" | "field">): KpiMetricResult {
  const current = aggregate(input, { ...options, period: "current", field });
  const previous = aggregate(input, { ...options, period: "comparison", field });
  return result(key, unit, formula, current, previous);
}

function derived(
  key: KpiMetricKey,
  unit: KpiUnit,
  formula: string,
  currentNumerator: Aggregate,
  currentDenominator: Aggregate,
  previousNumerator: Aggregate,
  previousDenominator: Aggregate,
): KpiMetricResult {
  return result(
    key,
    unit,
    formula,
    ratio(currentNumerator, currentDenominator),
    ratio(previousNumerator, previousDenominator),
  );
}

function advertisingMetrics(input: KpiInput, sources: ProviderSource[]): KpiMetricResult[] {
  const spend = primitive(input, "spend", "currency", "sum(advertising.spend)", "spend", { sources, monetary: true });
  const impressions = primitive(input, "impressions", "count", "sum(advertising.impressions)", "impressions", { sources });
  const clicks = primitive(input, "clicks", "count", "sum(advertising.clicks)", "clicks", { sources });
  const conversions = primitive(input, "conversions", "count", "sum(advertising.conversions)", "conversions", { sources });
  const attributedRevenue = primitive(input, "attributed_revenue", "currency", "sum(advertising.attributedRevenue)", "attributedRevenue", { sources, monetary: true });

  const currentSpend = aggregate(input, { period: "current", field: "spend", sources, monetary: true });
  const previousSpend = aggregate(input, { period: "comparison", field: "spend", sources, monetary: true });
  const currentImpressions = aggregate(input, { period: "current", field: "impressions", sources });
  const previousImpressions = aggregate(input, { period: "comparison", field: "impressions", sources });
  const currentClicks = aggregate(input, { period: "current", field: "clicks", sources });
  const previousClicks = aggregate(input, { period: "comparison", field: "clicks", sources });
  const currentConversions = aggregate(input, { period: "current", field: "conversions", sources });
  const previousConversions = aggregate(input, { period: "comparison", field: "conversions", sources });
  const currentAttributedRevenue = aggregate(input, { period: "current", field: "attributedRevenue", sources, monetary: true });
  const previousAttributedRevenue = aggregate(input, { period: "comparison", field: "attributedRevenue", sources, monetary: true });

  return [
    spend,
    impressions,
    clicks,
    conversions,
    attributedRevenue,
    derived("ctr", "ratio", "clicks / impressions", currentClicks, currentImpressions, previousClicks, previousImpressions),
    derived("cpc", "currency", "spend / clicks", currentSpend, currentClicks, previousSpend, previousClicks),
    derived("cpa", "currency", "spend / conversions", currentSpend, currentConversions, previousSpend, previousConversions),
    derived("roas", "ratio", "attributedRevenue / spend", currentAttributedRevenue, currentSpend, previousAttributedRevenue, previousSpend),
    derived("conversion_rate", "ratio", "conversions / clicks", currentConversions, currentClicks, previousConversions, previousClicks),
  ];
}

function commerceMetrics(input: KpiInput): KpiMetricResult[] {
  const sources: ProviderSource[] = ["shopify"];
  const commerceRevenue = primitive(input, "commerce_revenue", "currency", "sum(shopify.grossRevenue)", "grossRevenue", { sources, monetary: true });
  const orders = primitive(input, "orders", "count", "sum(shopify.orders)", "orders", { sources });
  const currentRevenue = aggregate(input, { period: "current", field: "grossRevenue", sources, monetary: true });
  const previousRevenue = aggregate(input, { period: "comparison", field: "grossRevenue", sources, monetary: true });
  const currentOrders = aggregate(input, { period: "current", field: "orders", sources });
  const previousOrders = aggregate(input, { period: "comparison", field: "orders", sources });
  return [
    commerceRevenue,
    orders,
    derived("aov", "currency", "commerce_revenue / orders", currentRevenue, currentOrders, previousRevenue, previousOrders),
  ];
}

function globalMetrics(input: KpiInput): KpiMetricResult[] {
  const advertising = advertisingMetrics(input, ADVERTISING_SOURCES);
  const byKey = new Map(advertising.map((metric) => [metric.key, metric]));
  const commerce = commerceMetrics(input);
  const commerceByKey = new Map(commerce.map((metric) => [metric.key, metric]));
  const currentRevenue = aggregate(input, { period: "current", field: "grossRevenue", sources: ["shopify"], monetary: true });
  const previousRevenue = aggregate(input, { period: "comparison", field: "grossRevenue", sources: ["shopify"], monetary: true });
  const currentSpend = aggregate(input, { period: "current", field: "spend", sources: ADVERTISING_SOURCES, monetary: true });
  const previousSpend = aggregate(input, { period: "comparison", field: "spend", sources: ADVERTISING_SOURCES, monetary: true });

  return [
    byKey.get("spend")!,
    commerceByKey.get("commerce_revenue")!,
    commerceByKey.get("orders")!,
    byKey.get("impressions")!,
    byKey.get("clicks")!,
    byKey.get("conversions")!,
    byKey.get("ctr")!,
    byKey.get("cpc")!,
    byKey.get("cpa")!,
    derived("mer", "ratio", "commerce_revenue / spend", currentRevenue, currentSpend, previousRevenue, previousSpend),
    commerceByKey.get("aov")!,
    byKey.get("conversion_rate")!,
  ];
}

function sourceBreakdown(input: KpiInput): KpiSourceBreakdown[] {
  const sources = PROVIDER_ORDER.filter((source) => input.observations.some((observation) => observation.source === source));
  return sources.map((source) => ({
    source,
    metrics: source === "shopify" ? commerceMetrics(input) : advertisingMetrics(input, [source]),
  }));
}

export function runKpiEngine(input: KpiInput): KpiExecutionResult {
  if (input.dataHealthStatus === "blocked") {
    return {
      status: "blocked",
      code: "DATA_HEALTH_BLOCKED",
      message: "KPI execution is unavailable because Data Health is blocked.",
      period: input.reportingPeriod,
      metrics: [],
      sourceBreakdown: [],
    };
  }
  return {
    status: "ready",
    period: input.reportingPeriod,
    metrics: globalMetrics(input),
    sourceBreakdown: sourceBreakdown(input),
  };
}
