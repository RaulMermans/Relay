import { compare, divide, subtract } from "../kpi/arithmetic";
import type { KpiMetricKey, KpiMetricResult } from "../kpi/types";
import { evaluateTargets } from "./targets";
import type {
  ChangeAssessment,
  ChangeDirection,
  ChangeEvidence,
  ChangeIntelligenceExecutionResult,
  ChangeIntelligenceInput,
  ChangeMover,
  ChangeObservation,
  ChangeObservationType,
  ChangeScope,
  ChangeSignificance,
  MetricPolarity,
  SourceContribution,
  TargetEvaluation,
} from "./types";

const HIGHER_FAVORABLE = new Set<KpiMetricKey>([
  "commerce_revenue",
  "orders",
  "roas",
  "mer",
  "ctr",
  "conversion_rate",
]);
const LOWER_FAVORABLE = new Set<KpiMetricKey>(["cpa", "cpc"]);
const OBSERVATION_LIMIT = 12;

export function metricPolarity(metric: KpiMetricKey): MetricPolarity {
  if (HIGHER_FAVORABLE.has(metric)) return "higher_favorable";
  if (LOWER_FAVORABLE.has(metric)) return "lower_favorable";
  return "context_dependent";
}

function absolute(value: string): string {
  return value.startsWith("-") ? value.slice(1) : value;
}

function direction(metric: KpiMetricResult): ChangeDirection {
  const { current, previous } = metric.comparison;
  if (current === null || previous === null) return "unavailable";
  const order = compare(current, previous);
  return order === 0 ? "unchanged" : order > 0 ? "increased" : "decreased";
}

function assessment(metric: KpiMetricResult, changeDirection: ChangeDirection): ChangeAssessment {
  if (changeDirection === "unavailable") return "context_required";
  if (changeDirection === "unchanged") return "neutral";
  const polarity = metricPolarity(metric.key);
  if (polarity === "context_dependent") return "context_required";
  const favorable = polarity === "higher_favorable"
    ? changeDirection === "increased"
    : changeDirection === "decreased";
  return favorable ? "favorable" : "unfavorable";
}

function significanceForPercentage(percentage: string | null): ChangeSignificance {
  if (percentage === null) return "unavailable";
  const magnitude = absolute(percentage);
  if (compare(magnitude, "0.05") < 0) return "minor";
  if (compare(magnitude, "0.15") <= 0) return "notable";
  return "major";
}

function significance(metric: KpiMetricResult): ChangeSignificance {
  return significanceForPercentage(metric.comparison.percentageChange);
}

export function classifyMetricChange(metric: KpiMetricResult): {
  direction: ChangeDirection;
  assessment: ChangeAssessment;
  significance: ChangeSignificance;
} {
  const changeDirection = direction(metric);
  return {
    direction: changeDirection,
    assessment: assessment(metric, changeDirection),
    significance: significance(metric),
  };
}

function evidence(metric: KpiMetricResult, scope: ChangeScope, source?: ChangeEvidence["source"]): ChangeEvidence {
  return {
    metric: metric.key,
    scope,
    ...(source ? { source } : {}),
    unit: metric.unit,
    current: metric.comparison.current,
    previous: metric.comparison.previous,
    absoluteChange: metric.comparison.absoluteChange,
    percentageChange: metric.comparison.percentageChange,
  };
}

function observationType(metric: KpiMetricKey): ChangeObservationType {
  switch (metric) {
    case "cpa": return "CPA_MOVEMENT";
    case "roas": return "ROAS_MOVEMENT";
    case "mer": return "MER_MOVEMENT";
    case "commerce_revenue": return "COMMERCE_REVENUE_CHANGE";
    case "orders": return "ORDERS_CHANGE";
    default: return "METRIC_CHANGE";
  }
}

