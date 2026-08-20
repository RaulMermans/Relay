import { createEmptyMemory } from "./client-memory";
import { MEMORY_LIMITS, parseRelayMemory } from "./schema";
import type { MemoryLoadResult, RelayMemoryV1 } from "./types";

export const RELAY_MEMORY_STORAGE_KEY = "relay.memory.v1";

export type StorageAdapter = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface RelayMemoryStore {
  load(): MemoryLoadResult;
  save(memory: RelayMemoryV1): void;
  reset(): void;
}

export class LocalBrowserMemory implements RelayMemoryStore {
  constructor(private readonly storage: StorageAdapter) {}

  load(): MemoryLoadResult {
    let raw: string | null;
    try {
      raw = this.storage.getItem(RELAY_MEMORY_STORAGE_KEY);
    } catch {
      return { status: "invalid", reason: "unavailable", memory: createEmptyMemory() };
    }
    if (raw === null) return { status: "empty", memory: createEmptyMemory() };
    if (raw.length > MEMORY_LIMITS.serializedCharacters) {
      return { status: "invalid", reason: "oversized", memory: createEmptyMemory() };
    }
    try {
      return { status: "ready", memory: parseRelayMemory(JSON.parse(raw) as unknown) };
    } catch (error) {
      const reason = error instanceof Error && error.message === "UNSUPPORTED_MEMORY_VERSION"
        ? "unsupported_version"
        : "corrupt";
      return { status: "invalid", reason, memory: createEmptyMemory() };
    }
  }

  save(memory: RelayMemoryV1): void {
    const validated = parseRelayMemory(memory);
    const serialized = JSON.stringify(validated);
    if (serialized.length > MEMORY_LIMITS.serializedCharacters) throw new Error("RELAY_MEMORY_TOO_LARGE");
    this.storage.setItem(RELAY_MEMORY_STORAGE_KEY, serialized);
  }

  reset(): void {
    this.storage.removeItem(RELAY_MEMORY_STORAGE_KEY);
  }
}

const unavailableStorage: StorageAdapter = {
  getItem() { throw new Error("BROWSER_STORAGE_UNAVAILABLE"); },
  setItem() { throw new Error("BROWSER_STORAGE_UNAVAILABLE"); },
  removeItem() { throw new Error("BROWSER_STORAGE_UNAVAILABLE"); },
};

export function createBrowserMemoryStore(): RelayMemoryStore {
  try {
    return new LocalBrowserMemory(window.localStorage);
  } catch {
    return new LocalBrowserMemory(unavailableStorage);
  }
}
