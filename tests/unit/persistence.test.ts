import { describe, expect, it } from "vitest";

import {
  appendAnalysisCycle,
  createClient,
  createEmptyMemory,
  deleteClient,
  renameClient,
  selectClient,
  updateClient,
} from "../../lib/persistence/client-memory";
import {
  LocalBrowserMemory,
  RELAY_MEMORY_STORAGE_KEY,
  type StorageAdapter,
} from "../../lib/persistence/local-storage";
import {
  MEMORY_LIMITS,
  relayMemorySchema,
} from "../../lib/persistence/schema";
import type {
  AnalysisSnapshot,
  ClientMemory,
  RelayMemoryV1,
} from "../../lib/persistence/types";

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const NOW = "2026-08-17T10:00:00.000Z";

function client(memory: RelayMemoryV1, id: string): ClientMemory {
  const result = memory.clients.find((item) => item.id === id);
  if (!result) throw new Error(`Missing client ${id}`);
  return result;
}

function snapshot(id: string, analyzedAt = NOW): AnalysisSnapshot {
  return {
    id,
    analyzedAt,
    reportingPeriod: {
      currentPeriod: { start: "2026-08-04", end: "2026-08-10" },
      comparisonPeriod: { start: "2026-07-28", end: "2026-08-03" },
    },
    sourceFreshness: [
      { source: "meta_ads", dataThrough: "2026-08-10", observationCount: 7 },
      { source: "shopify", dataThrough: "2026-08-10", observationCount: 8 },
    ],
    sources: [
      { source: "meta_ads", status: "ready", normalizedRowCount: 7, dateRange: { start: "2026-08-04", end: "2026-08-10" }, currencies: ["EUR"] },
      { source: "shopify", status: "ready", normalizedRowCount: 8, dateRange: { start: "2026-08-04", end: "2026-08-10" }, currencies: ["EUR"] },
    ],
    dataHealth: {
      status: "healthy",
      counts: { info: 0, warning: 0, error: 0 },
      checksRun: ["source_coverage"],
      findings: [],
      sourceCoverage: [],
      reportingPeriod: {
        currentPeriod: { start: "2026-08-04", end: "2026-08-10" },
        comparisonPeriod: { start: "2026-07-28", end: "2026-08-03" },
      },
    },
    kpis: {
      status: "ready",
      period: {
        currentPeriod: { start: "2026-08-04", end: "2026-08-10" },
        comparisonPeriod: { start: "2026-07-28", end: "2026-08-03" },
      },
      metrics: [{
        key: "mer",
        value: "7.015306122449",
        unit: "ratio",
        status: "available",
        inputs: [
          { source: "shopify", field: "grossRevenue", period: "current", observationCount: 8, currencyCode: "EUR" },
          { source: "meta_ads", field: "spend", period: "current", observationCount: 7, currencyCode: "EUR" },
        ],
        formula: "commerce_revenue / spend",
        comparison: { current: "7.015306122449", previous: "6.5", absoluteChange: "0.515306122449", percentageChange: "0.079277865" },
      }],
      sourceBreakdown: [],
    },
    changeIntelligence: { status: "ready", observations: [], targetEvaluations: [] },
    trend: [{ date: "2026-08-10", paidSpend: "100", commerceRevenue: "701.5306122449" }],
  };
}

describe("client memory domain", () => {
  it("creates, selects, renames, and deletes isolated clients", () => {
    let memory = createEmptyMemory();
    memory = createClient(memory, { id: "client-a", name: "Acme", now: NOW });
    memory = createClient(memory, { id: "client-b", name: "Beacon", now: NOW });
    memory = updateClient(memory, "client-a", (current) => ({
      ...current,
      targets: [{ id: "mer", metric: "mer", scope: "report", operator: ">", value: "3.5", unit: "ratio" }],
      mappingMemory: [{ provider: "meta_ads", header: "Campaign", canonicalField: "campaign_name", origin: "manual_current_session", updatedAt: NOW }],
    }));
    memory = selectClient(memory, "client-b");
    memory = renameClient(memory, "client-b", "Beacon Labs", "2026-08-17T11:00:00.000Z");

    expect(memory.activeClientId).toBe("client-b");
    expect(client(memory, "client-b").name).toBe("Beacon Labs");
    expect(client(memory, "client-b").targets).toEqual([]);
    expect(client(memory, "client-a").targets).toHaveLength(1);

    memory = deleteClient(memory, "client-a");
    expect(memory.clients.map((item) => item.id)).toEqual(["client-b"]);
    expect(JSON.stringify(memory)).not.toContain("Campaign");
  });

  it("caps report-cycle history and retains authoritative snapshot values", () => {
    let memory = createClient(createEmptyMemory(), { id: "client-a", name: "Acme", now: NOW });
    for (let index = 0; index < MEMORY_LIMITS.historyPerClient + 3; index += 1) {
      memory = updateClient(memory, "client-a", (current) => appendAnalysisCycle(current, snapshot(`snapshot-${index}`)));
    }

    const saved = client(memory, "client-a");
    expect(saved.reportHistory).toHaveLength(MEMORY_LIMITS.historyPerClient);
    expect(saved.reportHistory[0]?.id).toBe(`snapshot-${MEMORY_LIMITS.historyPerClient + 2}`);
    expect(saved.latestAnalysisSnapshot?.kpis.metrics[0]?.value).toBe("7.015306122449");
    expect(JSON.stringify(saved)).not.toContain("7.02x");
  });
});

