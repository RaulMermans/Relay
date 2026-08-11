"use client";

import type { ChangeEvent, DragEvent, FormEvent } from "react";
import { useRef, useState } from "react";

import type { CsvIntakeResult } from "../lib/intake/csv/intake";
import { MAX_CSV_FILE_SIZE_BYTES } from "../lib/intake/csv/limits";

type RejectedIntakeResponse = {
  status: "rejected";
  error: {
    code: string;
    message: string;
  };
};

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

export function IntakeForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CsvIntakeResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  function selectFile(nextFile: File | null) {
    setResult(null);

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

  function reset() {
    setFile(null);
    setError(null);
    setResult(null);
    inputRef.current?.form?.reset();
  }

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

            <button type="button" className="reset-button" onClick={reset}>
              Inspect another file
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
