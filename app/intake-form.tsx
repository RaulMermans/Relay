"use client";

import type { ChangeEvent, DragEvent, FormEvent } from "react";
import { useRef, useState } from "react";

import type { ChangeIntelligenceExecutionResult, ChangeObservation } from "../lib/change-intelligence/types";
import type { CsvIntakeResult } from "../lib/intake/csv/intake";
import { MAX_CSV_FILE_SIZE_BYTES } from "../lib/intake/csv/limits";
import type { CanonicalField, MappingProposal } from "../lib/mapping/field-mapping";
import type { KpiExecutionResult, KpiMetricKey, KpiMetricResult } from "../lib/kpi/types";

type RejectedIntakeResponse = {
  status: "rejected";
  error: {
    code: string;
    message: string;
  };
};

type DataHealthFinding = {
  id: string;
  code: string;
  category: string;
  severity: "info" | "warning" | "error";
  status: "open";
  source?: "meta_ads" | "google_ads" | "shopify";
  message: string;
  blocking: boolean;
};

type DataHealthResult = {
  status: "healthy" | "review_required" | "blocked";
  counts: { info: number; warning: number; error: number };
  sourceCoverage: Array<{
    source: "meta_ads" | "google_ads" | "shopify";
    status: "ready" | "review" | "blocked" | "missing";
    observationCount: number;
    start: string | null;
    end: string | null;
  }>;
  findings: DataHealthFinding[];
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
      dataHealth: DataHealthResult;
      kpis: KpiExecutionResult;
      changeIntelligence: ChangeIntelligenceExecutionResult;
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

function dataHealthStatusLabel(status: DataHealthResult["status"]): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "review_required":
      return "Review required";
    case "blocked":
      return "Blocked";
  }
}

function sourceHealthLabel(source: DataHealthResult["sourceCoverage"][number]["source"]): string {
  return sourceLabel(source);
}

function kpiMetricLabel(key: KpiMetricKey): string {
  switch (key) {
    case "spend": return "Spend";
    case "commerce_revenue": return "Commerce Revenue";
    case "orders": return "Orders";
    case "impressions": return "Impressions";
    case "clicks": return "Clicks";
    case "conversions": return "Conversions";
    case "attributed_revenue": return "Attributed Revenue";
    case "ctr": return "CTR";
    case "cpc": return "CPC";
    case "cpa": return "CPA";
    case "roas": return "ROAS";
    case "mer": return "MER";
    case "aov": return "AOV";
    case "conversion_rate": return "Conversion Rate";
  }
}

function formatKpiValue(metric: KpiMetricResult, value: string | null): string {
  if (value === null) return "Unavailable";
  if (metric.unit !== "currency") return value;
  const currency = metric.inputs.find((input) => input.period === "current" && input.currencyCode)?.currencyCode;
  return currency ? `${currency} ${value}` : value;
}

function KpiCard({ metric, label }: { metric: KpiMetricResult; label?: string }) {
  const { comparison } = metric;
  return (
    <article className="kpi-card">
      <h4>{label ?? kpiMetricLabel(metric.key)}</h4>
      <p className="kpi-current">{formatKpiValue(metric, metric.value)}</p>
      <dl>
        <div><dt>Previous</dt><dd>{formatKpiValue(metric, comparison.previous)}</dd></div>
        <div><dt>Delta</dt><dd>{comparison.absoluteChange === null ? "Unavailable" : formatKpiValue(metric, comparison.absoluteChange)}</dd></div>
        <div><dt>Delta ratio</dt><dd>{comparison.percentageChange ?? "Unavailable"}</dd></div>
      </dl>
    </article>
  );
}

function KpiSummary({ kpis }: { kpis: Extract<KpiExecutionResult, { status: "ready" }> }) {
  const summaryKeys: KpiMetricKey[] = ["spend", "commerce_revenue", "orders", "mer", "aov"];
  const summaryMetrics = summaryKeys.flatMap((key) => kpis.metrics.filter((metric) => metric.key === key && metric.status === "available"));
  const sourceRoas = kpis.sourceBreakdown
    .filter((breakdown) => breakdown.source === "meta_ads" || breakdown.source === "google_ads")
    .flatMap((breakdown) => breakdown.metrics
      .filter((metric) => metric.key === "roas" && metric.status === "available")
      .map((metric) => ({ source: breakdown.source, metric })));

  return (
    <section className="kpi-summary" aria-labelledby="kpi-heading">
      <p className="section-label">Deterministic facts</p>
      <h3 id="kpi-heading">KPI summary</h3>
      <p>Current, previous equivalent-period, and mathematical change. Ratios are stored as raw ratios.</p>
      <div className="kpi-grid">
        {summaryMetrics.map((metric) => <KpiCard key={metric.key} metric={metric} />)}
        {sourceRoas.map(({ source, metric }) => (
          <KpiCard key={`${source}-${metric.key}`} metric={metric} label={`${sourceLabel(source)} ROAS`} />
        ))}
      </div>
    </section>
  );
}

