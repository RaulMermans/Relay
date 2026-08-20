import type { ChangeObservation } from "../change-intelligence/types";
import { formatPercentageChange } from "../presentation";

const SOURCE_LABELS = { meta_ads: "Meta Ads", google_ads: "Google Ads", shopify: "Shopify" } as const;

export function sourceLabel(source: ChangeObservation["source"]): string {
  return source ? SOURCE_LABELS[source] : "";
}

export function metricLabel(metric: ChangeObservation["metric"], source?: ChangeObservation["source"]): string {
  const prefix = sourceLabel(source);
  const label = metric === "commerce_revenue" ? "commerce revenue"
    : metric === "attributed_revenue" ? "attributed revenue"
    : metric === "roas" ? "ROAS"
    : metric === "mer" ? "MER"
    : metric === "cpa" ? "CPA"
    : metric.replace(/_/g, " ");
  return prefix ? `${prefix} ${label}` : label;
}

export function movementText(observation: ChangeObservation): string {
  const direction = observation.direction === "increased" ? "increased" : "decreased";
  return `${metricLabel(observation.metric, observation.source)} ${direction} ${formatPercentageChange(observation.percentageChange)}.`;
}

export function efficiencyText(observation: ChangeObservation): string {
  const subject = sourceLabel(observation.source) || "Paid-media";
  const direction = observation.assessment === "favorable" ? "improved" : "weakened";
  return `${subject} efficiency ${direction}, with ${metricLabel(observation.metric, observation.source)} ${observation.direction} ${formatPercentageChange(observation.percentageChange)}.`;
}
