import { createFinding, isProviderSource, type CanonicalObservation, type DataHealthFinding, type ProviderSource } from "../types";

const VALID_MAPPING_ORIGINS = new Set(["exact_alias", "normalized_alias", "manual"]);

function sourceFor(observation: CanonicalObservation): ProviderSource | undefined {
  return isProviderSource(observation.source) ? observation.source : undefined;
}

function requiredMappedFields(observation: CanonicalObservation): string[] {
  const fields = ["date"];
  if (observation.domain === "advertising") {
    if (observation.sourceAccountId) fields.push("source_account_id");
    if (observation.sourceAccountName) fields.push("source_account_name");
    if (observation.campaignId) fields.push("campaign_id");
    if (observation.campaignName) fields.push("campaign_name");
    if (observation.groupId) fields.push("group_id");
    if (observation.groupName) fields.push("group_name");
    if (observation.adId) fields.push("ad_id");
    if (observation.adName) fields.push("ad_name");
    if (observation.currencyCode) fields.push("currency");
    if (observation.spend !== null) fields.push("spend");
    if (observation.impressions !== null) fields.push("impressions");
    if (observation.clicks !== null) fields.push("clicks");
    if (observation.conversions !== null) fields.push("conversions");
    if (observation.attributedRevenue !== null) fields.push("attributed_revenue");
  } else {
    if (observation.sourceStoreId) fields.push("source_store_id");
    if (observation.sourceStoreName) fields.push("source_store_name");
    fields.push("order_id", "currency", "gross_revenue");
    if (observation.netRevenue !== null) fields.push("net_revenue");
    if (observation.refunds !== null) fields.push("refunds");
    if (observation.customers !== null) fields.push("customers");
    if (observation.newCustomers !== null) fields.push("new_customers");
  }
  return fields;
}

export function checkProvenance(observations: CanonicalObservation[]): DataHealthFinding[] {
  const findings: DataHealthFinding[] = [];
  const issueCounts = new Map<string, number>();
  for (const observation of observations) {
    const source = sourceFor(observation);
    if (!source) issueCounts.set("PROVENANCE_SOURCE_MISSING", (issueCounts.get("PROVENANCE_SOURCE_MISSING") ?? 0) + 1);
    const provenance = observation.provenance;
    if (provenance?.transport !== "csv") issueCounts.set("PROVENANCE_TRANSPORT_MISSING", (issueCounts.get("PROVENANCE_TRANSPORT_MISSING") ?? 0) + 1);
    if (!provenance?.ingestionId?.trim()) issueCounts.set("PROVENANCE_REQUEST_ID_MISSING", (issueCounts.get("PROVENANCE_REQUEST_ID_MISSING") ?? 0) + 1);
    if (!provenance?.originalFileName?.trim() || /[\\/\u0000-\u001F]/.test(provenance.originalFileName)) {
      issueCounts.set("PROVENANCE_FILE_IDENTITY_INVALID", (issueCounts.get("PROVENANCE_FILE_IDENTITY_INVALID") ?? 0) + 1);
    }
    if (!Number.isInteger(provenance?.sourceRow) || provenance.sourceRow < 2) {
      issueCounts.set("PROVENANCE_SOURCE_ROW_MISSING", (issueCounts.get("PROVENANCE_SOURCE_ROW_MISSING") ?? 0) + 1);
    }
    for (const field of requiredMappedFields(observation)) {
      const origin = provenance?.mappingOrigins?.[field as keyof typeof provenance.mappingOrigins];
      if (!VALID_MAPPING_ORIGINS.has(origin ?? "")) {
        const issue = `PROVENANCE_MAPPING_ORIGIN_MISSING:${field}`;
        issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1);
      }
    }
  }
  for (const [issue, count] of issueCounts) {
    const [code, field] = issue.split(":");
    findings.push(
      createFinding({
        code,
        category: "provenance",
        severity: "error",
        field,
        message:
          code === "PROVENANCE_SOURCE_MISSING"
            ? "Canonical observations are missing their provider source identity."
            : code === "PROVENANCE_TRANSPORT_MISSING"
              ? "Canonical observations are missing their transport provenance."
              : code === "PROVENANCE_REQUEST_ID_MISSING"
                ? "Canonical observations are missing their request provenance."
                : code === "PROVENANCE_FILE_IDENTITY_INVALID"
                  ? "Canonical observations are missing a safe source-file identity."
                  : code === "PROVENANCE_SOURCE_ROW_MISSING"
                    ? "Canonical observations are missing a valid source-row locator."
                    : "Canonical observations are missing a mapping origin for supplied data.",
        evidence: { observationCount: count },
      }),
    );
  }
  return findings;
}
