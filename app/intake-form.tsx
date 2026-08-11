"use client";

import type { ChangeEvent, DragEvent, FormEvent } from "react";
import { useRef, useState } from "react";

import type { CsvIntakeResult } from "../lib/intake/csv/intake";
import { MAX_CSV_FILE_SIZE_BYTES } from "../lib/intake/csv/limits";
import type { CanonicalField, MappingProposal } from "../lib/mapping/field-mapping";

type RejectedIntakeResponse = {
  status: "rejected";
  error: {
    code: string;
    message: string;
  };
};

type NormalizeResponse =
  | {
      status: "normalized";
      provider: Exclude<CsvIntakeResult["sourceDetection"]["source"], "unknown">;
      summary: {
        normalizedRowCount: number;
        dateRange: { start: string; end: string };
        currencies: string[];
        mappedFieldCount: number;
        ignoredFields: string[];
        warnings: string[];
      };
      findings: { code: string; severity: "warning"; message: string }[];
    }
  | {
      status: "mapping_required";
      provider: Exclude<CsvIntakeResult["sourceDetection"]["source"], "unknown">;
      mapping: MappingProposal;
    }
  | RejectedIntakeResponse;

function sourceLabel(source: CsvIntakeResult["sourceDetection"]["source"]): string {
  switch (source) {
    case "meta_ads":
      return "Meta Ads";
    case "google_ads":
      return "Google Ads";
    case "shopify":
      return "Shopify";
    case "unknown":
      return "Source needs review";
  }
}

function localFileError(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return "Choose a file with a .csv extension.";
  }

  if (file.size === 0) {
    return "The CSV file is empty.";
  }

  if (file.size > MAX_CSV_FILE_SIZE_BYTES) {
    return "The CSV file exceeds the 5 MiB limit.";
  }

  return null;
}

function rowLabel(rowCount: number): string {
  return `${rowCount} data row${rowCount === 1 ? "" : "s"}`;
}

function canonicalFieldLabel(field: CanonicalField): string {
  return field.replace(/_/g, " ");
}

function requiredSemanticLabel(semantic: MappingProposal["requiredMissing"][number]): string {
  switch (semantic) {
    case "date":
      return "Date is required before normalization.";
    case "currency":
      return "Currency is required for mapped money values.";
    case "advertising_context":
      return "At least one account, campaign, group, or ad field is required.";
    case "advertising_measure":
      return "At least one advertising measure is required.";
    case "order_id":
      return "Order identity is required for supported Shopify order rows.";
    case "gross_revenue":
      return "Gross revenue is required for supported Shopify order rows.";
  }
}

