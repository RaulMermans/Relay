import type { CanonicalObservation } from "../../../lib/data-health/types";

type CanonicalSemanticRecord = Record<string, unknown>;

function withoutProvenance(observation: CanonicalObservation): CanonicalSemanticRecord {
  return Object.fromEntries(
    Object.entries(observation)
      .filter(([key]) => key !== "provenance")
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function snapshot(observations: readonly CanonicalObservation[]): CanonicalSemanticRecord[] {
  return observations.map(withoutProvenance).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

export function compareCanonicalSemantics(
  leftObservations: readonly CanonicalObservation[],
  rightObservations: readonly CanonicalObservation[],
): { equivalent: boolean; left: CanonicalSemanticRecord[]; right: CanonicalSemanticRecord[] } {
  const left = snapshot(leftObservations);
  const right = snapshot(rightObservations);
  return {
    equivalent: JSON.stringify(left) === JSON.stringify(right),
    left,
    right,
  };
}
