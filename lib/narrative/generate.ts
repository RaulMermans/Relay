import type { ChangeObservation } from "../change-intelligence/types";
import { prioritizeNarratives } from "./prioritize";
import { freshnessNarrative, healthNarrative, narrativeForObservation } from "./rules";
import type { NarrativeContext, NarrativeItem, NarrativeResult } from "./types";

function readyObservations(context: NarrativeContext): ChangeObservation[] {
  return context.observations.status === "ready" ? context.observations.observations : [];
}

function headline(context: NarrativeContext, items: NarrativeItem[]): string {
  if (context.dataHealth.status === "blocked") return "Performance is unavailable until data issues are resolved.";
  const observations = readyObservations(context);
  const hasDecline = observations.some((item) => ["commerce_revenue", "attributed_revenue"].includes(item.metric) && item.direction === "decreased" && item.significance === "major");
  if (hasDecline) return "Performance declined versus the previous period.";
  const growth = observations.some((item) => ["commerce_revenue", "attributed_revenue", "orders", "conversions"].includes(item.metric) && item.direction === "increased" && item.significance !== "minor");
  const weakEfficiency = items.some((item) => item.type === "efficiency" && item.title.endsWith("weakened")) || observations.some((item) => item.signalCode === "SPEND_OUTPACED_COMMERCE_REVENUE");
  const strongerEfficiency = items.some((item) => item.type === "efficiency" && item.title.endsWith("improved"));
  if (growth && weakEfficiency) return "Growth continued, but efficiency softened.";
  if (growth && strongerEfficiency) return "Performance improved with stronger efficiency.";
  return "Performance was mixed this period.";
}

function summary(context: NarrativeContext, items: NarrativeItem[], resultHeadline: string): string {
  if (context.dataHealth.status === "blocked") return "Resolve the blocking Data Health findings before Relay can produce a performance summary.";
  const details = items.filter((item) => item.type !== "health" && item.type !== "freshness" && item.type !== "target").slice(0, 2).map((item) => item.text);
  return details.length > 0 ? details.join(" ") : `${resultHeadline} No notable comparable movement is available yet.`;
}

export function generateNarrative(context: NarrativeContext): NarrativeResult {
  const observations = readyObservations(context);
  const healthItems = context.dataHealth.findings
    .filter((finding) => finding.blocking || finding.severity === "warning" || finding.code === "COMMERCE_SOURCE_ABSENT")
    .map((finding) => healthNarrative(finding.code, finding.id, finding.blocking));
  const observationItems = observations.flatMap((observation) => {
    const narrative = narrativeForObservation(observation);
    return narrative ? [narrative] : [];
  });
  const freshnessSources = context.sources.map((source) => source.source);
  const freshnessItems = context.freshness === "current" || freshnessSources.length === 0 ? [] : [freshnessNarrative(context.freshness, freshnessSources)];
  const items = prioritizeNarratives([...healthItems, ...observationItems, ...freshnessItems], 12);
  const selectedHeadline = headline(context, items);
  const attention = prioritizeNarratives(items.filter((item) => item.type === "health" || item.type === "target" || item.type === "freshness"), 4);
  const channelSummaries = prioritizeNarratives(items.filter((item) => item.scope === "source" && item.type !== "target"), 2);
  const highlights = prioritizeNarratives(items.filter((item) => !attention.some((attentionItem) => attentionItem.id === item.id) && !channelSummaries.some((channel) => channel.id === item.id)), 4);
  return {
    status: context.dataHealth.status === "blocked" ? "blocked" : "ready",
    headline: selectedHeadline,
    summary: summary(context, items, selectedHeadline),
    highlights,
    attention,
    channelSummaries,
    methodologyNotes: ["Narrative statements describe deterministic Relay facts and do not recalculate KPI values or infer causality."],
  };
}
