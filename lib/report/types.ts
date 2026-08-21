import type { DataHealthFinding, DataHealthResult, ProviderSource, ResolvedReportingPeriod } from "../data-health/types";
import type { KpiMetricResult } from "../kpi/types";
import type { NarrativeItem, NarrativeResult } from "../narrative/types";
import type { FreshnessStatus } from "../persistence/analysis-memory";

export const REPORT_SCHEMA_VERSION = "1" as const;

export type ReportMetric = {
  key: KpiMetricResult["key"];
  label: string;
  value: string;
  comparison: string;
  source?: ProviderSource;
};

export type ReportSource = {
  source: ProviderSource;
  label: string;
  status: "ready" | "review" | "blocked" | "missing";
  metrics: ReportMetric[];
  dataThrough: string;
};

export type ReportDocument = {
  version: typeof REPORT_SCHEMA_VERSION;
  reportId: string;
  snapshotId: string;
  client: { id: string; name: string; cadence: "weekly" | "monthly" };
  reportingPeriod: ResolvedReportingPeriod;
  generatedAt: string;
  freshness: { status: FreshnessStatus; dataThrough: string | null };
  dataHealth: Pick<DataHealthResult, "status" | "findings" | "sourceCoverage">;
  executive: Pick<NarrativeResult, "headline" | "summary">;
  performance: ReportMetric[];
  trend: Array<{ date: string; paidSpend: string | null; commerceRevenue: string | null }>;
  developments: NarrativeItem[];
  channels: ReportSource[];
  attention: NarrativeItem[];
  healthFindings: DataHealthFinding[];
  methodology: string[];
  sections: Array<"performance" | "what_changed" | "channels" | "attention" | "methodology">;
  missingCommerce: boolean;
};

export class ReportCompositionError extends Error {
  constructor(readonly code: "REPORT_BLOCKED" | "REPORT_FACTS_INCONSISTENT" | "REPORT_NARRATIVE_MISSING", message: string) {
    super(message);
    this.name = "ReportCompositionError";
  }
}