function changeAssessmentLabel(value: ChangeObservation["assessment"]): string {
  return value === "context_required"
    ? "Context required"
    : `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function changeSignificanceLabel(value: ChangeObservation["significance"]): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function changeSignalLabel(observation: ChangeObservation): string | null {
  switch (observation.signalCode) {
    case "SPEND_OUTPACED_COMMERCE_REVENUE": return "Spend grew faster than commerce revenue.";
    case "COMMERCE_REVENUE_OUTPACED_SPEND": return "Commerce revenue grew faster than spend.";
    case "SPEND_UP_CONVERSIONS_DOWN": return "Spend increased while conversions decreased.";
    case "SPEND_UP_ATTRIBUTED_REVENUE_DOWN": return "Spend increased while attributed revenue decreased.";
    case "COMMERCE_REVENUE_UP_ORDERS_DOWN": return "Commerce revenue increased while orders decreased.";
    case "CLICKS_UP_CONVERSIONS_DOWN": return "Clicks increased while conversions decreased.";
    default: return null;
  }
}

function changeTitle(observation: ChangeObservation): string {
  if (observation.type === "SPEND_REVENUE_DIVERGENCE") return "Spend vs Revenue";
  if (observation.type === "SOURCE_EFFICIENCY_IMPROVEMENT" || observation.type === "SOURCE_EFFICIENCY_DETERIORATION") {
    return `${observation.source ? sourceLabel(observation.source) : "Source"} efficiency`;
  }
  const prefix = observation.source ? `${sourceLabel(observation.source)} ` : "";
  return `${prefix}${kpiMetricLabel(observation.metric)}${observation.type === "TARGET_BREACH" ? " target" : ""}`;
}

function changeMovementLabel(observation: ChangeObservation): string {
  if (observation.type === "TARGET_BREACH") return "Target breached";
  const signal = changeSignalLabel(observation);
  if (signal) return signal;
  const arrow = observation.direction === "increased" ? "↑" : observation.direction === "decreased" ? "↓" : "→";
  if (observation.percentageChange === null || observation.percentageChange === undefined) {
    return `${arrow} percentage unavailable`;
  }
  const percentage = Number(observation.percentageChange) * 100;
  return `${arrow} ${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(Math.abs(percentage))}%`;
}

function WhatChanged({ result }: { result: Extract<ChangeIntelligenceExecutionResult, { status: "ready" }> }) {
  return (
    <section className="what-changed" aria-labelledby="what-changed-heading">
      <p className="section-label">Deterministic interpretation</p>
      <h3 id="what-changed-heading">What Changed</h3>
      <p>Rule-based observations from validated KPI facts. No causal or AI commentary.</p>
      {result.observations.length === 0 ? (
        <p>No comparable change observation is available for this upload.</p>
      ) : (
        <div className="change-list">
          {result.observations.map((observation) => (
            <article className={`change-card assessment-${observation.assessment}`} key={observation.id}>
              <h4>{changeTitle(observation)}</h4>
              <p className="change-movement">{changeMovementLabel(observation)}</p>
              <p className="change-assessment">
                {changeAssessmentLabel(observation.assessment)} · {changeSignificanceLabel(observation.significance)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
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
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
  const [reportingStart, setReportingStart] = useState("");
  const [reportingEnd, setReportingEnd] = useState("");
  const [merTarget, setMerTarget] = useState("");
  const [cpaTarget, setCpaTarget] = useState("");
  const [cpaTargetCurrency, setCpaTargetCurrency] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);

  function selectFile(nextFile: File | null) {
    setResult(null);
    setNormalization(null);
    setWarningsAcknowledged(false);
    setMappingOverrides(new Map());
    setReportingStart("");
    setReportingEnd("");
    setMerTarget("");
    setCpaTarget("");
    setCpaTargetCurrency("");

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
    setWarningsAcknowledged(false);
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
    if (Boolean(reportingStart) !== Boolean(reportingEnd)) {
      setError("Enter both current-period dates or leave both blank.");
      return;
    }
    if (cpaTarget.trim() && !/^[A-Za-z]{3}$/.test(cpaTargetCurrency.trim())) {
      setError("Enter a three-letter currency code for the CPA target.");
      return;
    }

    setIsNormalizing(true);
    setError(null);
    setNormalization(null);
    setWarningsAcknowledged(false);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set(
        "mappingOverrides",
        JSON.stringify(
          Array.from(mappingOverrides, ([columnIndex, canonicalField]) => ({ columnIndex, canonicalField })),
        ),
      );
      const targets = [
        ...(merTarget.trim() ? [{ id: "mer-ui", metric: "mer", scope: "report", operator: ">", value: merTarget.trim(), unit: "ratio" }] : []),
        ...(cpaTarget.trim() ? [{
          id: "cpa-ui",
          metric: "cpa",
          scope: "report",
          operator: "<",
          value: cpaTarget.trim(),
          unit: "currency",
          currencyCode: cpaTargetCurrency.trim().toUpperCase(),
        }] : []),
      ];
      formData.set("changeTargets", JSON.stringify(targets));
      if (reportingStart && reportingEnd) {
        formData.set("dataHealthContext", JSON.stringify({
          currentPeriod: { start: reportingStart, end: reportingEnd },
        }));
      }
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
      setWarningsAcknowledged(false);
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
    setWarningsAcknowledged(false);
    setMappingOverrides(new Map());
    setReportingStart("");
    setReportingEnd("");
    setMerTarget("");
    setCpaTarget("");
    setCpaTargetCurrency("");
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
                <fieldset className="target-entry">
                  <legend>Optional reporting context and targets</legend>
                  <label htmlFor="reporting-start">Current period start</label>
                  <input
                    id="reporting-start"
                    type="date"
                    value={reportingStart}
                    onChange={(event) => setReportingStart(event.target.value)}
                  />
                  <label htmlFor="reporting-end">Current period end</label>
                  <input
                    id="reporting-end"
                    type="date"
                    value={reportingEnd}
                    onChange={(event) => setReportingEnd(event.target.value)}
                  />
                  <label htmlFor="mer-target">MER target above</label>
                  <input
                    id="mer-target"
                    inputMode="decimal"
                    value={merTarget}
                    onChange={(event) => setMerTarget(event.target.value)}
                    placeholder="3.5"
                  />
                  <label htmlFor="cpa-target">CPA target below</label>
                  <input
                    id="cpa-target"
                    inputMode="decimal"
                    value={cpaTarget}
                    onChange={(event) => setCpaTarget(event.target.value)}
                    placeholder="38"
                  />
                  <label htmlFor="cpa-target-currency">CPA target currency</label>
                  <input
                    id="cpa-target-currency"
                    value={cpaTargetCurrency}
                    onChange={(event) => setCpaTargetCurrency(event.target.value)}
                    placeholder="EUR"
                    maxLength={3}
                  />
                </fieldset>
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
                <section className="data-health" aria-labelledby="data-health-heading">
                  <p className="section-label">Trust check</p>
                  <h3 id="data-health-heading">Data Health</h3>
                  <p className={`data-health-status status-${normalization.dataHealth.status}`}>
                    {dataHealthStatusLabel(normalization.dataHealth.status)}
                  </p>
                  <p>
                    {normalization.dataHealth.status === "blocked"
                      ? "Blocked before analytics"
                      : normalization.dataHealth.status === "review_required" && !warningsAcknowledged
                        ? "Review the warnings before treating this data as ready for analytics."
                        : "Ready for analytics"}
                  </p>
                  <div className="data-health-coverage">
                    <h4>Source coverage</h4>
                    <dl>
                      {normalization.dataHealth.sourceCoverage.map((coverage) => (
                        <div key={coverage.source}>
                          <dt>{sourceHealthLabel(coverage.source)}</dt>
                          <dd>
                            {coverage.start && coverage.end ? `${coverage.start} — ${coverage.end}` : "No observations"}
                          </dd>
                          <dd className={`coverage-${coverage.status}`}>{coverage.status}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div className="data-health-findings">
                    <h4>Findings</h4>
                    {(["error", "warning", "info"] as const).map((severity) => {
                      const findings = normalization.dataHealth.findings.filter((finding) => finding.severity === severity);
                      return findings.length > 0 ? (
                        <section key={severity} aria-label={`${severity} findings`}>
                          <h5>{severity}</h5>
                          <ul>
                            {findings.map((finding) => (
                              <li key={finding.id} className={`finding-${severity}`}>
                                <span>{finding.message}</span>
                                <small>
                                  {finding.category.replace(/_/g, " ")} · {finding.blocking ? "Blocks continuation" : "Does not block continuation"}
                                </small>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ) : null;
                    })}
                  </div>
                  {normalization.dataHealth.status === "review_required" && !warningsAcknowledged ? (
                    <button type="button" className="acknowledge-button" onClick={() => setWarningsAcknowledged(true)}>
                      Acknowledge warnings
                    </button>
                  ) : null}
                </section>
                {normalization.kpis.status === "ready" ? <KpiSummary kpis={normalization.kpis} /> : null}
                {normalization.changeIntelligence.status === "ready" ? (
                  <WhatChanged result={normalization.changeIntelligence} />
                ) : null}
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
