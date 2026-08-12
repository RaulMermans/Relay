import type { DataHealthStatus, ProviderSource, ResolvedReportingPeriod } from "../data-health/types";
import type { AdvertisingObservation, CommerceObservation, FixedDecimalString } from "../normalization/types";

export type KpiObservation = AdvertisingObservation | CommerceObservation;
export type KpiMetricKey =
  | "spend"
  | "commerce_revenue"
  | "orders"
  | "impressions"
  | "clicks"
  | "conversions"
  | "attributed_revenue"
  | "ctr"
  | "cpc"
  | "cpa"
  | "roas"
  | "mer"
  | "aov"
  | "conversion_rate";
export type KpiUnit = "currency" | "count" | "ratio";
export type KpiMetricStatus = "available" | "unavailable";
export type KpiUnavailableReason = "INPUT_UNAVAILABLE" | "ZERO_DENOMINATOR" | "CURRENCY_INCOMPATIBLE" | "INVALID_INPUT";

export type KpiInput = {
  observations: KpiObservation[];
  reportingPeriod: ResolvedReportingPeriod;
  dataHealthStatus: DataHealthStatus;
};

export type KpiInputReference = {
  source: ProviderSource;
  field: string;
  period: "current" | "comparison";
  observationCount: number;
  currencyCode?: string;
};

export type KpiComparison = {
  current: FixedDecimalString | null;
  previous: FixedDecimalString | null;
  absoluteChange: FixedDecimalString | null;
  percentageChange: FixedDecimalString | null;
};

export type KpiMetricResult = {
  key: KpiMetricKey;
  value: FixedDecimalString | null;
  unit: KpiUnit;
  status: KpiMetricStatus;
  unavailableReason?: KpiUnavailableReason;
  inputs: KpiInputReference[];
  formula: string;
  comparison: KpiComparison;
};

export type KpiSourceBreakdown = {
  source: ProviderSource;
  metrics: KpiMetricResult[];
};

export type KpiResult = {
  status: "ready";
  period: ResolvedReportingPeriod;
  metrics: KpiMetricResult[];
  sourceBreakdown: KpiSourceBreakdown[];
  warnings?: Array<{ code: "INVALID_DECIMAL_INPUT"; message: string; source?: ProviderSource }>;
};

export type KpiBlockedResult = {
  status: "blocked";
  code: "DATA_HEALTH_BLOCKED";
  message: "KPI execution is unavailable because Data Health is blocked.";
  period: ResolvedReportingPeriod;
  metrics: [];
  sourceBreakdown: [];
};

export type KpiExecutionResult = KpiResult | KpiBlockedResult;
