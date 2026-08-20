import type { ChangeObservation } from "../change-intelligence/types";
import type { NarrativeEvidenceRef, NarrativeItem, NarrativeScope, NarrativeType } from "./types";
import { efficiencyText, metricLabel, movementText, sourceLabel } from "./templates";

function observationEvidence(observation: ChangeObservation): NarrativeEvidenceRef[] {
  return [{ kind: "observation", id: observation.id }];
}

function item(options: {
  rule: string;
  type: NarrativeType;
  title: string;
  text: string;
  scope: NarrativeScope;
  priority: number;
  evidenceRefs: NarrativeEvidenceRef[];
}): NarrativeItem {
  const evidenceRefs = [...options.evidenceRefs].sort((left, right) => `${left.kind}:${left.id}`.localeCompare(`${right.kind}:${right.id}`));
  return {
    id: `narrative:${options.rule}:${options.scope}:${evidenceRefs.map((evidence) => `${evidence.kind}:${evidence.id}`).join(",")}`,
    type: options.type,
    title: options.title,
    text: options.text,
    scope: options.scope,
    priority: options.priority,
    evidenceRefs,
  };
}

export function narrativeForObservation(observation: ChangeObservation): NarrativeItem | null {
  if (observation.type === "TARGET_BREACH") {
    return item({ rule: "target-breach", type: "target", title: `${metricLabel(observation.metric, observation.source)} is outside target`, text: `${metricLabel(observation.metric, observation.source)} is outside its configured target.`, scope: observation.scope, priority: 900, evidenceRefs: observationEvidence(observation) });
  }
  if (observation.significance !== "notable" && observation.significance !== "major") return null;
  if (observation.type === "SPEND_REVENUE_DIVERGENCE") {
    const outpaced = observation.signalCode === "SPEND_OUTPACED_COMMERCE_REVENUE";
    return item({ rule: outpaced ? "spend-outpaced-commerce" : "commerce-outpaced-spend", type: "tradeoff", title: outpaced ? "Spend grew faster than commerce revenue" : "Commerce revenue grew faster than paid spend", text: outpaced ? "Paid spend grew faster than commerce revenue." : "Commerce revenue grew faster than paid spend.", scope: "report", priority: outpaced ? 680 : 620, evidenceRefs: observationEvidence(observation) });
  }
  if (observation.signalCode === "SPEND_UP_CONVERSIONS_DOWN") {
    return item({ rule: "spend-up-conversions-down", type: "tradeoff", title: "Spend increased while conversions declined", text: "Paid spend increased while conversion volume declined.", scope: "report", priority: 670, evidenceRefs: observationEvidence(observation) });
  }
  if (observation.type === "SOURCE_EFFICIENCY_IMPROVEMENT" || observation.type === "SOURCE_EFFICIENCY_DETERIORATION" || observation.metric === "cpa" || observation.metric === "roas" || observation.metric === "mer") {
    return item({ rule: "efficiency", type: "efficiency", title: `${sourceLabel(observation.source) || "Paid-media"} efficiency ${observation.assessment === "favorable" ? "improved" : "weakened"}`, text: efficiencyText(observation), scope: observation.scope, priority: observation.assessment === "unfavorable" ? 640 : 600, evidenceRefs: observationEvidence(observation) });
  }
  if (["commerce_revenue", "attributed_revenue", "orders", "conversions", "clicks"].includes(observation.metric)) {
    const declined = observation.direction === "decreased";
    return item({ rule: declined ? "decline" : "growth", type: declined ? "decline" : "growth", title: `${metricLabel(observation.metric, observation.source)} ${declined ? "declined" : "grew"}`, text: movementText(observation), scope: observation.scope, priority: declined ? 700 : 610, evidenceRefs: observationEvidence(observation) });
  }
  return null;
}

export function healthNarrative(code: string, id: string, blocking: boolean): NarrativeItem {
  const copy = code === "COMMERCE_SOURCE_ABSENT"
    ? ["Shopify data isn’t included", "Shopify data isn’t included, so commerce revenue and MER are unavailable."]
    : code === "CROSS_SOURCE_CURRENCY_MISMATCH" || code === "SOURCE_MIXED_CURRENCIES"
      ? ["Currency mismatch prevents combined analysis", "Currency mismatch prevents a reliable combined analysis."]
      : [blocking ? "Data issue blocks analysis" : "Data quality needs review", blocking ? "Resolve the data issue before relying on performance analysis." : "Review this data-quality finding before relying on the affected metrics."];
  return item({ rule: `health-${code.toLowerCase()}`, type: "health", title: copy[0], text: copy[1], scope: "data_health", priority: blocking ? 1000 : 820, evidenceRefs: [{ kind: "data_health", id }] });
}

export function freshnessNarrative(status: "needs_refresh" | "old", sources: string[]): NarrativeItem {
  const old = status === "old";
  return item({ rule: `freshness-${status}`, type: "freshness", title: old ? "Update source data before current decisions" : "Latest source data needs refresh", text: old ? "Update the source data before relying on this dashboard for current decisions." : "The latest source data is several days old.", scope: "freshness", priority: old ? 780 : 500, evidenceRefs: sources.sort().map((source) => ({ kind: "freshness" as const, id: source })) });
}
