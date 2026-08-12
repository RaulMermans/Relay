import { checkCurrencies } from "./checks/currencies";
import { buildSourceFacts, checkDates } from "./checks/dates";
import { checkDuplicates } from "./checks/duplicates";
import { checkMappings } from "./checks/mappings";
import { checkProvenance } from "./checks/provenance";
import { checkReconciliation } from "./checks/reconciliation";
import { checkSourceInputs } from "./checks/source-coverage";
import { resolveReportingPeriod } from "./reporting-period";
import {
  createFinding,
  isProviderSource,
  DataHealthInputError,
  type DataHealthFinding,
  type DataHealthInput,
  type DataHealthResult,
  type ProviderSource,
} from "./types";

function validateExpectedSources(expectedSources: ProviderSource[]): void {
  if (
    !Array.isArray(expectedSources) ||
    expectedSources.length === 0 ||
    expectedSources.some((source) => !isProviderSource(source)) ||
    new Set(expectedSources).size !== expectedSources.length
  ) {
    throw new DataHealthInputError("INVALID_EXPECTED_SOURCES", "The expected source selection is invalid.");
  }
}

function sourceList(input: DataHealthInput): ProviderSource[] {
  return [...new Set([
    ...input.expectedSources,
    ...(input.sourceInputs ?? []).map((input) => input.source),
    ...input.observations.flatMap((observation) => (isProviderSource(observation.source) ? [observation.source] : [])),
  ])].sort();
}

function comparisonFindings(
  codes: Array<"COMPARISON_PERIOD_LENGTH_MISMATCH" | "COMPARISON_PERIOD_NOT_PREVIOUS">,
): DataHealthFinding[] {
  return codes.map((code) =>
    createFinding({
      code,
      category: "dates",
      severity: "error",
      message:
        code === "COMPARISON_PERIOD_LENGTH_MISMATCH"
          ? "The comparison period must have the same inclusive length as the current period."
          : "The comparison period must immediately precede the current period.",
      evidence: {},
    }),
  );
}

export function runDataHealth(input: DataHealthInput): DataHealthResult {
  validateExpectedSources(input.expectedSources);
  const { reportingPeriod, comparisonIssues } = resolveReportingPeriod(input.reportingPeriod);
  const sources = sourceList(input);
  const facts = buildSourceFacts(sources, input.observations, reportingPeriod);
  const dateResult = checkDates(input.observations, facts, input.expectedSources, reportingPeriod);
  const findings = [
    ...comparisonFindings(comparisonIssues),
    ...dateResult.findings,
    ...checkCurrencies(input.observations, sources),
    ...checkMappings(input.sourceInputs ?? []),
    ...checkProvenance(input.observations),
    ...checkDuplicates(input.observations),
    ...checkSourceInputs(input.sourceInputs ?? [], sources),
    ...checkReconciliation(input.observations, facts, reportingPeriod),
  ].sort((left, right) => left.id.localeCompare(right.id));
  const counts = { info: 0, warning: 0, error: 0 };
  for (const finding of findings) counts[finding.severity] += 1;
  const status = findings.some((finding) => finding.blocking)
    ? "blocked"
    : counts.warning > 0
      ? "review_required"
      : "healthy";
  return {
    status,
    counts,
    checksRun: ["dates", "currencies", "mappings", "provenance", "duplicates", "source_coverage", "reconciliation"],
    findings,
    sourceCoverage: dateResult.sourceCoverage,
    reportingPeriod,
  };
}
