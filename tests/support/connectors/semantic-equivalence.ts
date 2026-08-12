import type { CanonicalObservation } from "../../../lib/data-health/types";

type CanonicalSemanticRecord = Record<string, unknown>;

const CONDITIONAL_IDENTITY_FIELDS = [
  "sourceAccountId",
  "sourceAccountName",
  "sourceStoreId",
  "sourceStoreName",
] as const;

function unavailableInEitherTransport(
  field: (typeof CONDITIONAL_IDENTITY_FIELDS)[number],
  left: readonly CanonicalObservation[],
  right: readonly CanonicalObservation[],
): boolean {
  const unavailable = (observations: readonly CanonicalObservation[]) =>
    observations.every((observation) => !(field in observation) || observation[field as keyof CanonicalObservation] === null);
  return unavailable(left) || unavailable(right);
}

function withoutProvenance(
  observation: CanonicalObservation,
  omittedFields: ReadonlySet<string>,
): CanonicalSemanticRecord {
  return Object.fromEntries(
    Object.entries(observation)
      .filter(([key]) => key !== "provenance" && !omittedFields.has(key))
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function snapshot(
  observations: readonly CanonicalObservation[],
  omittedFields: ReadonlySet<string>,
): CanonicalSemanticRecord[] {
  return observations
    .map((observation) => withoutProvenance(observation, omittedFields))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

export function compareCanonicalSemantics(
  leftObservations: readonly CanonicalObservation[],
  rightObservations: readonly CanonicalObservation[],
): { equivalent: boolean; left: CanonicalSemanticRecord[]; right: CanonicalSemanticRecord[] } {
  const omittedFields = new Set(
    CONDITIONAL_IDENTITY_FIELDS.filter((field) => unavailableInEitherTransport(field, leftObservations, rightObservations)),
  );
  const left = snapshot(leftObservations, omittedFields);
  const right = snapshot(rightObservations, omittedFields);
  return {
    equivalent: JSON.stringify(left) === JSON.stringify(right),
    left,
    right,
  };
}
