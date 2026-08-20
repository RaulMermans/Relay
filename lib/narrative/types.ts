import type { ChangeIntelligenceExecutionResult, ChangeObservation, TargetEvaluation } from "../change-intelligence/types";
import type { DataHealthResult, ProviderSource, ResolvedReportingPeriod } from "../data-health/types";
import type { KpiExecutionResult } from "../kpi/types";
import type { WorkspaceSourceSummary } from "../workspace/analyze-workspace";

export type NarrativeEvidenceKind = "kpi" | "observation" | "target" | "data_health" | "freshness";

export type NarrativeEvidenceRef = {
  kind: NarrativeEvidenceKind;
  id: string;
};

export type NarrativeScope = "report" | "source" | "data_health" | "freshness";
export type NarrativeType = "growth" | "decline" | "efficiency" | "tradeoff" | "target" | "health" | "freshness" | "channel";

export type NarrativeItem = {
  id: string;
  type: NarrativeType;
  title: string;
  text: string;
  evidenceRefs: NarrativeEvidenceRef[];
  priority: number;
  scope: NarrativeScope;
};

export type NarrativeResult = {
  status: "ready" | "blocked";
  headline: string;
  summary: string;
  highlights: NarrativeItem[];
  attention: NarrativeItem[];
  channelSummaries: NarrativeItem[];
  methodologyNotes: string[];
};

export type NarrativeContext = {
  reportingPeriod: ResolvedReportingPeriod;
  dataHealth: DataHealthResult;
  kpis: KpiExecutionResult;
  observations: Pick<ChangeIntelligenceExecutionResult, "status" | "observations">;
  targets: TargetEvaluation[];
  sources: WorkspaceSourceSummary[];
  freshness: "current" | "needs_refresh" | "old";
};

export type NarrativeObservation = ChangeObservation & { source?: ProviderSource };
