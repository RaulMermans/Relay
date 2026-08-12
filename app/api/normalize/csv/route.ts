import { randomUUID } from "node:crypto";

import { runChangeIntelligence } from "../../../../lib/change-intelligence/engine";
import { ChangeIntelligenceInputError, parseChangeTargets } from "../../../../lib/change-intelligence/targets";
import { type MappingOverride, MappingError } from "../../../../lib/mapping/field-mapping";
import { createDataHealthInput } from "../../../../lib/data-health/request-context";
import { runDataHealth } from "../../../../lib/data-health/run-data-health";
import { DataHealthInputError } from "../../../../lib/data-health/types";
import { runKpiEngine } from "../../../../lib/kpi/engine";
import { normalizeCsvFile } from "../../../../lib/normalization/normalize-csv";
import { type CsvIntakeErrorCode } from "../../../../lib/intake/csv/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type NormalizeErrorCode =
  | CsvIntakeErrorCode
  | "INVALID_MAPPING_REQUEST"
  | "DUPLICATE_CANONICAL_MAPPING"
  | "MAPPING_REVIEW_REQUIRED"
  | "NORMALIZATION_INVALID_VALUE"
  | "NORMALIZATION_INVALID_DATE"
  | "CURRENCY_REQUIRED"
  | "UNSUPPORTED_SHOPIFY_EXPORT_GRAIN"
  | "ROW_REQUIRED_VALUE_MISSING"
  | "SOURCE_UNSUPPORTED"
  | "INVALID_DATA_HEALTH_CONTEXT"
  | "INVALID_CHANGE_INTELLIGENCE_TARGETS";

const NORMALIZE_ERROR_CODES = new Set<NormalizeErrorCode>([
  "FILE_MISSING",
  "FILE_TOO_LARGE",
  "FILE_EMPTY",
  "INVALID_FILE_TYPE",
  "CSV_PARSE_ERROR",
  "CSV_TOO_MANY_ROWS",
  "CSV_TOO_MANY_COLUMNS",
  "CSV_FIELD_TOO_LARGE",
  "CSV_NO_HEADERS",
  "CSV_NO_DATA",
  "INVALID_MAPPING_REQUEST",
  "DUPLICATE_CANONICAL_MAPPING",
  "MAPPING_REVIEW_REQUIRED",
  "NORMALIZATION_INVALID_VALUE",
  "NORMALIZATION_INVALID_DATE",
  "CURRENCY_REQUIRED",
  "UNSUPPORTED_SHOPIFY_EXPORT_GRAIN",
  "ROW_REQUIRED_VALUE_MISSING",
  "SOURCE_UNSUPPORTED",
  "INVALID_DATA_HEALTH_CONTEXT",
  "INVALID_CHANGE_INTELLIGENCE_TARGETS",
]);
const MAX_MAPPING_OVERRIDE_CHARACTERS = 65_536;

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return value !== null && typeof value !== "string" && typeof value.arrayBuffer === "function";
}

function parseMappingOverrides(value: FormDataEntryValue | null): MappingOverride[] {
  if (value === null) return [];
  if (typeof value !== "string") {
    throw new MappingError("INVALID_MAPPING_REQUEST", "The field mapping request is invalid.");
  }
  if (value.length > MAX_MAPPING_OVERRIDE_CHARACTERS) {
    throw new MappingError("INVALID_MAPPING_REQUEST", "The field mapping request is invalid.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new MappingError("INVALID_MAPPING_REQUEST", "The field mapping request is invalid.");
  }
  if (!Array.isArray(parsed)) {
    throw new MappingError("INVALID_MAPPING_REQUEST", "The field mapping request is invalid.");
  }

  return parsed.map((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      Array.isArray(item) ||
      !("columnIndex" in item) ||
      !("canonicalField" in item) ||
      typeof item.columnIndex !== "number" ||
      (typeof item.canonicalField !== "string" && item.canonicalField !== null)
    ) {
      throw new MappingError("INVALID_MAPPING_REQUEST", "The field mapping request is invalid.");
    }
    return { columnIndex: item.columnIndex, canonicalField: item.canonicalField } as MappingOverride;
  });
}

function isNormalizeError(error: unknown): error is { code: NormalizeErrorCode; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof error.code === "string" &&
    NORMALIZE_ERROR_CODES.has(error.code as NormalizeErrorCode) &&
    typeof error.message === "string"
  );
}

function rejectedResponse(code: NormalizeErrorCode, message: string): Response {
  return Response.json(
    { status: "rejected", error: { code, message } },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const upload = formData.get("file");
    const targets = parseChangeTargets(formData.get("changeTargets"));
    const result = await normalizeCsvFile(isUploadedFile(upload) ? upload : null, {
      ingestionId: randomUUID(),
      mappingOverrides: parseMappingOverrides(formData.get("mappingOverrides")),
    });

    if (result.status === "source_unsupported") {
      return rejectedResponse("SOURCE_UNSUPPORTED", "Relay could not identify this CSV for normalization.");
    }
    if (result.status === "mapping_required") {
      console.info("csv_normalization_mapping_required", { provider: result.provider });
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    }

    const dataHealth = runDataHealth(createDataHealthInput(formData.get("dataHealthContext"), result));
    const kpis = runKpiEngine({
      observations: result.observations,
      dataHealthStatus: dataHealth.status,
      reportingPeriod: dataHealth.reportingPeriod,
    });
    const changeIntelligence = runChangeIntelligence({
      kpiResult: kpis,
      dataHealthStatus: dataHealth.status,
      reportingPeriod: dataHealth.reportingPeriod,
      targets,
    });

    console.info("csv_normalization_processed", {
      provider: result.provider,
      normalizedRowCount: result.summary.normalizedRowCount,
      dataHealthStatus: dataHealth.status,
      kpiStatus: kpis.status,
      changeIntelligenceStatus: changeIntelligence.status,
      findingCodes: dataHealth.findings.map((finding) => finding.code),
    });
    return Response.json(
      {
        status: result.status,
        provider: result.provider,
        summary: result.summary,
        dataHealth,
        kpis,
        changeIntelligence,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const code = error instanceof DataHealthInputError
      ? "INVALID_DATA_HEALTH_CONTEXT"
      : error instanceof ChangeIntelligenceInputError
        ? "INVALID_CHANGE_INTELLIGENCE_TARGETS"
      : isNormalizeError(error)
        ? error.code
        : "CSV_PARSE_ERROR";
    const message = error instanceof DataHealthInputError
      ? "The Data Health context is invalid."
      : error instanceof ChangeIntelligenceInputError
        ? "The Change Intelligence target request is invalid."
      : isNormalizeError(error)
      ? error.message
      : "The CSV could not be normalized safely.";
    console.warn("csv_normalization_rejected", { code });
    return rejectedResponse(code, message);
  }
}
