import type { MappingProposal, ProviderSource } from "../mapping/types";
import type { AdvertisingObservation, CommerceObservation } from "../normalization/types";

export type { ProviderSource } from "../mapping/types";

export const PROVIDER_SOURCES = ["meta_ads", "google_ads", "shopify"] as const;

export type CanonicalObservation = AdvertisingObservation | CommerceObservation;
export type DataHealthCategory =
  | "structure"
  | "mapping"
  | "dates"
  | "currency"
  | "duplicates"
  | "provenance"
  | "source_coverage"
  | "reconciliation";
export type DataHealthSeverity = "info" | "warning" | "error";
export type DataHealthStatus = "healthy" | "review_required" | "blocked";
export type FindingStatus = "open";
export type SafeEvidenceValue = string | number | boolean | string[];
export type DateRange = { start: string; end: string };

export type DataHealthFinding = {
  id: string;
  code: string;
  category: DataHealthCategory;
  severity: DataHealthSeverity;
  status: FindingStatus;
  source?: ProviderSource;
  field?: string;
  period?: DateRange;
  message: string;
  evidence: Record<string, SafeEvidenceValue>;
  blocking: boolean;
};

export type ReportingPeriod = {
  currentPeriod: DateRange;
  comparisonPeriod?: DateRange;
};

export type ResolvedReportingPeriod = {
  currentPeriod: DateRange;
  comparisonPeriod: DateRange;
};

export type DataHealthSourceInput = {
  source: ProviderSource;
  mapping?: MappingProposal;
};

export type SourceCoverage = {
  source: ProviderSource;
  status: "ready" | "review" | "blocked" | "missing";
  observationCount: number;
  currentPeriodObservationCount: number;
  start: string | null;
  end: string | null;
  currencies: string[];
};

export type DataHealthInput = {
  observations: CanonicalObservation[];
  reportingPeriod: ReportingPeriod;
  expectedSources: ProviderSource[];
  sourceInputs?: DataHealthSourceInput[];
};

export type DataHealthResult = {
  status: DataHealthStatus;
  counts: Record<DataHealthSeverity, number>;
  checksRun: string[];
  findings: DataHealthFinding[];
  sourceCoverage: SourceCoverage[];
  reportingPeriod: ResolvedReportingPeriod;
};

export class DataHealthInputError extends Error {
  constructor(
    readonly code: "INVALID_REPORTING_PERIOD" | "INVALID_EXPECTED_SOURCES",
    message: string,
  ) {
    super(message);
    this.name = "DataHealthInputError";
  }
}

export function isProviderSource(value: unknown): value is ProviderSource {
  return typeof value === "string" && PROVIDER_SOURCES.includes(value as ProviderSource);
}

export function createFinding(
  input: Omit<DataHealthFinding, "id" | "status" | "blocking"> & { scope?: string },
): DataHealthFinding {
  const periodKey = input.period ? `${input.period.start}-${input.period.end}` : "all-periods";
  const id = [input.code, input.source ?? "all-sources", input.field ?? "all-fields", periodKey, input.scope ?? "all"]
    .join(":")
    .replace(/[^A-Za-z0-9:_-]/g, "_");
  return {
    ...input,
    id,
    status: "open",
    blocking: input.severity === "error",
  };
}
