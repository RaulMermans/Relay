import { processCsvFile } from "../../../../lib/intake/csv/intake";
import { exceedsDeclaredRequestSize, MAX_CSV_UPLOAD_REQUEST_SIZE_BYTES } from "../../../../lib/intake/csv/limits";
import { type CsvIntakeErrorCode } from "../../../../lib/intake/csv/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INTAKE_ERROR_CODES = new Set<CsvIntakeErrorCode>([
  "FILE_MISSING",
  "FILE_TOO_LARGE",
  "FILE_EMPTY",
  "INVALID_FILE_TYPE",
  "CSV_PARSE_ERROR",
  "CSV_TOO_MANY_ROWS",
  "CSV_TOO_MANY_COLUMNS",
  "CSV_FIELD_TOO_LARGE",
  "CSV_DUPLICATE_HEADERS",
  "CSV_NULL_BYTE",
  "CSV_NO_HEADERS",
  "CSV_NO_DATA",
]);

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return value !== null && typeof value !== "string" && typeof value.arrayBuffer === "function";
}

function isIntakeError(error: unknown): error is { code: CsvIntakeErrorCode; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof error.code === "string" &&
    INTAKE_ERROR_CODES.has(error.code as CsvIntakeErrorCode) &&
    typeof error.message === "string"
  );
}

function rejectedResponse(code: CsvIntakeErrorCode, message: string): Response {
  return Response.json(
    {
      status: "rejected",
      error: { code, message },
    },
    {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function POST(request: Request): Promise<Response> {
  if (exceedsDeclaredRequestSize(request, MAX_CSV_UPLOAD_REQUEST_SIZE_BYTES)) {
    return rejectedResponse("FILE_TOO_LARGE", "The CSV file exceeds the 5 MiB limit.");
  }
  try {
    const formData = await request.formData();
    const entry = formData.get("file");
    const result = await processCsvFile(isUploadedFile(entry) ? entry : null);

    console.info("csv_intake_processed", {
      status: result.status,
      source: result.sourceDetection.source,
      rowCount: result.csv.rowCount,
    });

    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = isIntakeError(error) ? error.code : "CSV_PARSE_ERROR";
    const message = isIntakeError(error)
      ? error.message
      : "The upload could not be processed as CSV.";

    console.warn("csv_intake_rejected", { code });

    return rejectedResponse(code, message);
  }
}
