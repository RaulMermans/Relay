import type { ChangeTarget } from "../change-intelligence/types";
import type { ProviderSource } from "../data-health/types";
import type { WorkspaceAnalysisResult, WorkspaceSavedMapping } from "../workspace/analyze-workspace";
import { appendAnalysisCycle } from "./client-memory";
import { MEMORY_LIMITS } from "./schema";
import type { AnalysisSnapshot, ClientMemory, MappingMemoryEntry } from "./types";

type ReadyAnalysis = Extract<WorkspaceAnalysisResult, { status: "ready" }>;

export function clientMappingRequest(client: ClientMemory): Partial<Record<ProviderSource, WorkspaceSavedMapping[]>> {
  const result: Partial<Record<ProviderSource, WorkspaceSavedMapping[]>> = {};
  for (const mapping of client.mappingMemory) {
    (result[mapping.provider] ??= []).push({ header: mapping.header, canonicalField: mapping.canonicalField });
  }
  return result;
}

function mergeMappings(client: ClientMemory, analysis: ReadyAnalysis, now: string): MappingMemoryEntry[] {
  const mappings = [...client.mappingMemory];
  for (const decision of analysis.mappingMemory) {
    const index = mappings.findIndex((item) => item.provider === decision.provider && item.header === decision.header);
    const existing = index >= 0 ? mappings[index] : undefined;
    const next: MappingMemoryEntry = {
      provider: decision.provider,
      header: decision.header,
      canonicalField: decision.canonicalField,
      origin: decision.origin === "saved_client_mapping" ? existing?.origin ?? "manual_current_session" : decision.origin,
      updatedAt: now,
    };
    if (index >= 0) mappings[index] = next;
    else mappings.push(next);
  }
  return mappings.slice(-MEMORY_LIMITS.mappingsPerClient);
}

export function createAnalysisSnapshot(analysis: ReadyAnalysis, input: { snapshotId: string; analyzedAt: string }): AnalysisSnapshot {
  return {
    id: input.snapshotId,
    analyzedAt: input.analyzedAt,
    reportingPeriod: analysis.dataHealth.reportingPeriod,
    sourceFreshness: analysis.sources.map((source) => ({
      source: source.source,
      dataThrough: source.dateRange.end,
      observationCount: source.normalizedRowCount,
    })),
    sources: analysis.sources,
    dataHealth: analysis.dataHealth,
    kpis: analysis.kpis,
    narrative: analysis.narrative,
    changeIntelligence: {
      status: analysis.changeIntelligence.status,
      observations: analysis.changeIntelligence.observations,
      targetEvaluations: analysis.changeIntelligence.targetEvaluations,
    },
    trend: analysis.trend,
  };
}

export function recordWorkspaceAnalysis(
  client: ClientMemory,
  analysis: ReadyAnalysis,
  input: { snapshotId: string; analyzedAt: string; targets: ChangeTarget[] },
): ClientMemory {
  const snapshot = createAnalysisSnapshot(analysis, input);
  const expected = new Set(analysis.sources.map((source) => source.source));
  const withCycle = appendAnalysisCycle({
    ...client,
    targets: input.targets,
    mappingMemory: mergeMappings(client, analysis, input.analyzedAt),
    sources: {
      meta_ads: { ...client.sources.meta_ads, expected: client.sources.meta_ads.expected || expected.has("meta_ads") },
      google_ads: { ...client.sources.google_ads, expected: client.sources.google_ads.expected || expected.has("google_ads") },
      shopify: { ...client.sources.shopify, expected: client.sources.shopify.expected || expected.has("shopify") },
    },
    workflow: {
      ...client.workflow,
      mappingReuseCount: client.workflow.mappingReuseCount + analysis.mappingReuseCount,
      mappingEligibleCount: client.workflow.mappingEligibleCount + analysis.mappingMemory.length,
    },
  }, snapshot);
  return withCycle;
}

export type FreshnessStatus = "current" | "needs_refresh" | "old";

export function freshnessStatus(
  snapshot: Pick<AnalysisSnapshot, "analyzedAt" | "sourceFreshness">,
  now = new Date().toISOString(),
): FreshnessStatus {
  const dataThrough = snapshot.sourceFreshness.reduce<string | null>((earliest, source) => (
    earliest === null || source.dataThrough < earliest ? source.dataThrough : earliest
  ), null);
  const baseline = dataThrough ? Date.parse(`${dataThrough}T00:00:00.000Z`) : Date.parse(snapshot.analyzedAt);
  const current = Date.parse(now);
  if (!Number.isFinite(baseline) || !Number.isFinite(current)) return "old";
  const elapsedDays = Math.max(0, Math.floor((current - baseline) / 86_400_000));
  if (elapsedDays <= 1) return "current";
  if (elapsedDays <= 7) return "needs_refresh";
  return "old";
}
