import type { KpiMetricResult } from "../kpi/types";
import { MEMORY_LIMITS } from "./schema";
import type { AnalysisSnapshot, ClientMemory, RelayMemoryV1, ReportCycleSummary } from "./types";

const DEFAULT_SECTIONS = ["performance", "what_changed", "channels", "attention", "methodology"] as const;

export function createEmptyMemory(): RelayMemoryV1 {
  return { version: 1, clients: [] };
}

function newClient(input: { id: string; name: string; now: string }): ClientMemory {
  return {
    id: input.id,
    name: input.name.trim(),
    createdAt: input.now,
    updatedAt: input.now,
    reporting: { cadence: "weekly", comparisonMode: "previous_equal_period" },
    sources: {
      meta_ads: { expected: false, preferredTransport: "csv" },
      google_ads: { expected: false, preferredTransport: "csv" },
      shopify: { expected: false, preferredTransport: "csv" },
    },
    targets: [],
    sourceOfTruth: {
      commerceRevenueSource: "shopify",
      advertisingAttribution: { meta_ads: "provider_attribution", google_ads: "provider_attribution" },
    },
    attributionNotes: [],
    mappingMemory: [],
    reportPreferences: { sections: [...DEFAULT_SECTIONS] },
    reportHistory: [],
    workflow: { mappingReuseCount: 0, mappingEligibleCount: 0, dashboardReturnCount: 0 },
  };
}

export function createClient(memory: RelayMemoryV1, input: { id: string; name: string; now: string }): RelayMemoryV1 {
  if (!input.name.trim()) throw new Error("CLIENT_NAME_REQUIRED");
  if (memory.clients.length >= MEMORY_LIMITS.clients) throw new Error("CLIENT_LIMIT_REACHED");
  if (memory.clients.some((client) => client.id === input.id)) throw new Error("CLIENT_ID_DUPLICATE");
  return { ...memory, activeClientId: input.id, clients: [...memory.clients, newClient(input)] };
}

export function selectClient(memory: RelayMemoryV1, clientId: string): RelayMemoryV1 {
  if (!memory.clients.some((client) => client.id === clientId)) throw new Error("CLIENT_NOT_FOUND");
  return { ...memory, activeClientId: clientId };
}

export function updateClient(memory: RelayMemoryV1, clientId: string, update: (client: ClientMemory) => ClientMemory): RelayMemoryV1 {
  let found = false;
  const clients = memory.clients.map((client) => {
    if (client.id !== clientId) return client;
    found = true;
    const next = update(client);
    if (next.id !== client.id) throw new Error("CLIENT_ID_IMMUTABLE");
    return next;
  });
  if (!found) throw new Error("CLIENT_NOT_FOUND");
  return { ...memory, clients };
}

export function renameClient(memory: RelayMemoryV1, clientId: string, name: string, now: string): RelayMemoryV1 {
  if (!name.trim()) throw new Error("CLIENT_NAME_REQUIRED");
  return updateClient(memory, clientId, (client) => ({ ...client, name: name.trim(), updatedAt: now }));
}

export function deleteClient(memory: RelayMemoryV1, clientId: string): RelayMemoryV1 {
  if (!memory.clients.some((client) => client.id === clientId)) throw new Error("CLIENT_NOT_FOUND");
  const clients = memory.clients.filter((client) => client.id !== clientId);
  const activeClientId = memory.activeClientId === clientId ? clients[0]?.id : memory.activeClientId;
  return { version: 1, ...(activeClientId ? { activeClientId } : {}), clients };
}

function headlineMetrics(metrics: KpiMetricResult[]): ReportCycleSummary["headlineKpis"] {
  const order = ["commerce_revenue", "spend", "mer", "orders", "cpa", "roas"];
  return [...metrics]
    .filter((metric) => metric.status === "available")
    .sort((left, right) => order.indexOf(left.key) - order.indexOf(right.key))
    .slice(0, 4)
    .map((metric) => ({ key: metric.key, value: metric.value, unit: metric.unit }));
}

export function reportCycleSummary(snapshot: AnalysisSnapshot): ReportCycleSummary {
  return {
    id: snapshot.id,
    period: snapshot.reportingPeriod,
    analyzedAt: snapshot.analyzedAt,
    sources: snapshot.sources.map((source) => source.source),
    healthStatus: snapshot.dataHealth.status,
    headlineKpis: headlineMetrics(snapshot.kpis.metrics),
    highlightObservationIds: snapshot.changeIntelligence.observations.slice(0, 4).map((item) => item.id),
  };
}

export function appendAnalysisCycle(client: ClientMemory, snapshot: AnalysisSnapshot): ClientMemory {
  const summary = reportCycleSummary(snapshot);
  const reportHistory = [summary, ...client.reportHistory.filter((item) => item.id !== summary.id)]
    .slice(0, MEMORY_LIMITS.historyPerClient);
  return {
    ...client,
    updatedAt: snapshot.analyzedAt,
    latestAnalysisSnapshot: snapshot,
    reportHistory,
    workflow: {
      ...client.workflow,
      firstAnalysisAt: client.workflow.firstAnalysisAt ?? snapshot.analyzedAt,
    },
  };
}