describe("versioned local browser store", () => {
  it("round-trips validated version 1 memory through one Relay namespace", () => {
    const storage = new MemoryStorage();
    const store = new LocalBrowserMemory(storage);
    const memory = createClient(createEmptyMemory(), { id: "client-a", name: "Acme", now: NOW });

    store.save(memory);
    expect([...storage.values.keys()]).toEqual([RELAY_MEMORY_STORAGE_KEY]);
    expect(store.load()).toEqual({ status: "ready", memory });
  });

  it.each([
    ["corrupt JSON", "{"],
    ["unsupported version", JSON.stringify({ version: 99, clients: [] })],
    ["strict sensitive field", JSON.stringify({ ...createEmptyMemory(), accessToken: "secret" })],
    ["prototype key", `{"version":1,"clients":[],"__proto__":{"polluted":true}}`],
  ])("fails safely for %s", (_label, persisted) => {
    const storage = new MemoryStorage();
    storage.setItem(RELAY_MEMORY_STORAGE_KEY, persisted);

    const result = new LocalBrowserMemory(storage).load();
    expect(result.status).toBe("invalid");
    expect(result.memory).toEqual(createEmptyMemory());
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("rejects oversized values before parsing", () => {
    const storage = new MemoryStorage();
    storage.setItem(RELAY_MEMORY_STORAGE_KEY, "x".repeat(MEMORY_LIMITS.serializedCharacters + 1));
    expect(new LocalBrowserMemory(storage).load().status).toBe("invalid");
  });

  it("rejects dangerous object keys before saving", () => {
    const storage = new MemoryStorage();
    const unsafe = JSON.parse(`{"version":1,"clients":[],"__proto__":{"polluted":true}}`) as RelayMemoryV1;

    expect(() => new LocalBrowserMemory(storage).save(unsafe)).toThrow("UNSAFE_MEMORY_KEY");
    expect(storage.getItem(RELAY_MEMORY_STORAGE_KEY)).toBeNull();
  });

  it("clears only Relay memory", () => {
    const storage = new MemoryStorage();
    storage.setItem(RELAY_MEMORY_STORAGE_KEY, JSON.stringify(createEmptyMemory()));
    storage.setItem("unrelated.preference", "keep");

    new LocalBrowserMemory(storage).reset();
    expect(storage.getItem(RELAY_MEMORY_STORAGE_KEY)).toBeNull();
    expect(storage.getItem("unrelated.preference")).toBe("keep");
  });

  it("enforces bounded clients, mappings, targets, notes, and schema fields", () => {
    const base = createClient(createEmptyMemory(), { id: "client-a", name: "Acme", now: NOW });
    const overMappings = updateClient(base, "client-a", (current) => ({
      ...current,
      mappingMemory: Array.from({ length: MEMORY_LIMITS.mappingsPerClient + 1 }, (_, index) => ({
        provider: "meta_ads" as const,
        header: `Header ${index}`,
        canonicalField: "campaign_name" as const,
        origin: "catalog" as const,
        updatedAt: NOW,
      })),
    }));

    expect(relayMemorySchema.safeParse(overMappings).success).toBe(false);
    expect(relayMemorySchema.safeParse({ ...base, clients: Array.from({ length: MEMORY_LIMITS.clients + 1 }, () => base.clients[0]) }).success).toBe(false);
  });

  it("uses the Change Intelligence target contract for persisted targets", () => {
    const base = createClient(createEmptyMemory(), { id: "client-a", name: "Acme", now: NOW });
    const unsupportedReportRoas = updateClient(base, "client-a", (current) => ({
      ...current,
      targets: [{ id: "roas", metric: "roas", scope: "report", operator: ">", value: "3", unit: "ratio" }],
    }));
    expect(relayMemorySchema.safeParse(unsupportedReportRoas).success).toBe(false);
  });
});
