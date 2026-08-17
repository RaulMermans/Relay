import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  clientMappingRequest,
  freshnessStatus,
  recordWorkspaceAnalysis,
} from "../../lib/persistence/analysis-memory";
import { createClient, createEmptyMemory, updateClient } from "../../lib/persistence/client-memory";
import { LocalBrowserMemory, type StorageAdapter } from "../../lib/persistence/local-storage";
import type { ClientMemory, RelayMemoryV1 } from "../../lib/persistence/types";
import { analyzeWorkspace } from "../../lib/workspace/analyze-workspace";

class MemoryStorage implements StorageAdapter {
  value: string | null = null;
  getItem(): string | null { return this.value; }
  setItem(_key: string, value: string): void { this.value = value; }
  removeItem(): void { this.value = null; }
}

async function fixtureFile(relativePath: string): Promise<File> {
  const content = await readFile(new URL(`../../fixtures/raw/${relativePath}`, import.meta.url), "utf8");
  return new File([content], relativePath.split("/").pop() ?? "fixture.csv", { type: "text/csv" });
}

function recurringMetaFile(date: string): File {
  return new File([
    "Date start,Campaign,Campaign name,Ad set name,Amount spent,Currency\n",
    `${date},Summer,Summer launch,Prospecting,123.45,USD\n`,
  ], "recurring-meta.csv", { type: "text/csv" });
}

function getClient(memory: RelayMemoryV1, id: string): ClientMemory {
  const result = memory.clients.find((client) => client.id === id);
  if (!result) throw new Error(`Missing ${id}`);
  return result;
}

describe("repeat reporting client memory", () => {
  it("reuses mappings, targets, source setup, and history without persisting raw CSV", async () => {
    const first = await analyzeWorkspace({
      files: { meta_ads: await fixtureFile("failures/meta-ambiguous-mapping.csv") },
      expectedSources: ["meta_ads"],
      reportingPeriod: { currentPeriod: { start: "2026-07-01", end: "2026-07-01" } },
      mappingOverrides: { meta_ads: [{ columnIndex: 1, canonicalField: "campaign_name" }, { columnIndex: 2, canonicalField: null }] },
      targets: [{ id: "meta-cpa", metric: "cpa", scope: "source", source: "meta_ads", operator: "<", value: "38", unit: "currency", currencyCode: "USD" }],
      ingestionId: () => "cycle-1",
    });
    expect(first.status).toBe("ready");
    if (first.status !== "ready") throw new Error("Expected first ready analysis.");

    let memory = createClient(createEmptyMemory(), { id: "client-a", name: "Acme", now: "2026-07-01T10:00:00.000Z" });
    memory = updateClient(memory, "client-a", (current) => recordWorkspaceAnalysis(current, first, {
      snapshotId: "cycle-1",
      analyzedAt: "2026-07-01T10:00:00.000Z",
      targets: [{ id: "meta-cpa", metric: "cpa", scope: "source", source: "meta_ads", operator: "<", value: "38", unit: "currency", currencyCode: "USD" }],
    }));

    const storage = new MemoryStorage();
    const store = new LocalBrowserMemory(storage);
    store.save(memory);
    const reloaded = store.load().memory;
    const savedClient = getClient(reloaded, "client-a");
    expect(savedClient.sources.meta_ads.expected).toBe(true);
    expect(savedClient.targets[0]?.value).toBe("38");
    expect(savedClient.mappingMemory).toEqual(expect.arrayContaining([
      expect.objectContaining({ provider: "meta_ads", header: "Campaign", canonicalField: "campaign_name", origin: "manual_current_session" }),
    ]));

    const second = await analyzeWorkspace({
      files: { meta_ads: recurringMetaFile("2026-07-08") },
      expectedSources: ["meta_ads"],
      reportingPeriod: { currentPeriod: { start: "2026-07-08", end: "2026-07-08" } },
      savedMappings: clientMappingRequest(savedClient),
      targets: savedClient.targets,
      ingestionId: () => "cycle-2",
    });
    expect(second.status).toBe("ready");
    if (second.status !== "ready") throw new Error("Expected saved mapping reuse.");
    expect(second.mappingReuseCount).toBeGreaterThan(0);
    expect(second.mappingMemory).toEqual(expect.arrayContaining([
      expect.objectContaining({ header: "Campaign", origin: "saved_client_mapping" }),
    ]));

    memory = updateClient(reloaded, "client-a", (current) => recordWorkspaceAnalysis(current, second, {
      snapshotId: "cycle-2",
      analyzedAt: "2026-07-08T10:00:00.000Z",
      targets: current.targets,
    }));
    const afterSecond = getClient(memory, "client-a");
    expect(afterSecond.reportHistory.map((cycle) => cycle.id)).toEqual(["cycle-2", "cycle-1"]);
    expect(afterSecond.workflow.mappingReuseCount).toBeGreaterThan(0);
    const serialized = JSON.stringify(memory);
    expect(serialized).not.toContain("Summer launch");
    expect(serialized).not.toContain("recurring-meta.csv");
    expect(serialized).not.toContain("Date start,Campaign");
    expect(serialized).not.toContain("canonicalObservations");
    expect(serialized).not.toContain("sourceRow");
    expect(serialized).not.toContain('"domain":"advertising"');
  });

  it("keeps configurations and snapshots isolated across clients", async () => {
    let memory = createClient(createEmptyMemory(), { id: "client-a", name: "Acme", now: "2026-08-01T10:00:00.000Z" });
    memory = createClient(memory, { id: "client-b", name: "Beacon", now: "2026-08-01T10:00:00.000Z" });
    memory = updateClient(memory, "client-a", (current) => ({
      ...current,
      targets: [{ id: "mer", metric: "mer", scope: "report", operator: ">", value: "3.5", unit: "ratio" }],
      mappingMemory: [{ provider: "meta_ads", header: "Campaign", canonicalField: "campaign_name", origin: "manual_current_session", updatedAt: "2026-08-01T10:00:00.000Z" }],
    }));
    memory = updateClient(memory, "client-b", (current) => ({
      ...current,
      targets: [{ id: "roas", metric: "roas", scope: "source", source: "google_ads", operator: ">", value: "4", unit: "ratio" }],
    }));

    expect(getClient(memory, "client-a").targets[0]?.metric).toBe("mer");
    expect(getClient(memory, "client-b").targets[0]?.metric).toBe("roas");
    expect(clientMappingRequest(getClient(memory, "client-b"))).toEqual({});
  });

  it("classifies freshness with deterministic UTC day boundaries", () => {
    const base = {
      id: "snapshot",
      analyzedAt: "2026-08-10T10:00:00.000Z",
      sourceFreshness: [{ source: "shopify" as const, dataThrough: "2026-08-10", observationCount: 1 }],
    };
    expect(freshnessStatus(base, "2026-08-11T09:00:00.000Z")).toBe("current");
    expect(freshnessStatus(base, "2026-08-15T09:00:00.000Z")).toBe("needs_refresh");
    expect(freshnessStatus(base, "2026-08-20T09:00:00.000Z")).toBe("old");
    expect(freshnessStatus({
      ...base,
      sourceFreshness: [
        { source: "shopify", dataThrough: "2026-08-10", observationCount: 1 },
        { source: "meta_ads", dataThrough: "2026-08-01", observationCount: 1 },
      ],
    }, "2026-08-11T09:00:00.000Z")).toBe("old");
  });
});
