import type { NarrativeItem } from "./types";

function storyKey(item: NarrativeItem): string {
  if (item.type === "target") return item.id;
  if (item.type === "health" || item.type === "freshness") return item.id;
  if (item.type === "efficiency") {
    const observationId = item.evidenceRefs.find((evidence) => evidence.kind === "observation")?.id;
    const source = observationId?.split(":")[2] ?? "report";
    return `${item.scope}:efficiency:${source}`;
  }
  if (item.type === "tradeoff") return `${item.scope}:efficiency`;
  return `${item.scope}:${item.type}:${item.evidenceRefs.map((evidence) => evidence.id).sort().join(",")}`;
}

export function prioritizeNarratives(items: NarrativeItem[], limit: number): NarrativeItem[] {
  const seen = new Set<string>();
  return [...items]
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))
    .filter((item) => {
      const key = storyKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
