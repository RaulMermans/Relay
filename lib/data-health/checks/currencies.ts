import { createFinding, type CanonicalObservation, type DataHealthFinding, type ProviderSource } from "../types";

function hasMonetaryValue(observation: CanonicalObservation): boolean {
  return observation.domain === "commerce" || observation.spend !== null || observation.attributedRevenue !== null;
}

export function checkCurrencies(
  observations: CanonicalObservation[],
  sources: ProviderSource[],
): DataHealthFinding[] {
  const findings: DataHealthFinding[] = [];
  const sourceCurrencies = new Map<ProviderSource, string[]>();

  for (const source of sources) {
    const monetary = observations.filter((observation) => observation.source === source && hasMonetaryValue(observation));
    const missingCurrencyCount = monetary.filter((observation) => !observation.currencyCode).length;
    if (missingCurrencyCount > 0) {
      findings.push(
        createFinding({
          code: "MONETARY_CURRENCY_MISSING",
          category: "currency",
          severity: "error",
          source,
          message: "Monetary canonical observations are missing an explicit currency.",
          evidence: { observationCount: missingCurrencyCount },
        }),
      );
    }
    const currencies = [...new Set(monetary.flatMap((observation) => (observation.currencyCode ? [observation.currencyCode] : [])))].sort();
    sourceCurrencies.set(source, currencies);
    if (currencies.length > 1) {
      findings.push(
        createFinding({
          code: "SOURCE_MIXED_CURRENCIES",
          category: "currency",
          severity: "error",
          source,
          message: "This source contains multiple monetary currencies and cannot be combined without conversion.",
          evidence: { currencies },
        }),
      );
    }
  }

  const monetarySourceCurrencies = [...sourceCurrencies.entries()].filter(([, currencies]) => currencies.length > 0);
  const currencies = [...new Set(monetarySourceCurrencies.flatMap(([, sourceCurrencies]) => sourceCurrencies))].sort();
  if (currencies.length > 1) {
    findings.push(
      createFinding({
        code: "CROSS_SOURCE_CURRENCY_MISMATCH",
        category: "currency",
        severity: "error",
        message: "Selected monetary sources use incompatible currencies and cannot be compared without conversion.",
        evidence: { currencies, sourceCount: monetarySourceCurrencies.length },
      }),
    );
  }
  return findings;
}

export function sourceCurrency(source: ProviderSource, observations: CanonicalObservation[]): string | null {
  const currencies = [...new Set(
    observations
      .filter((observation) => observation.source === source && hasMonetaryValue(observation))
      .flatMap((observation) => (observation.currencyCode ? [observation.currencyCode] : [])),
  )];
  return currencies.length === 1 ? currencies[0] : null;
}
