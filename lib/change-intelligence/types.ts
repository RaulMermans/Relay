import type { DataHealthStatus, ProviderSource, ResolvedReportingPeriod } from "../data-health/types";
import type { KpiExecutionResult, KpiMetricKey, KpiUnit } from "../kpi/types";
import type { FixedDecimalString } from "../normalization/types";

export type ChangeDirection = "increased" | "decreased" | "unchanged" | "unavailable";
export type ChangeAssessment = "favorable" | "unfavorable" | "neutral" | "context_required";
export type ChangeSignificance = "minor" | "notable" | "major" | "unavailable";
export type ChangeScope = "report" | "source";
export type MetricPolarity = "higher_favorable" | "lower_favorable" | "context_dependent";

export type ChangeObservationType =
  | "METRIC_CHANGE"
  | "CPA_MOVEMENT"
  | "ROAS_MOVEMENT"
  | "MER_MOVEMENT"
  | "COMMERCE_REVENUE_CHANGE"
  | "ORDERS_CHANGE"
  | "SPEND_REVENUE_DIVERGENCE"
  | "SOURCE_EFFICIENCY_IMPROVEMENT"
  | "SOURCE_EFFICIENCY_DETERIORATION"
  | "TARGET_BREACH"
  | "RULE_BASED_SIGNAL";

export type ChangeEvidence = {
  metric: KpiMetricKey;
  scope: ChangeScope;
  source?: ProviderSource;
  unit: KpiUnit;
  current: FixedDecimalString | null;
  previous: FixedDecimalString | null;
  absoluteChange: FixedDecimalString | null;
  percentageChange: FixedDecimalString | null;
};

export type TargetOperator = ">" | ">=" | "<" | "<=";
export type ChangeTarget = {
  id: string;
  metric: KpiMetricKey;
  scope: ChangeScope;
  source?: ProviderSource;
  operator: TargetOperator;
  value: FixedDecimalString;
  unit: KpiUnit;
  currencyCode?: string;
};

export type ChangeObservation = {
  id: string;
  type: ChangeObservationType;
  metric: KpiMetricKey;
  scope: ChangeScope;
  source?: ProviderSource;
  currentValue: FixedDecimalString | null;
  previousValue: FixedDecimalString | null;
  absoluteChange?: FixedDecimalString | null;
  percentageChange?: FixedDecimalString | null;
  direction: ChangeDirection;
  assessment: ChangeAssessment;
  significance: ChangeSignificance;
  priority: number;
  evidence: ChangeEvidence[];
  target?: ChangeTarget;
  signalCode?:
    | "SPEND_OUTPACED_COMMERCE_REVENUE"
    | "COMMERCE_REVENUE_OUTPACED_SPEND"
    | "SPEND_UP_CONVERSIONS_DOWN"
    | "SPEND_UP_ATTRIBUTED_REVENUE_DOWN"
    | "COMMERCE_REVENUE_UP_ORDERS_DOWN"
    | "CLICKS_UP_CONVERSIONS_DOWN";
};

export type ChangeMover = ChangeObservation & { percentageChange: FixedDecimalString };

export type SourceContribution = {
  metric: "spend";
  source: Extract<ProviderSource, "meta_ads" | "google_ads">;
  currentValue: FixedDecimalString;
  previousValue: FixedDecimalString;
  absoluteChange: FixedDecimalString;
  totalAbsoluteChange: FixedDecimalString;
  contributionToTotalChange: FixedDecimalString;
  evidence: ChangeEvidence[];
};

export type TargetEvaluation = {
  target: ChangeTarget;
  status: "met" | "breached" | "unavailable";
  actualValue: FixedDecimalString | null;
  evidence: ChangeEvidence[];
  unavailableReason?: "METRIC_UNAVAILABLE" | "UNIT_INCOMPATIBLE" | "CURRENCY_INCOMPATIBLE";
};

export type ChangeIntelligenceInput = {
  kpiResult: KpiExecutionResult;
  dataHealthStatus: DataHealthStatus;
  reportingPeriod: ResolvedReportingPeriod;
  targets?: ChangeTarget[];
};

export type ChangeIntelligenceResult = {
  status: "ready";
  period: ResolvedReportingPeriod;
  observations: ChangeObservation[];
  largestPositiveMovers: ChangeMover[];
  largestNegativeMovers: ChangeMover[];
  sourceContributions: SourceContribution[];
  targetEvaluations: TargetEvaluation[];
};

export type ChangeIntelligenceBlockedResult = {
  status: "blocked";
  code: "DATA_HEALTH_BLOCKED";
  message: "Change Intelligence is unavailable because Data Health is blocked.";
  period: ResolvedReportingPeriod;
  observations: [];
  largestPositiveMovers: [];
  largestNegativeMovers: [];
  sourceContributions: [];
  targetEvaluations: [];
};

export type ChangeIntelligenceExecutionResult = ChangeIntelligenceResult | ChangeIntelligenceBlockedResult;
