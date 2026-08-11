import { detectSource, type SourceDetection } from "./detect-source";
import { parseCsv } from "./parse";
import { CsvValidationError, validateCsvFile } from "./validate";

export type CsvIntakeResult = {
  status: "accepted" | "needs_review";
  file: {
    name: string;
    sizeBytes: number;
  };
  csv: {
    headers: string[];
    rowCount: number;
    delimiter: ",";
    parseWarnings: string[];
  };
  sourceDetection: SourceDetection;
};

export async function processCsvFile(file: File | null | undefined): Promise<CsvIntakeResult> {
  const validatedFile = await validateCsvFile(file);
  const parsedCsv = parseCsv(validatedFile.content);

  if (parsedCsv.headers.length === 0 || parsedCsv.headers.every((header) => header.trim().length === 0)) {
    throw new CsvValidationError("CSV_NO_HEADERS", "The CSV file must include a header row.");
  }

  if (parsedCsv.rowCount === 0) {
    throw new CsvValidationError("CSV_NO_DATA", "The CSV file must include at least one data row.");
  }

  const sourceDetection = detectSource(parsedCsv.headers);

  return {
    status: sourceDetection.source === "unknown" ? "needs_review" : "accepted",
    file: {
      name: validatedFile.name,
      sizeBytes: validatedFile.sizeBytes,
    },
    csv: {
      headers: parsedCsv.headers,
      rowCount: parsedCsv.rowCount,
      delimiter: parsedCsv.delimiter,
      parseWarnings: parsedCsv.parseWarnings,
    },
    sourceDetection,
  };
}
