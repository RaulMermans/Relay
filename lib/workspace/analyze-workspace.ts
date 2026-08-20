import { runChangeIntelligence } from "../change-intelligence/engine";
import type { ChangeTarget } from "../change-intelligence/types";
import { runDataHealth } from "../data-health/run-data-health";
import { enumerateDates } from "../data-health/reporting-period";
import type { DataHealthResult, ProviderSource, ReportingPeriod } from "../data-health/types";
import { runKpiEngine } from "../kpi/engine";
import { generateNarrative } from "../narrative/generate";
import { add } from "../kpi/arithmetic";
import type { CanonicalField, MappingOverride, MappingProposal } from "../mapping/types";
import { normalizeCsvFile } from "../normalization/normalize-csv";
import type { AdvertisingObservation, CommerceObservation } from "../normalization/types";

const SOURCE_ORDER: ProviderSource[] = ["meta_ads", "google_ads", "shopify"];

export type WorkspaceTrendPoint = {
  date: string;
  paidSpend: string | null;
  commerceRevenue: string | null;
};

export type WorkspaceSourceSummary = {
  source: ProviderSource;
  status: "ready" | "review" | "blocked" | "missing";
  normalizedRowCount: number;
  dateRange: { start: string; end: string };
  currencies: string[];
};

export type WorkspaceSavedMapping = {
  header: string;
  canonicalField: CanonicalField | null;
};

export type WorkspaceMappingDecision = WorkspaceSavedMapping & {
  provider: ProviderSource;
  origin: "catalog" | "saved_client_mapping" | "manual_current_session";
};

export type WorkspaceAnalysisInput = {
  files: Partial<Record<ProviderSource, File>>;
  expectedSources: ProviderSource[];
  reportingPeriod: ReportingPeriod;
  mappingOverrides?: Partial<Record<ProviderSource, MappingOverride[]>>;
  savedMappings?: Partial<Record<ProviderSource, WorkspaceSavedMapping[]>>;
  targets: ChangeTarget[];
  ingestionId: (source: ProviderSource) => string;
};

export type WorkspaceAnalysisResult =
  | {
      status: "mapping_required";
      exceptions: Array<{ source: ProviderSource; mapping: MappingProposal }>;
    }
  | {
      status: "ready";
      sources: WorkspaceSourceSummary[];
      dataHealth: DataHealthResult;
      kpis: ReturnType<typeof runKpiEngine>;
      changeIntelligence: ReturnType<typeof runChangeIntelligence>;
      narrative: ReturnType<typeof generateNarrative>;
      trend: WorkspaceTrendPoint[];
      mappingMemory: WorkspaceMappingDecision[];
      mappingReuseCount: number;
    };

export class WorkspaceAnalysisError extends Error {
  constructor(
    readonly code: "WORKSPACE_FILE_MISSING" | "SOURCE_UNSUPPORTED" | "SOURCE_SLOT_MISMATCH",
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceAnalysisError";
  }
}

function reusableSavedOverrides(
  mapping: MappingProposal,
  saved: WorkspaceSavedMapping[],
  manual: MappingOverride[],
): MappingOverride[] {
  const manualColumns = new Set(manual.map((item) => item.columnIndex));
  const occupiedTargets = new Set(mapping.fields
    .filter((field) => field.status === "mapped" && field.canonicalField !== null)
    .map((field) => field.canonicalField));
  const reused: MappingOverride[] = [];
  for (const field of mapping.fields) {
    if (manualColumns.has(field.columnIndex) || field.status === "mapped") continue;
    const rule = saved.find((item) => item.header === field.header);
    if (!rule) continue;
    if (rule.canonicalField !== null && (!field.candidates.includes(rule.canonicalField) || occupiedTargets.has(rule.canonicalField))) continue;
    reused.push({ columnIndex: field.columnIndex, canonicalField: rule.canonicalField });
    if (rule.canonicalField !== null) occupiedTargets.add(rule.canonicalField);
  }
  return reused;
}

function mappingDecisions(
  source: ProviderSource,
  mapping: MappingProposal,
  manual: MappingOverride[],
  saved: MappingOverride[],
): WorkspaceMappingDecision[] {
  const manualColumns = new Set(manual.map((item) => item.columnIndex));
  const savedColumns = new Set(saved.map((item) => item.columnIndex));
  return mapping.fields.flatMap((field): WorkspaceMappingDecision[] => {
    const explicitlyOverridden = manualColumns.has(field.columnIndex) || savedColumns.has(field.columnIndex);
    if ((field.origin === null && !explicitlyOverridden) || (field.canonicalField === null && field.status !== "ignored")) return [];
    const origin = manualColumns.has(field.columnIndex)
      ? "manual_current_session"
      : savedColumns.has(field.columnIndex)
        ? "saved_client_mapping"
        : "catalog";
    return [{ provider: source, header: field.header, canonicalField: field.canonicalField, origin }];
  });
}

