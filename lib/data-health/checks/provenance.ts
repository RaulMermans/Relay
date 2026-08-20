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

function increment(issueCounts: Map<string, number>, issue: string): void {
  issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1);
}

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
  );
}

function checkCsvProvenance(observation: CanonicalObservation, issueCounts: Map<string, number>): void {
  const provenance = observation.provenance;
  if (provenance.transport !== "csv") return;
  if (!provenance.ingestionId.trim()) increment(issueCounts, "PROVENANCE_REQUEST_ID_MISSING");
  if (!provenance.originalFileName.trim() || /[\\/\u0000-\u001F]/.test(provenance.originalFileName)) {
    increment(issueCounts, "PROVENANCE_FILE_IDENTITY_INVALID");
  }
  if (!Number.isInteger(provenance.sourceRow) || provenance.sourceRow < 2) {
    increment(issueCounts, "PROVENANCE_SOURCE_ROW_MISSING");
  }
  for (const field of requiredMappedFields(observation)) {
    const origin = provenance.mappingOrigins[field as keyof typeof provenance.mappingOrigins];
    if (!VALID_MAPPING_ORIGINS.has(origin ?? "")) increment(issueCounts, `PROVENANCE_MAPPING_ORIGIN_MISSING:${field}`);
  }
}

function checkApiProvenance(observation: CanonicalObservation, issueCounts: Map<string, number>): void {
  const provenance = observation.provenance;
  if (provenance.transport !== "api") return;
  if (provenance.provider !== observation.source) increment(issueCounts, "PROVENANCE_PROVIDER_MISMATCH");
  if (!provenance.externalAccountId.trim()) increment(issueCounts, "PROVENANCE_EXTERNAL_ACCOUNT_ID_MISSING");
  const canonicalAccountId = observation.domain === "advertising" ? observation.sourceAccountId : observation.sourceStoreId;
  if (canonicalAccountId && provenance.externalAccountId !== canonicalAccountId) {
    increment(issueCounts, "PROVENANCE_EXTERNAL_ACCOUNT_ID_MISMATCH");
  }
  if (!provenance.fetchRequestId.trim()) increment(issueCounts, "PROVENANCE_FETCH_REQUEST_ID_MISSING");
  if (
    !isCalendarDate(provenance.dateRange.start) ||
    !isCalendarDate(provenance.dateRange.end) ||
    provenance.dateRange.start > provenance.dateRange.end
  ) {
    increment(issueCounts, "PROVENANCE_DATE_RANGE_INVALID");
  } else if (observation.date < provenance.dateRange.start || observation.date > provenance.dateRange.end) {
    increment(issueCounts, "PROVENANCE_OBSERVATION_OUTSIDE_DATE_RANGE");
  }
  if (
    provenance.providerRecordLocator !== undefined &&
    (!provenance.providerRecordLocator.trim() ||
      /[\u0000-\u001F]/.test(provenance.providerRecordLocator) ||
      /https?:|access.?token|refresh.?token|client.?secret|authorization|bearer/i.test(provenance.providerRecordLocator))
  ) {
    increment(issueCounts, "PROVENANCE_RECORD_LOCATOR_INVALID");
  }
}

function messageFor(code: string): string {
  switch (code) {
    case "PROVENANCE_SOURCE_MISSING":
      return "Canonical observations are missing their provider source identity.";
    case "PROVENANCE_TRANSPORT_MISSING":
      return "Canonical observations are missing their transport provenance.";
    case "PROVENANCE_REQUEST_ID_MISSING":
      return "CSV observations are missing their request provenance.";
    case "PROVENANCE_FILE_IDENTITY_INVALID":
      return "CSV observations are missing a safe source-file identity.";
    case "PROVENANCE_SOURCE_ROW_MISSING":
      return "CSV observations are missing a valid source-row locator.";
    case "PROVENANCE_MAPPING_ORIGIN_MISSING":
      return "CSV observations are missing a mapping origin for supplied data.";
    case "PROVENANCE_PROVIDER_MISMATCH":
      return "API provenance does not match the canonical provider source.";
    case "PROVENANCE_EXTERNAL_ACCOUNT_ID_MISSING":
      return "API provenance is missing the validated external account identity.";
    case "PROVENANCE_EXTERNAL_ACCOUNT_ID_MISMATCH":
      return "API provenance does not match the canonical external account identity.";
    case "PROVENANCE_FETCH_REQUEST_ID_MISSING":
      return "API provenance is missing its fetch request identity.";
    case "PROVENANCE_DATE_RANGE_INVALID":
      return "API provenance contains an invalid fetch date range.";
    case "PROVENANCE_OBSERVATION_OUTSIDE_DATE_RANGE":
      return "An API observation falls outside its declared fetch date range.";
    case "PROVENANCE_RECORD_LOCATOR_INVALID":
      return "API provenance contains an invalid provider record locator.";
    default:
      return "Canonical observations contain invalid provenance.";
  }
}

export function checkProvenance(observations: CanonicalObservation[]): DataHealthFinding[] {
  const issueCounts = new Map<string, number>();
  for (const observation of observations) {
    if (!sourceFor(observation)) increment(issueCounts, "PROVENANCE_SOURCE_MISSING");
    if (observation.provenance?.transport === "csv") checkCsvProvenance(observation, issueCounts);
    else if (observation.provenance?.transport === "api") checkApiProvenance(observation, issueCounts);
    else increment(issueCounts, "PROVENANCE_TRANSPORT_MISSING");
  }

  return [...issueCounts].map(([issue, count]) => {
    const [code, field] = issue.split(":");
    return createFinding({
      code,
      category: "provenance",
      severity: "error",
      field,
      message: messageFor(code),
      evidence: { observationCount: count },
    });
  });
}