export function IntakeForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CsvIntakeResult | null>(null);
  const [mappingOverrides, setMappingOverrides] = useState<Map<number, CanonicalField | null>>(new Map());
  const [normalization, setNormalization] = useState<Extract<NormalizeResponse, { status: "normalized" }> | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);

  function selectFile(nextFile: File | null) {
    setResult(null);
    setNormalization(null);
    setMappingOverrides(new Map());

    if (!nextFile) {
      setFile(null);
      setError(null);
      return;
    }

    const fileError = localFileError(nextFile);
    setFile(fileError ? null : nextFile);
    setError(fileError);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.item(0) ?? null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files.item(0));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Choose one CSV file to inspect.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setNormalization(null);
    setMappingOverrides(new Map());

    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/intake/csv", { method: "POST", body: formData });
      const payload = (await response.json()) as CsvIntakeResult | RejectedIntakeResponse;

      if (!response.ok || payload.status === "rejected") {
        setError(payload.status === "rejected" ? payload.error.message : "The CSV could not be inspected.");
        return;
      }

      setResult(payload);
    } catch {
      setError("The CSV could not be inspected. Try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  function updateMappingChoice(columnIndex: number, value: string) {
    setMappingOverrides((current) => {
      const next = new Map(current);
      if (value === "__proposed") {
        next.delete(columnIndex);
      } else {
        next.set(columnIndex, value === "__ignored" ? null : (value as CanonicalField));
      }
      return next;
    });
  }

  async function handleNormalize() {
    if (!file || !result?.mapping) return;

    setIsNormalizing(true);
    setError(null);
    setNormalization(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set(
        "mappingOverrides",
        JSON.stringify(
          Array.from(mappingOverrides, ([columnIndex, canonicalField]) => ({ columnIndex, canonicalField })),
        ),
      );
      const response = await fetch("/api/normalize/csv", { method: "POST", body: formData });
      const payload = (await response.json()) as NormalizeResponse;

      if (!response.ok || payload.status === "rejected") {
        setError(payload.status === "rejected" ? payload.error.message : "The CSV could not be normalized.");
        return;
      }
      if (payload.status === "mapping_required") {
        setResult((current) => (current ? { ...current, mapping: payload.mapping } : current));
        return;
      }
      setNormalization(payload);
    } catch {
      setError("The CSV could not be normalized. Try again.");
    } finally {
      setIsNormalizing(false);
    }
  }

  function reset() {
    setFile(null);
    setError(null);
    setResult(null);
    setNormalization(null);
    setMappingOverrides(new Map());
    inputRef.current?.form?.reset();
  }

  const mapping = result?.mapping;

  return (
    <section className="intake-workspace" aria-label="CSV intake">
      <form onSubmit={handleSubmit} className="intake-form">
        <div
          className={`drop-zone${isDragging ? " is-dragging" : ""}${file ? " has-file" : ""}`}
          onDragEnter={() => setIsDragging(true)}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="drop-zone-copy">
            <p className="section-label">Source file</p>
            <label htmlFor="csv-file">CSV file</label>
            <p id="csv-file-help">Drop one file here or choose it from your computer.</p>
          </div>
          <div className="file-actions">
            <input
              ref={inputRef}
              id="csv-file"
              className="visually-hidden"
              type="file"
              accept=".csv,text/csv"
              onChange={handleChange}
              aria-describedby="csv-file-help csv-file-limit"
            />
            <label className="file-picker" htmlFor="csv-file">
              {file ? "Replace CSV" : "Choose CSV"}
            </label>
            <p id="csv-file-limit">One .csv, up to 5 MiB</p>
          </div>
          {file ? <p className="selected-file">Selected: {file.name}</p> : null}
        </div>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="submit-row">
          <p>Server checks are authoritative. Uploaded content is not retained.</p>
          <button type="submit" disabled={!file || isProcessing}>
            {isProcessing ? "Inspecting CSV…" : "Inspect CSV"}
          </button>
        </div>
      </form>

      {result ? (
        <section className="intake-result" aria-live="polite" aria-labelledby="source-result-heading">
          <div className="evidence-rail" aria-hidden="true" />
          <div className="result-content">
            <p className="section-label">
              {result.status === "accepted" ? "Source identified" : "Manual check required"}
            </p>
            <h2 id="source-result-heading">{sourceLabel(result.sourceDetection.source)}</h2>
            {result.sourceDetection.source === "unknown" ? (
              <p>Relay could not identify this CSV safely.</p>
            ) : (
              <p>Relay found enough distinct header evidence to identify this export.</p>
            )}

            <dl className="intake-facts">
              <div>
                <dt>Data rows</dt>
                <dd>{rowLabel(result.csv.rowCount)}</dd>
              </div>
              <div>
                <dt>Headers</dt>
                <dd>{result.csv.headers.length}</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>{result.sourceDetection.confidence}</dd>
              </div>
            </dl>

            <details>
              <summary>View {result.csv.headers.length} headers</summary>
              <ul className="header-list">
                {result.csv.headers.map((header) => (
                  <li key={header}>{header}</li>
                ))}
              </ul>
            </details>

            {result.sourceDetection.matchedSignals.length > 0 ? (
              <p className="signal-summary">
                Matched: {result.sourceDetection.matchedSignals.join(", ")}
              </p>
            ) : null}
            {result.sourceDetection.conflictingSignals.length > 0 ? (
              <p className="signal-summary">
                Conflicting evidence: {result.sourceDetection.conflictingSignals.join(" · ")}
              </p>
            ) : null}

            {mapping ? (
              <section className="mapping-review" aria-labelledby="mapping-heading">
                <p className="section-label">Mapping step</p>
                <h3 id="mapping-heading">Review field mapping</h3>
                <p>
                  Confirm how this {sourceLabel(result.sourceDetection.source)} export maps to Relay&apos;s canonical
                  {mapping.domain === "advertising" ? " advertising" : " commerce"} fields.
                </p>
                {mapping.requiredMissing.length > 0 ? (
                  <div className="mapping-corrections" role="status">
                    {mapping.requiredMissing.map((semantic) => (
                      <p key={semantic}>{requiredSemanticLabel(semantic)}</p>
                    ))}
                  </div>
                ) : null}
                {mapping.fields.some((field) => field.status === "ambiguous") ? (
                  <div className="mapping-corrections" role="status">
                    <p>Resolve or ignore every ambiguous provider column before normalization.</p>
                  </div>
                ) : null}
                <div className="mapping-table-wrap">
                  <table className="mapping-table">
                    <thead>
                      <tr>
                        <th scope="col">Provider column</th>
                        <th scope="col">Canonical field</th>
                        <th scope="col">Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mapping.fields.map((field) => {
                        const hasOverride = mappingOverrides.has(field.columnIndex);
                        const selection = hasOverride
                          ? mappingOverrides.get(field.columnIndex) ?? "__ignored"
                          : "__proposed";
                        const proposalLabel = field.canonicalField
                          ? `Use proposed: ${canonicalFieldLabel(field.canonicalField)}`
                          : field.status === "ambiguous"
                            ? "Resolve ambiguous mapping"
                            : "No automatic mapping";
                        return (
                          <tr key={field.columnIndex}>
                            <td>{field.header}</td>
                            <td>
                              <label className="visually-hidden" htmlFor={`mapping-${field.columnIndex}`}>
                                Canonical field for {field.header}
                              </label>
                              <select
                                id={`mapping-${field.columnIndex}`}
                                value={selection}
                                onChange={(event) => updateMappingChoice(field.columnIndex, event.target.value)}
                              >
                                <option value="__proposed">{proposalLabel}</option>
                                {mapping.allowedTargets.map((target) => (
                                  <option key={target} value={target}>
                                    {canonicalFieldLabel(target)}
                                  </option>
                                ))}
                                <option value="__ignored">Ignore this column</option>
                              </select>
                            </td>
                            <td>{field.status.replace(/_/g, " ")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="normalize-button" onClick={handleNormalize} disabled={isNormalizing}>
                  {isNormalizing ? "Normalizing CSV…" : "Normalize CSV"}
                </button>
              </section>
            ) : null}

            {normalization ? (
              <section className="normalization-summary" aria-live="polite" aria-labelledby="normalization-heading">
                <p className="section-label">Canonical output</p>
                <h3 id="normalization-heading">Normalization complete</h3>
                <p>
                  {normalization.summary.normalizedRowCount} canonical {" "}
                  {normalization.provider === "shopify" ? "commerce" : "advertising"} observation
                  {normalization.summary.normalizedRowCount === 1 ? "" : "s"}
                </p>
                <dl className="intake-facts">
                  <div>
                    <dt>Date range</dt>
                    <dd>
                      {normalization.summary.dateRange.start} – {normalization.summary.dateRange.end}
                    </dd>
                  </div>
                  <div>
                    <dt>Currency</dt>
                    <dd>{normalization.summary.currencies.join(", ") || "Unavailable"}</dd>
                  </div>
                  <div>
                    <dt>Mapped fields</dt>
                    <dd>{normalization.summary.mappedFieldCount}</dd>
                  </div>
                </dl>
                {normalization.findings.map((finding) => (
                  <p className="signal-summary" key={finding.code}>
                    {finding.message}
                  </p>
                ))}
              </section>
            ) : null}

            <button type="button" className="reset-button" onClick={reset}>
              Inspect another file
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
