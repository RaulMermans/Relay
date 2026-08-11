import { detectSource, type SourceDetection } from "./detect-source";
import { parseCsv, type ParsedCsv } from "./parse";
import { CsvValidationError, validateCsvFile, type ValidatedCsvFile } from "./validate";
import { proposeFieldMapping, type MappingProposal } from "../../mapping/field-mapping";

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
  mapping: MappingProposal | null;
};

export type PreparedCsvIntake = {
  file: ValidatedCsvFile;
  parsed: ParsedCsv;
  sourceDetection: SourceDetection;
};

export async function prepareCsvFile(file: File | null | undefined): Promise<PreparedCsvIntake> {
  const validatedFile = await validateCsvFile(file);
  const parsed = parseCsv(validatedFile.content);

  if (parsed.headers.length === 0 || parsed.headers.every((header) => header.trim().length === 0)) {
    throw new CsvValidationError("CSV_NO_HEADERS", "The CSV file must include a header row.");
  }

  if (parsed.rowCount === 0) {
    throw new CsvValidationError("CSV_NO_DATA", "The CSV file must include at least one data row.");
  }

  return { file: validatedFile, parsed, sourceDetection: detectSource(parsed.headers) };
}

export async function processCsvFile(file: File | null | undefined): Promise<CsvIntakeResult> {
  const { file: validatedFile, parsed: parsedCsv, sourceDetection } = await prepareCsvFile(file);
  const mapping =
    sourceDetection.source === "unknown" ? null : proposeFieldMapping(sourceDetection.source, parsedCsv.headers);

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
    mapping,
  };
}
