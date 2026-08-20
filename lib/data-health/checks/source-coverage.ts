import { createFinding, type DataHealthFinding, type DataHealthSourceInput, type ProviderSource } from "../types";

export function checkSourceInputs(sourceInputs: DataHealthSourceInput[], sources: ProviderSource[]): DataHealthFinding[] {
  const findings: DataHealthFinding[] = [];
  for (const source of sources) {
    const inputCount = sourceInputs.filter((input) => input.source === source).length;
    if (inputCount > 1) {
      findings.push(
        createFinding({
          code: "DUPLICATE_SOURCE_INGESTION",
          category: "source_coverage",
          severity: "warning",
          source,
          message: "This reporting request includes more than one ingestion for the same source.",
          evidence: { ingestionCount: inputCount },
        }),
      );
    }
  }
  return findings;
}