function observationPriority(changeAssessment: ChangeAssessment, changeSignificance: ChangeSignificance): number {
  if (changeAssessment === "unfavorable" && changeSignificance === "major") return 90;
  if (changeAssessment === "favorable" && changeSignificance === "major") return 80;
  if (changeSignificance === "notable") return 60;
  return 30;
}

function metricObservation(
  metric: KpiMetricResult,
  scope: ChangeScope,
  source?: ChangeEvidence["source"],
): ChangeObservation | null {
  const classification = classifyMetricChange(metric);
  if (classification.direction === "unavailable" || classification.direction === "unchanged") return null;
  const type = observationType(metric.key);
  return {
    id: [type, scope, source ?? "all", metric.key].join(":"),
    type,
    metric: metric.key,
    scope,
    ...(source ? { source } : {}),
    currentValue: metric.comparison.current,
    previousValue: metric.comparison.previous,
    absoluteChange: metric.comparison.absoluteChange,
    percentageChange: metric.comparison.percentageChange,
    ...classification,
    priority: observationPriority(classification.assessment, classification.significance),
    evidence: [evidence(metric, scope, source)],
  };
}

function compareObservations(left: ChangeObservation, right: ChangeObservation): number {
  if (left.priority !== right.priority) return right.priority - left.priority;
  return [left.type, left.scope, left.source ?? "", left.metric, left.id]
    .join(":")
    .localeCompare([right.type, right.scope, right.source ?? "", right.metric, right.id].join(":"));
}

function moverMagnitude(observation: ChangeObservation): string | null {
  return observation.percentageChange === null || observation.percentageChange === undefined
    ? null
    : absolute(observation.percentageChange);
}

function movers(observations: ChangeObservation[], wanted: "favorable" | "unfavorable"): ChangeMover[] {
  return observations
    .filter((observation): observation is ChangeMover =>
      observation.assessment === wanted && typeof observation.percentageChange === "string")
    .sort((left, right) => {
      const magnitudeOrder = compare(moverMagnitude(right)!, moverMagnitude(left)!);
      return magnitudeOrder !== 0 ? magnitudeOrder : compareObservations(left, right);
    })
    .slice(0, 3);
}

function deduplicate(observations: ChangeObservation[]): ChangeObservation[] {
  return [...new Map(observations.map((observation) => [observation.id, observation])).values()];
}

function findMetric(metrics: KpiMetricResult[], key: KpiMetricKey): KpiMetricResult | undefined {
  return metrics.find((metric) => metric.key === key);
}

function metricChanged(metric: KpiMetricResult | undefined, wanted: "increased" | "decreased"): metric is KpiMetricResult {
  return Boolean(metric && classifyMetricChange(metric).direction === wanted);
}

function strongestSignificance(metrics: KpiMetricResult[]): ChangeSignificance {
  const ranks: Record<ChangeSignificance, number> = { unavailable: 0, minor: 1, notable: 2, major: 3 };
  return metrics.map(significance).sort((left, right) => ranks[right] - ranks[left])[0] ?? "unavailable";
}

function signalObservation(options: {
  id: string;
  metric: KpiMetricKey;
  scope: ChangeScope;
  source?: ChangeEvidence["source"];
  assessment: ChangeAssessment;
  significance: ChangeSignificance;
  evidence: ChangeEvidence[];
  signalCode: NonNullable<ChangeObservation["signalCode"]>;
  type?: ChangeObservation["type"];
}): ChangeObservation {
  const primary = options.evidence.find((item) => item.metric === options.metric) ?? options.evidence[0]!;
  return {
    id: options.id,
    type: options.type ?? "RULE_BASED_SIGNAL",
    metric: options.metric,
    scope: options.scope,
    ...(options.source ? { source: options.source } : {}),
    currentValue: primary.current,
    previousValue: primary.previous,
    absoluteChange: primary.absoluteChange,
    percentageChange: primary.percentageChange,
    direction: primary.current === null || primary.previous === null
      ? "unavailable"
      : compare(primary.current, primary.previous) > 0 ? "increased" : compare(primary.current, primary.previous) < 0 ? "decreased" : "unchanged",
    assessment: options.assessment,
    significance: options.significance,
    priority: 70,
    evidence: options.evidence,
    signalCode: options.signalCode,
  };
}

