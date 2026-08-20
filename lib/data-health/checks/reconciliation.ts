import { sourceCurrency } from "./currencies";
import { createFinding, type CanonicalObservation, type DataHealthFinding, type ResolvedReportingPeriod } from "../types";
import type { SourceFacts } from "./dates";

export function checkReconciliation(
  observations: CanonicalObservation[],
  facts: SourceFacts[],
  reportingPeriod: ResolvedReportingPeriod,
): DataHealthFinding[] {
  const findings: DataHealthFinding[] = [];
  const advertising = facts.filter((fact) => fact.source !== "shopify" && fact.observations.length > 0);
  const commerce = facts.find((fact) => fact.source === "shopify" && fact.observations.length > 0);
  const attributionPresent = advertising.some((fact) =>
    fact.observations.some((observation) => observation.domain === "advertising" && observation.attributedRevenue !== null),
  );

  if (attributionPresent && !commerce) {
    findings.push(
      createFinding({
        code: "COMMERCE_SOURCE_ABSENT",
        category: "reconciliation",
        severity: "warning",
        message: "Paid-platform attribution is present without a commerce source for store-side context.",
        evidence: { advertisingSourceCount: advertising.length },
      }),
    );
  }
  if (commerce && advertising.length === 0) {
    findings.push(
      createFinding({
        code: "ADVERTISING_SOURCE_ABSENT",
        category: "reconciliation",
        severity: "info",
        source: "shopify",
        message: "Commerce observations are present without an advertising source.",
        evidence: { advertisingSourceCount: 0 },
      }),
    );
  }
  if (commerce && attributionPresent) {
    findings.push(
      createFinding({
        code: "ATTRIBUTION_AND_COMMERCE_SEPARATED",
        category: "reconciliation",
        severity: "info",
        message: "Commerce revenue and provider-attributed revenue are retained as separate semantics.",
        evidence: { advertisingSourceCount: advertising.length, commerceSource: "shopify" },
      }),
    );
  }

  if (commerce) {
    const commerceCurrency = sourceCurrency("shopify", observations);
    const advertisingCurrencies = [...new Set(
      advertising.flatMap((fact) =>
        fact.observations.flatMap((observation) =>
          observation.domain === "advertising" && (observation.spend !== null || observation.attributedRevenue !== null) && observation.currencyCode
            ? [observation.currencyCode]
            : [],
        ),
      ),
    )];
    if (commerceCurrency && advertisingCurrencies.some((currency) => currency !== commerceCurrency)) {
      findings.push(
        createFinding({
          code: "COMMERCE_ADVERTISING_CURRENCY_MISMATCH",
          category: "reconciliation",
          severity: "error",
          message: "Commerce and advertising monetary sources use incompatible currencies.",
          evidence: { commerceCurrency, advertisingCurrencies: advertisingCurrencies.sort() },
        }),
      );
    }
  }

  const activeCoverage = facts
    .filter((fact) => fact.currentPeriodDates.length > 0)
    .map((fact) => ({
      source: fact.source,
      start: fact.currentPeriodDates[0],
      end: fact.currentPeriodDates[fact.currentPeriodDates.length - 1],
    }));
  const coverageKeys = new Set(activeCoverage.map((coverage) => `${coverage.start}:${coverage.end}`));
  if (coverageKeys.size > 1) {
    findings.push(
      createFinding({
        code: "SOURCE_PERIODS_DIFFER",
        category: "reconciliation",
        severity: "warning",
        period: reportingPeriod.currentPeriod,
        message: "Participating sources cover different current-period date ranges.",
        evidence: { sourceCount: activeCoverage.length },
      }),
    );
  }
  return findings;
}
