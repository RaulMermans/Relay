import { createFinding, type DataHealthFinding, type DataHealthSourceInput } from "../types";

export function checkMappings(sourceInputs: DataHealthSourceInput[]): DataHealthFinding[] {
  const findings: DataHealthFinding[] = [];
  for (const sourceInput of sourceInputs) {
    const mapping = sourceInput.mapping;
    if (!mapping) continue;
    if (mapping.status !== "ready" || mapping.requiredMissing.length > 0) {
      findings.push(
        createFinding({
          code: "REQUIRED_MAPPING_INCOMPLETE",
          category: "mapping",
          severity: "error",
          source: sourceInput.source,
          message: "Required canonical mapping semantics are incomplete.",
          evidence: { requiredFieldCount: mapping.requiredMissing.length },
        }),
      );
    } else {
      findings.push(
        createFinding({
          code: "REQUIRED_MAPPING_COMPLETE",
          category: "mapping",
          severity: "info",
          source: sourceInput.source,
          message: "Required mapping semantics were completed before normalization.",
          evidence: { requiredFieldCount: 0 },
        }),
      );
    }

    const manualFields = mapping.fields.filter((field) => field.status === "mapped" && field.origin === "manual");
    for (const field of manualFields) {
      findings.push(
        createFinding({
          code: "MANUAL_MAPPING",
          category: "mapping",
          severity: "info",
          source: sourceInput.source,
          field: field.canonicalField ?? undefined,
          message: "A canonical field was explicitly mapped by the user.",
          evidence: { mappingOrigin: "manual" },
        }),
      );
    }
    const ignoredCount = mapping.fields.filter((field) => field.status === "ignored").length;
    if (ignoredCount > 0) {
      findings.push(
        createFinding({
          code: "MAPPING_COLUMNS_IGNORED",
          category: "mapping",
          severity: "info",
          source: sourceInput.source,
          message: "Optional provider columns were deliberately excluded from canonical mapping.",
          evidence: { columnCount: ignoredCount },
        }),
      );
    }
    const unresolvedOptionalCount = mapping.fields.filter((field) => field.status === "unmapped").length;
    if (unresolvedOptionalCount > 0) {
      findings.push(
        createFinding({
          code: "OPTIONAL_MAPPING_UNRESOLVED",
          category: "mapping",
          severity: "info",
          source: sourceInput.source,
          message: "Some optional provider columns were not mapped to canonical fields.",
          evidence: { columnCount: unresolvedOptionalCount },
        }),
      );
    }
    const targets = new Set<string>();
    const duplicateTargets = new Set<string>();
    for (const field of mapping.fields) {
      if (field.status !== "mapped" || !field.canonicalField) continue;
      if (targets.has(field.canonicalField)) duplicateTargets.add(field.canonicalField);
      targets.add(field.canonicalField);
    }
    for (const target of duplicateTargets) {
      findings.push(
        createFinding({
          code: "CONFLICTING_MAPPING_TARGET",
          category: "mapping",
          severity: "error",
          source: sourceInput.source,
          field: target,
          message: "More than one provider column maps to the same canonical field.",
          evidence: { canonicalField: target },
        }),
      );
    }
  }
  return findings;
}