function divergenceObservation(metrics: KpiMetricResult[]): ChangeObservation | null {
  const spend = findMetric(metrics, "spend");
  const revenue = findMetric(metrics, "commerce_revenue");
  if (!spend?.comparison.percentageChange || !revenue?.comparison.percentageChange) return null;
  if (
    spend.comparison.previous === null || revenue.comparison.previous === null ||
    compare(spend.comparison.previous, "0") <= 0 || compare(revenue.comparison.previous, "0") <= 0
  ) return null;
  const gap = subtract(spend.comparison.percentageChange, revenue.comparison.percentageChange);
  if (compare(absolute(gap), "0.05") < 0) return null;
  const spendOutpaced = compare(gap, "0") > 0;
  const mer = findMetric(metrics, "mer");
  const facts = [spend, revenue, ...(mer ? [mer] : [])];
  return signalObservation({
    id: "SPEND_REVENUE_DIVERGENCE:report:all",
    type: "SPEND_REVENUE_DIVERGENCE",
    metric: "mer",
    scope: "report",
    assessment: spendOutpaced ? "unfavorable" : "favorable",
    significance: significanceForPercentage(gap),
    evidence: facts.map((metric) => evidence(metric, "report")),
    signalCode: spendOutpaced ? "SPEND_OUTPACED_COMMERCE_REVENUE" : "COMMERCE_REVENUE_OUTPACED_SPEND",
  });
}

function sourceEfficiencyObservations(input: Extract<ChangeIntelligenceInput["kpiResult"], { status: "ready" }>): ChangeObservation[] {
  return input.sourceBreakdown.flatMap((breakdown) => {
    if (breakdown.source === "shopify") return [];
    const spend = findMetric(breakdown.metrics, "spend");
    const roas = findMetric(breakdown.metrics, "roas");
    const cpa = findMetric(breakdown.metrics, "cpa");
    const efficiency = [roas, cpa].filter((metric): metric is KpiMetricResult => Boolean(metric))
      .map((metric) => ({ metric, classification: classifyMetricChange(metric) }))
      .filter(({ classification }) => classification.significance === "notable" || classification.significance === "major");
    const favorable = efficiency.filter(({ classification }) => classification.assessment === "favorable");
    const unfavorable = efficiency.filter(({ classification }) => classification.assessment === "unfavorable");
    if ((favorable.length === 0 && unfavorable.length === 0) || (favorable.length > 0 && unfavorable.length > 0)) return [];
    const deterioration = unfavorable.length > 0;
    const selected = deterioration ? unfavorable : favorable;
    const primary = selected[0]!.metric;
    const facts = [...(spend ? [spend] : []), ...selected.map(({ metric }) => metric)];
    return [{
      id: `${deterioration ? "SOURCE_EFFICIENCY_DETERIORATION" : "SOURCE_EFFICIENCY_IMPROVEMENT"}:source:${breakdown.source}`,
      type: deterioration ? "SOURCE_EFFICIENCY_DETERIORATION" : "SOURCE_EFFICIENCY_IMPROVEMENT",
      metric: primary.key,
      scope: "source" as const,
      source: breakdown.source,
      currentValue: primary.comparison.current,
      previousValue: primary.comparison.previous,
      absoluteChange: primary.comparison.absoluteChange,
      percentageChange: primary.comparison.percentageChange,
      direction: classifyMetricChange(primary).direction,
      assessment: deterioration ? "unfavorable" as const : "favorable" as const,
      significance: strongestSignificance(selected.map(({ metric }) => metric)),
      priority: 70,
      evidence: facts.map((metric) => evidence(metric, "source", breakdown.source)),
    }];
  });
}

