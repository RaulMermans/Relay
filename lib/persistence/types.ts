import type { ChangeObservation, ChangeTarget, TargetEvaluation } from "../change-intelligence/types";
import type { DataHealthResult, ProviderSource, ResolvedReportingPeriod } from "../data-health/types";
import type { KpiExecutionResult, KpiMetricKey, KpiUnit } from "../kpi/types";
import type { CanonicalField } from "../mapping/types";
import type { WorkspaceSourceSummary, WorkspaceTrendPoint } from "../workspace/analyze-workspace";

export type SourceConfiguration = {
  expected: boolean;
  preferredTransport: "csv";
};

export type SourceConfigurations = Record<ProviderSource, SourceConfiguration>;

export type MappingMemoryEntry = {
  provider: ProviderSource;
  header: string;
  canonicalField: CanonicalField | null;
  origin: "catalog" | "manual_current_session";
  updatedAt: string;
};

export type SourceOfTruthRules = {
  commerceRevenueSource: "shopify";
  advertisingAttribution: {
    meta_ads: "provider_attribution";
    google_ads: "provider_attribution";
  };
};

export type AttributionNote = {
  id: string;
  text: string;
  updatedAt: string;
};

export type ReportingConfiguration = {
  cadence: "weekly" | "monthly";
  comparisonMode: "previous_equal_period";
  preferredPeriodLength?: number;
};

export type ReportSection = "performance" | "what_changed" | "channels" | "attention" | "methodology";

export type ReportPreferences = {
  sections: ReportSection[];
};

export type LocalWorkflowMetrics = {
  firstSetupStartedAt?: string;
  firstAnalysisAt?: string;
  lastCycleStartedAt?: string;
  mappingReuseCount: number;
  mappingEligibleCount: number;
  dashboardReturnCount: number;
};

export type SourceFreshness = {
  source: ProviderSource;
  dataThrough: string;
  observationCount: number;
};

export type SnapshotChangeIntelligence = {
  status: "ready" | "blocked";
  observations: ChangeObservation[];
  targetEvaluations: TargetEvaluation[];
};

export type AnalysisSnapshot = {
  id: string;
  analyzedAt: string;
  reportingPeriod: ResolvedReportingPeriod;
  sourceFreshness: SourceFreshness[];
  sources: WorkspaceSourceSummary[];
  dataHealth: DataHealthResult;
  kpis: KpiExecutionResult;
  changeIntelligence: SnapshotChangeIntelligence;
  trend: WorkspaceTrendPoint[];
};

export type HeadlineKpi = {
  key: KpiMetricKey;
  value: string | null;
  unit: KpiUnit;
};

export type ReportCycleSummary = {
  id: string;
  period: ResolvedReportingPeriod;
  analyzedAt: string;
  sources: ProviderSource[];
  healthStatus: DataHealthResult["status"];
  headlineKpis: HeadlineKpi[];
  highlightObservationIds: string[];
};

export type ClientMemory = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  reporting: ReportingConfiguration;
  sources: SourceConfigurations;
  targets: ChangeTarget[];
  sourceOfTruth: SourceOfTruthRules;
  attributionNotes: AttributionNote[];
  mappingMemory: MappingMemoryEntry[];
  reportPreferences: ReportPreferences;
  latestAnalysisSnapshot?: AnalysisSnapshot;
  reportHistory: ReportCycleSummary[];
  workflow: LocalWorkflowMetrics;
};

export type RelayMemoryV1 = {
  version: 1;
  activeClientId?: string;
  clients: ClientMemory[];
};

export type MemoryLoadResult = {
  status: "empty" | "ready" | "invalid";
  memory: RelayMemoryV1;
  reason?: "corrupt" | "unsupported_version" | "oversized" | "unavailable";
};
