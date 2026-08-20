import { dateInRange, enumerateDates, isCanonicalDate } from "../reporting-period";
import {
  createFinding,
  type CanonicalObservation,
  type DataHealthFinding,
  type ProviderSource,
  type ResolvedReportingPeriod,
  type SourceCoverage,
} from "../types";

export type SourceFacts = {
  source: ProviderSource;
  observations: CanonicalObservation[];
  validDateObservations: CanonicalObservation[];
  currentPeriodDates: string[];
  comparisonPeriodDates: string[];
  start: string | null;
  end: string | null;
};

export function buildSourceFacts(
  sources: ProviderSource[],
  observations: CanonicalObservation[],
  reportingPeriod: ResolvedReportingPeriod,
): SourceFacts[] {
  return sources.map((source) => {
    const sourceObservations = observations.filter((observation) => observation.source === source);
    const validDateObservations = sourceObservations.filter((observation) => isCanonicalDate(observation.date));
    const dates = [...new Set(validDateObservations.map((observation) => observation.date))].sort();
    return {
      source,
      observations: sourceObservations,
      validDateObservations,
      currentPeriodDates: dates.filter((date) => dateInRange(date, reportingPeriod.currentPeriod)),
      comparisonPeriodDates: dates.filter((date) => dateInRange(date, reportingPeriod.comparisonPeriod)),
      start: dates[0] ?? null,
      end: dates[dates.length - 1] ?? null,
    };
  });
}

export function checkDates(
  observations: CanonicalObservation[],
  facts: SourceFacts[],
  expectedSources: ProviderSource[],
  reportingPeriod: ResolvedReportingPeriod,
): { findings: DataHealthFinding[]; sourceCoverage: SourceCoverage[] } {
  const findings: DataHealthFinding[] = [];
  const invalidBySource = new Map<ProviderSource, number>();
  for (const observation of observations) {
    if (isCanonicalDate(observation.date)) continue;
    if (observation.source === "meta_ads" || observation.source === "google_ads" || observation.source === "shopify") {
      invalidBySource.set(observation.source, (invalidBySource.get(observation.source) ?? 0) + 1);
    }
  }
  for (const [source, count] of invalidBySource) {
    findings.push(
      createFinding({
        code: "INVALID_CANONICAL_DATE",
        category: "dates",
        severity: "error",
        source,
        message: "Canonical observations contain an invalid reporting date.",
        evidence: { observationCount: count },
      }),
    );
  }

  const sourceCoverage: SourceCoverage[] = facts.map((fact) => {
    const currencies = [...new Set(fact.observations.flatMap((observation) => (observation.currencyCode ? [observation.currencyCode] : [])))].sort();
    const expected = expectedSources.includes(fact.source);
    if (fact.observations.length === 0) {
      if (expected) {
        findings.push(
          createFinding({
            code: "EXPECTED_SOURCE_MISSING",
            category: "source_coverage",
            severity: "error",
            source: fact.source,
            period: reportingPeriod.currentPeriod,
            message: "A source required by this reporting request was not provided.",
            evidence: { expected: true },
          }),
        );
      }
      return {
        source: fact.source,
        status: expected ? "missing" : "ready",
        observationCount: 0,
        currentPeriodObservationCount: 0,
        start: null,
        end: null,
        currencies,
      };
    }

    if (fact.currentPeriodDates.length === 0) {
      findings.push(
        createFinding({
          code: "SOURCE_OUTSIDE_CURRENT_PERIOD",
          category: "dates",
          severity: "error",
          source: fact.source,
          period: reportingPeriod.currentPeriod,
          message: "This source has no usable observations in the current reporting period.",
          evidence: { observationCount: fact.observations.length },
        }),
      );
      if (expected) {
        findings.push(
          createFinding({
            code: "EXPECTED_SOURCE_NO_USABLE_CURRENT_OBSERVATIONS",
            category: "source_coverage",
            severity: "error",
            source: fact.source,
            period: reportingPeriod.currentPeriod,
            message: "A required source has no usable observations in the current reporting period.",
            evidence: { observationCount: fact.observations.length },
          }),
        );
      }
    } else {
      const sourceStart = fact.currentPeriodDates[0];
      const sourceEnd = fact.currentPeriodDates[fact.currentPeriodDates.length - 1] ?? sourceStart;
      if (sourceStart !== reportingPeriod.currentPeriod.start || sourceEnd !== reportingPeriod.currentPeriod.end) {
        findings.push(
          createFinding({
            code: "PARTIAL_CURRENT_PERIOD_COVERAGE",
            category: "dates",
            severity: "warning",
            source: fact.source,
            period: reportingPeriod.currentPeriod,
            message: "This source covers only part of the current reporting period.",
            evidence: { coverageStart: sourceStart, coverageEnd: sourceEnd },
          }),
        );
      }
      if (fact.source !== "shopify") {
        const missingDays = enumerateDates(sourceStart, sourceEnd).filter((date) => !fact.currentPeriodDates.includes(date));
        if (missingDays.length > 0) {
          findings.push(
            createFinding({
              code: "MISSING_ADVERTISING_DAILY_COVERAGE",
              category: "dates",
              severity: "warning",
              source: fact.source,
              period: { start: sourceStart, end: sourceEnd },
              message: "Advertising observations have one or more missing interior calendar days.",
              evidence: { missingDayCount: missingDays.length },
            }),
          );
        }
      }
    }

    const outsideCount = fact.validDateObservations.filter(
      (observation) =>
        !dateInRange(observation.date, reportingPeriod.currentPeriod) &&
        !dateInRange(observation.date, reportingPeriod.comparisonPeriod),
    ).length;
    if (outsideCount > 0) {
      findings.push(
        createFinding({
          code: "OBSERVATION_OUTSIDE_REPORTING_PERIOD",
          category: "dates",
          severity: "warning",
          source: fact.source,
          message: "Some observations are outside the selected current and comparison periods.",
          evidence: { observationCount: outsideCount },
        }),
      );
    }

    const status =
      fact.currentPeriodDates.length === 0
        ? "blocked"
        : fact.currentPeriodDates[0] !== reportingPeriod.currentPeriod.start ||
            fact.currentPeriodDates[fact.currentPeriodDates.length - 1] !== reportingPeriod.currentPeriod.end
          ? "review"
          : "ready";
    return {
      source: fact.source,
      status,
      observationCount: fact.observations.length,
      currentPeriodObservationCount: fact.validDateObservations.filter((observation) =>
        dateInRange(observation.date, reportingPeriod.currentPeriod),
      ).length,
      start: fact.start,
      end: fact.end,
      currencies,
    };
  });

  const comparisonSources = facts.filter((fact) => fact.comparisonPeriodDates.length > 0);
  if (comparisonSources.length > 0 && comparisonSources.length !== facts.filter((fact) => fact.observations.length > 0).length) {
    findings.push(
      createFinding({
        code: "COMPARISON_SOURCE_COVERAGE_MISMATCH",
        category: "dates",
        severity: "warning",
        period: reportingPeriod.comparisonPeriod,
        message: "Comparison-period observations are not available for every provided source.",
        evidence: { sourceCount: comparisonSources.length },
      }),
    );
  }

  return { findings, sourceCoverage };
}
