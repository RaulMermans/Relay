import { MAX_CSV_FILE_SIZE_BYTES } from "./limits";

export { MAX_CSV_FILE_SIZE_BYTES } from "./limits";

export type CsvIntakeErrorCode =
  | "FILE_MISSING"
  | "FILE_TOO_LARGE"
  | "FILE_EMPTY"
  | "INVALID_FILE_TYPE"
  | "CSV_PARSE_ERROR"
  | "CSV_TOO_MANY_ROWS"
  | "CSV_TOO_MANY_COLUMNS"
  | "CSV_FIELD_TOO_LARGE"
  | "CSV_DUPLICATE_HEADERS"
  | "CSV_NULL_BYTE"
  | "CSV_NO_HEADERS"
  | "CSV_NO_DATA";

export class CsvValidationError extends Error {
  constructor(readonly code: CsvIntakeErrorCode, message: string) {
    super(message);
    this.name = "CsvValidationError";
  }
}

export type ValidatedCsvFile = {
  name: string;
  sizeBytes: number;
  content: string;
};

const ALLOWED_CONTENT_TYPES = new Set([
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
]);

function safeFileName(name: string): string {
  const pathSegments = name.split(/[\\/]/);

  return (pathSegments[pathSegments.length - 1] ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

export async function validateCsvFile(file: File | null | undefined): Promise<ValidatedCsvFile> {
  if (!file) {
    throw new CsvValidationError("FILE_MISSING", "Choose a CSV file to continue.");
  }

  const name = safeFileName(file.name);

  if (!name.toLowerCase().endsWith(".csv") || (file.type && !ALLOWED_CONTENT_TYPES.has(file.type))) {
    throw new CsvValidationError("INVALID_FILE_TYPE", "Choose a CSV file.");
  }

  if (file.size === 0) {
    throw new CsvValidationError("FILE_EMPTY", "The CSV file is empty.");
  }

  if (file.size > MAX_CSV_FILE_SIZE_BYTES) {
    throw new CsvValidationError("FILE_TOO_LARGE", "The CSV file exceeds the 5 MiB limit.");
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);

    return {
      name,
      sizeBytes: file.size,
      content,
    };
  } catch {
    throw new CsvValidationError("CSV_PARSE_ERROR", "The CSV file must be UTF-8 text.");
  }
}