function dailyTrend(
  observations: Array<AdvertisingObservation | CommerceObservation>,
  dataHealth: DataHealthResult,
): WorkspaceTrendPoint[] {
  if (dataHealth.status === "blocked") return [];
  const { start, end } = dataHealth.reportingPeriod.currentPeriod;
  return enumerateDates(start, end).map((date) => {
    let paidSpend: string | null = null;
    let commerceRevenue: string | null = null;
    for (const observation of observations) {
      if (observation.date !== date) continue;
      if (observation.domain === "advertising" && observation.spend !== null) {
        paidSpend = paidSpend === null ? observation.spend : add(paidSpend, observation.spend);
      }
      if (observation.domain === "commerce" && observation.grossRevenue !== null) {
        commerceRevenue = commerceRevenue === null
          ? observation.grossRevenue
          : add(commerceRevenue, observation.grossRevenue);
      }
    }
    return { date, paidSpend, commerceRevenue };
  });
}

export async function analyzeWorkspace(input: WorkspaceAnalysisInput): Promise<WorkspaceAnalysisResult> {
  const receivedSources = SOURCE_ORDER.filter((source) => input.files[source]);
  if (receivedSources.length === 0) {
    throw new WorkspaceAnalysisError("WORKSPACE_FILE_MISSING", "Add at least one CSV before analysis.");
  }

  const normalized = [];
  const exceptions: Array<{ source: ProviderSource; mapping: MappingProposal }> = [];
  const persistedMappings: WorkspaceMappingDecision[] = [];
  let mappingReuseCount = 0;
  for (const source of receivedSources) {
    const manualOverrides = input.mappingOverrides?.[source] ?? [];
    let result = await normalizeCsvFile(input.files[source], {
      ingestionId: input.ingestionId(source),
      mappingOverrides: manualOverrides,
    });
    if (result.status === "source_unsupported") {
      throw new WorkspaceAnalysisError("SOURCE_UNSUPPORTED", "Relay could not identify one of the uploaded CSV files.");
    }
    if (result.provider !== source) {
      throw new WorkspaceAnalysisError("SOURCE_SLOT_MISMATCH", "The uploaded CSV does not match its selected source.");
    }
    let savedOverrides: MappingOverride[] = [];
    if (result.status === "mapping_required" && (input.savedMappings?.[source]?.length ?? 0) > 0) {
      savedOverrides = reusableSavedOverrides(result.mapping, input.savedMappings?.[source] ?? [], manualOverrides);
      if (savedOverrides.length > 0) {
        result = await normalizeCsvFile(input.files[source], {
          ingestionId: input.ingestionId(source),
          mappingOverrides: [...manualOverrides, ...savedOverrides],
        });
      }
    }
    if (result.status === "source_unsupported") {
      throw new WorkspaceAnalysisError("SOURCE_UNSUPPORTED", "Relay could not identify one of the uploaded CSV files.");
    }
    if (result.provider !== source) {
      throw new WorkspaceAnalysisError("SOURCE_SLOT_MISMATCH", "The uploaded CSV does not match its selected source.");
    }
    if (result.status === "mapping_required") {
      exceptions.push({ source, mapping: result.mapping });
    } else {
      normalized.push(result);
      mappingReuseCount += savedOverrides.length;
      persistedMappings.push(...mappingDecisions(source, result.mapping, manualOverrides, savedOverrides));
    }
  }
  if (exceptions.length > 0) return { status: "mapping_required", exceptions };

  const observations = normalized.flatMap((result) => result.observations);
  const dataHealth = runDataHealth({
    observations,
    reportingPeriod: input.reportingPeriod,
    expectedSources: input.expectedSources,
    sourceInputs: normalized.map((result) => ({ source: result.provider, mapping: result.mapping })),
  });
  const kpis = runKpiEngine({ observations, reportingPeriod: dataHealth.reportingPeriod, dataHealthStatus: dataHealth.status });
  const changeIntelligence = runChangeIntelligence({
    kpiResult: kpis,
    reportingPeriod: dataHealth.reportingPeriod,
    dataHealthStatus: dataHealth.status,
    targets: input.targets,
  });
  const coverage = new Map(dataHealth.sourceCoverage.map((item) => [item.source, item]));
  const sources = normalized.map((result): WorkspaceSourceSummary => ({
    source: result.provider,
    status: dataHealth.findings.some((finding) => finding.blocking && (!finding.source || finding.source === result.provider))
      ? "blocked"
      : coverage.get(result.provider)?.status ?? "review",
    normalizedRowCount: result.summary.normalizedRowCount,
    dateRange: result.summary.dateRange,
    currencies: result.summary.currencies,
  }));
  const narrative = generateNarrative({
    reportingPeriod: dataHealth.reportingPeriod,
    dataHealth,
    kpis,
    observations: changeIntelligence,
    targets: changeIntelligence.targetEvaluations,
    sources,
    freshness: "current",
  });

  return {
    status: "ready",
    sources,
    dataHealth,
    kpis,
    changeIntelligence,
    narrative,
    trend: dailyTrend(observations, dataHealth),
    mappingMemory: persistedMappings,
    mappingReuseCount,
  };
}
