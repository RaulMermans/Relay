import { parse } from "csv-parse/sync";

export const MAX_CSV_DATA_ROWS = 50_000;
export const MAX_CSV_COLUMNS = 256;
export const MAX_CSV_FIELD_CHARACTERS = 32_768;

export type ParsedCsv = {
  headers: string[];
  rows: string[][];
  rowCount: number;
  delimiter: ",";
  parseWarnings: string[];
};

export class CsvParseError extends Error {
  constructor(
    readonly code:
      | "CSV_PARSE_ERROR"
      | "CSV_TOO_MANY_ROWS"
      | "CSV_TOO_MANY_COLUMNS"
      | "CSV_FIELD_TOO_LARGE" = "CSV_PARSE_ERROR",
    message = "The file could not be parsed as CSV.",
  ) {
    super(message);
    this.name = "CsvParseError";
  }
}

export function parseCsv(content: string): ParsedCsv {
  let rows: string[][];

  try {
    rows = parse(content, {
      bom: true,
      relax_column_count: false,
      skip_empty_lines: true,
      to: MAX_CSV_DATA_ROWS + 2,
    }) as string[][];
  } catch {
    throw new CsvParseError();
  }

  if (rows.length > MAX_CSV_DATA_ROWS + 1) {
    throw new CsvParseError("CSV_TOO_MANY_ROWS", "The CSV file exceeds the 50,000-row limit.");
  }

  const [headers = [], ...dataRows] = rows;
  if (headers.length > MAX_CSV_COLUMNS) {
    throw new CsvParseError("CSV_TOO_MANY_COLUMNS", "The CSV file exceeds the 256-column limit.");
  }
  if (headers.some((header) => header.length > MAX_CSV_FIELD_CHARACTERS) || dataRows.some((row) => row.some((cell) => cell.length > MAX_CSV_FIELD_CHARACTERS))) {
    throw new CsvParseError("CSV_FIELD_TOO_LARGE", "The CSV file contains an oversized field.");
  }

  return {
    headers,
    rows: dataRows,
    rowCount: dataRows.length,
    delimiter: ",",
    parseWarnings: [],
  };
}