function ruleBasedSignals(input: Extract<ChangeIntelligenceInput["kpiResult"], { status: "ready" }>): ChangeObservation[] {
  const observations: ChangeObservation[] = [];
  const spend = findMetric(input.metrics, "spend");
  const conversions = findMetric(input.metrics, "conversions");
  if (metricChanged(spend, "increased") && metricChanged(conversions, "decreased")) {
    observations.push(signalObservation({
      id: "RULE_BASED_SIGNAL:report:SPEND_UP_CONVERSIONS_DOWN",
      metric: "conversions", scope: "report", assessment: "unfavorable",
      significance: strongestSignificance([spend, conversions]),
      evidence: [evidence(spend, "report"), evidence(conversions, "report")],
      signalCode: "SPEND_UP_CONVERSIONS_DOWN",
    }));
  }
  const revenue = findMetric(input.metrics, "commerce_revenue");
  const orders = findMetric(input.metrics, "orders");
  if (metricChanged(revenue, "increased") && metricChanged(orders, "decreased")) {
    const aov = findMetric(input.metrics, "aov");
    observations.push(signalObservation({
      id: "RULE_BASED_SIGNAL:report:COMMERCE_REVENUE_UP_ORDERS_DOWN",
      metric: "commerce_revenue", scope: "report", assessment: "context_required",
      significance: strongestSignificance([revenue, orders]),
      evidence: [revenue, orders, ...(aov ? [aov] : [])].map((metric) => evidence(metric, "report")),
      signalCode: "COMMERCE_REVENUE_UP_ORDERS_DOWN",
    }));
  }

  const scopes = [
    { scope: "report" as const, metrics: input.metrics, source: undefined },
    ...input.sourceBreakdown.filter((item) => item.source !== "shopify").map((item) => ({ scope: "source" as const, metrics: item.metrics, source: item.source })),
  ];
  for (const item of scopes) {
    const clicks = findMetric(item.metrics, "clicks");
    const scopedConversions = findMetric(item.metrics, "conversions");
    if (metricChanged(clicks, "increased") && metricChanged(scopedConversions, "decreased")) {
      observations.push(signalObservation({
        id: `RULE_BASED_SIGNAL:${item.scope}:${item.source ?? "all"}:CLICKS_UP_CONVERSIONS_DOWN`,
        metric: "conversions", scope: item.scope, source: item.source, assessment: "unfavorable",
        significance: strongestSignificance([clicks, scopedConversions]),
        evidence: [evidence(clicks, item.scope, item.source), evidence(scopedConversions, item.scope, item.source)],
        signalCode: "CLICKS_UP_CONVERSIONS_DOWN",
      }));
    }
    if (item.scope === "source") {
      const scopedSpend = findMetric(item.metrics, "spend");
      const attributedRevenue = findMetric(item.metrics, "attributed_revenue");
      if (metricChanged(scopedSpend, "increased") && metricChanged(attributedRevenue, "decreased")) {
        observations.push(signalObservation({
          id: `RULE_BASED_SIGNAL:source:${item.source}:SPEND_UP_ATTRIBUTED_REVENUE_DOWN`,
          metric: "attributed_revenue", scope: "source", source: item.source, assessment: "unfavorable",
          significance: strongestSignificance([scopedSpend, attributedRevenue]),
          evidence: [evidence(scopedSpend, "source", item.source), evidence(attributedRevenue, "source", item.source)],
          signalCode: "SPEND_UP_ATTRIBUTED_REVENUE_DOWN",
        }));
      }
    }
  }
  return observations;
}

