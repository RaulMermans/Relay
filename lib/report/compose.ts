import type { ProviderSource } from "../data-health/types";
import type { KpiMetricKey, KpiMetricResult } from "../kpi/types";
import { formatMetricValue, formatPercentageChange } from "../presentation";
import { freshnessStatus, type FreshnessStatus } from "../persistence/analysis-memory";
import type { AnalysisSnapshot, ClientMemory, ReportSection } from "../persistence/types";
import { REPORT_SCHEMA_VERSION, ReportCompositionError, type ReportDocument, type ReportMetric, type ReportSource } from "./types";

const SOURCE_LABELS: Record<ProviderSource, string> = { meta_ads: "Meta Ads", google_ads: "Google Ads", shopify: "Shopify" };
const METRIC_LABELS: Record<KpiMetricKey, string> = {
  spend: "Spend", commerce_revenue: "Commerce Revenue", orders: "Orders", impressions: "Impressions", clicks: "Clicks",
  conversions: "Conversions", attributed_revenue: "Attributed Revenue", ctr: "CTR", cpc: "CPC", cpa: "CPA", roas: "ROAS",
  mer: "MER", aov: "Average Order Value", conversion_rate: "Conversion Rate",
};

function stableHash(value: string): string {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

function reportMetric(metric: KpiMetricResult, source?: ProviderSource): ReportMetric {
  return { key: metric.key, label: METRIC_LABELS[metric.key], value: formatMetricValue(metric, metric.value), comparison: formatPercentageChange(metric.comparison.percentageChange), ...(source ? { source } : {}) };
}

function available(metrics: KpiMetricResult[], keys: KpiMetricKey[]): ReportMetric[] {
  return keys.flatMap((key) => {
    const metric = metrics.find((item) => item.key === key && item.status === "available");
    return metric ? [reportMetric(metric)] : [];
  });
}

function assertFacts(snapshot: AnalysisSnapshot, client: ClientMemory) {
  if (snapshot.dataHealth.status === "blocked" || snapshot.kpis.status === "blocked") {
    throw new ReportCompositionError("REPORT_BLOCKED", "Resolve the blocking Data Health findings before creating a performance report.");
  }
  if (!snapshot.narrative) throw new ReportCompositionError("REPORT_NARRATIVE_MISSING", "Update data to prepare this report from a complete analysis snapshot.");
  if (client.sourceOfTruth.commerceRevenueSource !== "shopify") throw new ReportCompositionError("REPORT_FACTS_INCONSISTENT", "Relay’s Commerce Revenue source must remain Shopify.");
  for (const metric of snapshot.kpis.metrics) {
    if (metric.key === "commerce_revenue" && metric.inputs.some((input) => input.source !== "shopify")) throw new ReportCompositionError("REPORT_FACTS_INCONSISTENT", "Commerce Revenue must only use Shopify facts.");
    if (metric.key === "attributed_revenue") throw new ReportCompositionError("REPORT_FACTS_INCONSISTENT", "Provider-attributed revenue cannot appear as a workspace total.");
  }
}

function dataThrough(snapshot: AnalysisSnapshot): string | null {
  return snapshot.sourceFreshness.reduce<string | null>((earliest, item) => earliest === null || item.dataThrough < earliest ? item.dataThrough : earliest, null);
}

function reportSources(snapshot: AnalysisSnapshot): ReportSource[] {
  if (snapshot.kpis.status !== "ready") return [];
  return snapshot.sources.map((summary) => {
    const metrics = snapshot.kpis.sourceBreakdown.find((item) => item.source === summary.source)?.metrics ?? [];
    const keys: KpiMetricKey[] = summary.source === "shopify" ? ["commerce_revenue", "orders", "aov"] : ["spend", "roas", "cpa", "conversions"];
    return { source: summary.source, label: SOURCE_LABELS[summary.source], status: summary.status, metrics: available(metrics, keys), dataThrough: summary.dateRange.end };
  });
}

export function composeReport(input: { client: ClientMemory; snapshot: AnalysisSnapshot; generatedAt: string; freshness?: FreshnessStatus }): ReportDocument {
  const { client, snapshot } = input;
  assertFacts(snapshot, client);
  if (snapshot.kpis.status !== "ready" || !snapshot.narrative) throw new ReportCompositionError("REPORT_BLOCKED", "A ready analysis is required.");
  const freshness = input.freshness ?? freshnessStatus(snapshot, input.generatedAt);
  const through = dataThrough(snapshot);
  const reportId = `rpt_${stableHash([REPORT_SCHEMA_VERSION, client.id, snapshot.id, snapshot.reportingPeriod.currentPeriod.start, snapshot.reportingPeriod.currentPeriod.end].join("|"))}`;
  const missingCommerce = !snapshot.sources.some((source) => source.source === "shopify");
  return {
    version: REPORT_SCHEMA_VERSION, reportId, snapshotId: snapshot.id,
    client: { id: client.id, name: client.name, cadence: client.reporting.cadence }, reportingPeriod: snapshot.reportingPeriod, generatedAt: input.generatedAt,
    freshness: { status: freshness, dataThrough: through }, dataHealth: { status: snapshot.dataHealth.status, findings: snapshot.dataHealth.findings, sourceCoverage: snapshot.dataHealth.sourceCoverage },
    executive: { headline: snapshot.narrative.headline, summary: snapshot.narrative.summary },
    performance: available(snapshot.kpis.metrics, missingCommerce ? ["spend", "conversions", "cpa"] : ["commerce_revenue", "spend", "mer", "orders"]),
    trend: snapshot.trend, developments: [...snapshot.narrative.highlights, ...snapshot.narrative.channelSummaries].slice(0, 5), channels: reportSources(snapshot), attention: snapshot.narrative.attention,
    healthFindings: snapshot.dataHealth.findings.filter((finding) => finding.blocking || finding.severity === "warning"),
    methodology: [
      "Commerce Revenue is reported from Shopify only.",
      "Meta Ads and Google Ads revenue, ROAS, and CPA remain provider-specific and are not combined as total revenue.",
      "MER is Shopify Commerce Revenue divided by compatible paid spend when those facts are available.",
      `Comparison uses the immediately previous equal-length period: ${snapshot.reportingPeriod.comparisonPeriod.start} to ${snapshot.reportingPeriod.comparisonPeriod.end}.`,
      ...snapshot.narrative.methodologyNotes,
    ],
    sections: client.reportPreferences.sections as ReportSection[], missingCommerce,
  };
}

export function isReportStale(document: ReportDocument, snapshot: AnalysisSnapshot | undefined): boolean {
  return !snapshot || document.snapshotId !== snapshot.id;
}

export function reportFilename(document: ReportDocument): string {
  const safeClient = document.client.name.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "client";
  return `relay-${safeClient}-${document.reportingPeriod.currentPeriod.start}-to-${document.reportingPeriod.currentPeriod.end}.pdf`;
}
