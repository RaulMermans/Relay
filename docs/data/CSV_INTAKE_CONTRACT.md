# CSV intake contract

## Scope

Relay accepts one textual `.csv` file at a time through its server-side intake route. It does not accept XLSX, Google Sheets URLs, ZIP archives, JSON, PDFs, or multi-file batches. The upload is processed transiently: Relay does not persist the raw file, parsed rows, mapping, normalized observations, or an ingestion record in Sprint 05.

The browser may provide selection feedback, but the Route Handler is authoritative for every validation and source-detection result. CSV and future connector paths remain separate until provider-specific normalization; this contract creates no shared transport abstraction.

## Validation

The maximum upload size is **5 MiB** (5,242,880 bytes), with at most **50,000 data rows**, **256 columns**, and **32,768 characters per parsed field**. A file must be present, have a `.csv` extension, have an allowed CSV/text media type when supplied, be non-empty, decode as UTF-8 text, parse as CSV, contain at least one non-empty header, and contain at least one data row. Relay rejects data beyond any limit; it never silently truncates it.

The filename is display metadata only. It is reduced to a safe basename and is never used as a filesystem path. Raw content, parsed rows, and headers are not logged.

## Result shape

An accepted or needs-review result contains:

```text
status: accepted | needs_review
file: original_name, size_bytes
csv: headers[], row_count, delimiter, parse_warnings[]
source_detection: source, confidence, matched_signals[], conflicting_signals[]
mapping: provider/domain, provider-column mappings, required_missing[], allowed_targets[] | null
```

`accepted` means a supported source has sufficient unambiguous header evidence. `needs_review` means that CSV parsing succeeded but the source is unsupported or ambiguous. `unknown` is therefore a successful source-detection value; it is not a parsing failure.

Rejected requests return a 4xx response with an `error` object containing one stable code and a safe client message. The supported codes are `FILE_MISSING`, `FILE_TOO_LARGE`, `FILE_EMPTY`, `INVALID_FILE_TYPE`, `CSV_PARSE_ERROR`, `CSV_TOO_MANY_ROWS`, `CSV_TOO_MANY_COLUMNS`, `CSV_FIELD_TOO_LARGE`, `CSV_NO_HEADERS`, and `CSV_NO_DATA`. Parser details and stack traces are never returned.

## Parser decision

Relay uses the maintained [`csv-parse`](https://csv.js.org/parse/) package through a small server-side boundary. A general-purpose parser is required to safely support quoted commas, escaped quotes, CRLF/LF line endings, empty cells, malformed records, and a UTF-8 BOM. A hand-written parser would duplicate this subtle input-validation surface and be harder to maintain. The exact resolved package version is locked in `package-lock.json`; no parsing, data, or provider package beyond this one is added.

The parser returns original headers, row count, delimiter, a minimal server-only row representation, and no warnings for the supported dialect. After source detection, `POST /api/intake/csv` returns a mapping proposal without rows. `POST /api/normalize/csv` requires a re-upload of the same selected file plus transient mapping overrides, then revalidates/reparses it server-side and returns only a compact summary. Sprint 05 calculates no KPIs and retains no raw input.
