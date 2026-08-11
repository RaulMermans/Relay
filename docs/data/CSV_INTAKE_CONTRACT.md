# CSV intake contract

## Scope

Sprint 04 accepts one textual `.csv` file at a time through Relay's server-side intake route. It does not accept XLSX, Google Sheets URLs, ZIP archives, JSON, PDFs, or multi-file batches. The upload is processed transiently: Relay does not persist the raw file, parsed rows, or an ingestion record in this sprint.

The browser may provide selection feedback, but the Route Handler is authoritative for every validation and source-detection result. CSV and future connector paths remain separate until provider-specific normalization; this contract creates no shared transport abstraction.

## Validation

The maximum upload size is **5 MiB** (5,242,880 bytes), with at most **50,000 data rows**. A file must be present, have a `.csv` extension, have an allowed CSV/text media type when supplied, be non-empty, decode as UTF-8 text, parse as CSV, contain at least one non-empty header, and contain at least one data row. Relay rejects data beyond either limit; it never silently truncates it.

The filename is display metadata only. It is reduced to a safe basename and is never used as a filesystem path. Raw content, parsed rows, and headers are not logged.

## Result shape

An accepted or needs-review result contains:

```text
status: accepted | needs_review
file: original_name, size_bytes
csv: headers[], row_count, delimiter, parse_warnings[]
source_detection: source, confidence, matched_signals[], conflicting_signals[]
```

`accepted` means a supported source has sufficient unambiguous header evidence. `needs_review` means that CSV parsing succeeded but the source is unsupported or ambiguous. `unknown` is therefore a successful source-detection value; it is not a parsing failure.

Rejected requests return a 4xx response with an `error` object containing one stable code and a safe client message. The supported codes are `FILE_MISSING`, `FILE_TOO_LARGE`, `FILE_EMPTY`, `INVALID_FILE_TYPE`, `CSV_PARSE_ERROR`, `CSV_TOO_MANY_ROWS`, `CSV_NO_HEADERS`, and `CSV_NO_DATA`. Parser details and stack traces are never returned.

## Parser decision

Sprint 04 uses the maintained [`csv-parse`](https://csv.js.org/parse/) package through a small server-side boundary. A general-purpose parser is required to safely support quoted commas, escaped quotes, CRLF/LF line endings, empty cells, malformed records, and a UTF-8 BOM. A hand-written parser would duplicate this subtle input-validation surface and be harder to maintain. The exact resolved package version is locked in `package-lock.json`; no parsing, data, or provider package beyond this one is added.

The parser returns the original headers, row count, delimiter, a minimal row representation for the next sprint, and no warnings for the supported dialect. Sprint 04 does not map headers, calculate metrics, or retain raw input.
