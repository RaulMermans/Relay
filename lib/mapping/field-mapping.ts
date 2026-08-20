import { PROVIDER_FIELD_CATALOG } from "./catalog";
import type {
  ApprovedFieldMapping,
  CanonicalField,
  FieldMapping,
  MappingOverride,
  MappingProposal,
  ProviderSource,
  RequiredSemantic,
} from "./types";

export { type ApprovedFieldMapping, type CanonicalField, type MappingOverride, type MappingProposal };

export class MappingError extends Error {
  constructor(
    readonly code:
      | "INVALID_MAPPING_REQUEST"
      | "DUPLICATE_CANONICAL_MAPPING"
      | "MAPPING_REVIEW_REQUIRED",
    message: string,
  ) {
    super(message);
    this.name = "MappingError";
  }
}

function normalizeHeader(header: string): string {
  return header.replace(/^\uFEFF/, "").trim().replace(/\s+/g, " ").toLowerCase();
}

function requiredMissing(provider: ProviderSource, fields: FieldMapping[]): RequiredSemantic[] {
  const mapped = new Set<CanonicalField>(
    fields.flatMap((field) => (field.status === "mapped" && field.canonicalField ? [field.canonicalField] : [])),
  );
  const missing: RequiredSemantic[] = [];
  if (!mapped.has("date")) missing.push("date");

  if (provider === "shopify") {
    if (!mapped.has("order_id")) missing.push("order_id");
    if (!mapped.has("gross_revenue")) missing.push("gross_revenue");
    if (mapped.has("gross_revenue") && !mapped.has("currency")) missing.push("currency");
    return missing;
  }

  if (
    !([
      "source_account_id",
      "source_account_name",
      "campaign_id",
      "campaign_name",
      "group_id",
      "group_name",
      "ad_id",
      "ad_name",
    ] as const).some((field) => mapped.has(field))
  ) {
    missing.push("advertising_context");
  }
  if (!(["spend", "impressions", "clicks", "conversions", "attributed_revenue"] as const).some((field) => mapped.has(field))) {
    missing.push("advertising_measure");
  }
  if ((mapped.has("spend") || mapped.has("attributed_revenue")) && !mapped.has("currency")) {
    missing.push("currency");
  }
  return missing;
}

function fieldMatches(provider: ProviderSource, header: string): {
  candidates: CanonicalField[];
  exactCandidates: CanonicalField[];
} {
  const normalizedHeader = normalizeHeader(header);
  const candidates: CanonicalField[] = [];
  const exactCandidates: CanonicalField[] = [];
  for (const [field, aliases] of Object.entries(PROVIDER_FIELD_CATALOG[provider].fields) as [
    CanonicalField,
    string[],
  ][]) {
    if (aliases.some((alias) => normalizeHeader(alias) === normalizedHeader)) candidates.push(field);
    if (aliases.includes(header)) exactCandidates.push(field);
  }
  return { candidates, exactCandidates };
}

function resolveAutomaticFields(provider: ProviderSource, headers: string[]): FieldMapping[] {
  const fields = headers.map((header, columnIndex) => {
    const { candidates, exactCandidates } = fieldMatches(provider, header);
    const canonicalField = candidates.length === 1 ? candidates[0] : null;
    return {
      columnIndex,
      header,
      canonicalField,
      status: canonicalField ? "mapped" : candidates.length > 0 ? "ambiguous" : "unmapped",
      origin: canonicalField ? (exactCandidates.length === 1 ? "exact_alias" : "normalized_alias") : null,
      candidates,
    } satisfies FieldMapping;
  });

  for (const canonicalField of new Set(fields.flatMap((field) => (field.canonicalField ? [field.canonicalField] : [])))) {
    const duplicates = fields.filter((field) => field.canonicalField === canonicalField);
    if (duplicates.length > 1) {
      for (const field of duplicates) {
        field.canonicalField = null;
        field.status = "ambiguous";
        field.origin = null;
        field.candidates = [canonicalField];
      }
    }
  }
  return fields;
}

function buildProposal(provider: ProviderSource, fields: FieldMapping[]): MappingProposal {
  const missing = requiredMissing(provider, fields);
  return {
    provider,
    domain: PROVIDER_FIELD_CATALOG[provider].domain,
    status: fields.some((field) => field.status === "ambiguous") || missing.length > 0 ? "needs_review" : "ready",
    fields,
    requiredMissing: missing,
    allowedTargets: Object.keys(PROVIDER_FIELD_CATALOG[provider].fields) as CanonicalField[],
  };
}

export function proposeFieldMapping(provider: ProviderSource, headers: string[]): MappingProposal {
  return buildProposal(provider, resolveAutomaticFields(provider, headers));
}

export function applyMappingOverrides(proposal: MappingProposal, overrides: MappingOverride[] = []): MappingProposal {
  const fields = proposal.fields.map((field) => ({ ...field, candidates: [...field.candidates] }));
  if (overrides.length > fields.length) {
    throw new MappingError("INVALID_MAPPING_REQUEST", "The field mapping request is invalid.");
  }
  const fieldsByColumn = new Map(fields.map((field) => [field.columnIndex, field]));
  const seenColumns = new Set<number>();
  for (const override of overrides) {
    if (!Number.isInteger(override.columnIndex) || seenColumns.has(override.columnIndex)) {
      throw new MappingError("INVALID_MAPPING_REQUEST", "The field mapping request is invalid.");
    }
    seenColumns.add(override.columnIndex);
    const field = fieldsByColumn.get(override.columnIndex);
    if (!field || (override.canonicalField && !proposal.allowedTargets.includes(override.canonicalField))) {
      throw new MappingError("INVALID_MAPPING_REQUEST", "The field mapping request is invalid.");
    }
    field.canonicalField = override.canonicalField;
    field.status = override.canonicalField ? "mapped" : "ignored";
    field.origin = override.canonicalField ? "manual" : null;
    field.candidates = override.canonicalField ? [override.canonicalField] : [];
  }

  const mappedTargets = new Set<CanonicalField>();
  for (const field of fields) {
    if (field.status !== "mapped" || !field.canonicalField) continue;
    if (mappedTargets.has(field.canonicalField)) {
      throw new MappingError("DUPLICATE_CANONICAL_MAPPING", "A canonical field can only be mapped from one CSV column.");
    }
    mappedTargets.add(field.canonicalField);
  }
  return buildProposal(proposal.provider, fields);
}

export function approveFieldMapping(proposal: MappingProposal): ApprovedFieldMapping {
  if (proposal.status !== "ready") {
    throw new MappingError(
      "MAPPING_REVIEW_REQUIRED",
      "Resolve the required or ambiguous field mappings before normalization.",
    );
  }
  return {
    provider: proposal.provider,
    domain: proposal.domain,
    fields: Object.fromEntries(
      proposal.fields.flatMap((field) =>
        field.status === "mapped" && field.canonicalField ? [[field.canonicalField, field]] : [],
      ),
    ) as Partial<Record<CanonicalField, FieldMapping>>,
    ignoredHeaders: proposal.fields.filter((field) => field.status === "ignored").map((field) => field.header),
  };
}