function sourceContributions(input: Extract<ChangeIntelligenceInput["kpiResult"], { status: "ready" }>): SourceContribution[] {
  const total = findMetric(input.metrics, "spend");
  const totalDelta = total?.comparison.absoluteChange;
  if (!total || totalDelta == null || compare(totalDelta, "0") === 0) return [];
  const providerOrder = ["meta_ads", "google_ads"] as const;
  return providerOrder.flatMap((source) => {
    const sourceMetric = findMetric(input.sourceBreakdown.find((item) => item.source === source)?.metrics ?? [], "spend");
    const current = sourceMetric?.comparison.current;
    const previous = sourceMetric?.comparison.previous;
    const delta = sourceMetric?.comparison.absoluteChange;
    if (!sourceMetric || current == null || previous == null || delta == null) return [];
    return [{
      metric: "spend" as const,
      source,
      currentValue: current,
      previousValue: previous,
      absoluteChange: delta,
      totalAbsoluteChange: totalDelta,
      contributionToTotalChange: divide(delta, totalDelta),
      evidence: [evidence(sourceMetric, "source", source), evidence(total, "report")],
    }];
  });
}

function targetBreachObservations(evaluations: TargetEvaluation[]): ChangeObservation[] {
  return evaluations.filter((evaluation) => evaluation.status === "breached").map((evaluation) => {
    const fact = evaluation.evidence[0]!;
    return {
      id: `TARGET_BREACH:${evaluation.target.id}`,
      type: "TARGET_BREACH",
      metric: evaluation.target.metric,
      scope: evaluation.target.scope,
      ...(evaluation.target.source ? { source: evaluation.target.source } : {}),
      currentValue: evaluation.actualValue,
      previousValue: fact.previous,
      absoluteChange: fact.absoluteChange,
      percentageChange: fact.percentageChange,
      direction: fact.current === null || fact.previous === null
        ? "unavailable"
        : compare(fact.current, fact.previous) > 0 ? "increased" : compare(fact.current, fact.previous) < 0 ? "decreased" : "unchanged",
      assessment: "unfavorable",
      significance: significanceForPercentage(fact.percentageChange),
      priority: 100,
      evidence: evaluation.evidence,
      target: evaluation.target,
    };
  });
}

export function runChangeIntelligence(input: ChangeIntelligenceInput): ChangeIntelligenceExecutionResult {
  if (input.dataHealthStatus === "blocked" || input.kpiResult.status === "blocked") {
    return {
      status: "blocked",
      code: "DATA_HEALTH_BLOCKED",
      message: "Change Intelligence is unavailable because Data Health is blocked.",
      period: input.reportingPeriod,
      observations: [],
      largestPositiveMovers: [],
      largestNegativeMovers: [],
      sourceContributions: [],
      targetEvaluations: [],
    };
  }

  const metricObservations = [
    ...input.kpiResult.metrics.map((metric) => metricObservation(metric, "report")),
    ...input.kpiResult.sourceBreakdown.flatMap((breakdown) =>
      breakdown.metrics.map((metric) => metricObservation(metric, "source", breakdown.source))),
  ].filter((observation): observation is ChangeObservation => observation !== null);
  const targetEvaluations = evaluateTargets(input.kpiResult, input.targets ?? []);
  const ruleObservations = [
    divergenceObservation(input.kpiResult.metrics),
    ...sourceEfficiencyObservations(input.kpiResult),
    ...ruleBasedSignals(input.kpiResult),
    ...targetBreachObservations(targetEvaluations),
  ].filter((observation): observation is ChangeObservation => observation !== null);
  const uniqueMetrics = deduplicate(metricObservations);
  const unique = deduplicate([...metricObservations, ...ruleObservations]);

  return {
    status: "ready",
    period: input.reportingPeriod,
    observations: [...unique].sort(compareObservations).slice(0, OBSERVATION_LIMIT),
    largestPositiveMovers: movers(uniqueMetrics, "favorable"),
    largestNegativeMovers: movers(uniqueMetrics, "unfavorable"),
    sourceContributions: sourceContributions(input.kpiResult),
    targetEvaluations,
  };
}
