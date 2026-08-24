"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ChangeObservation } from "../lib/change-intelligence/types";
import type { ProviderSource } from "../lib/data-health/types";
import type { KpiMetricKey, KpiMetricResult, KpiSourceBreakdown } from "../lib/kpi/types";
import type { CanonicalField } from "../lib/mapping/types";
import { clientMappingRequest, freshnessStatus, recordWorkspaceAnalysis } from "../lib/persistence/analysis-memory";
import { generateNarrative } from "../lib/narrative/generate";
import type { NarrativeItem } from "../lib/narrative/types";
import { createClient, createEmptyMemory, deleteClient, renameClient, selectClient, updateClient } from "../lib/persistence/client-memory";
import { createBrowserMemoryStore, type RelayMemoryStore } from "../lib/persistence/local-storage";
import type { AnalysisSnapshot, ClientMemory, RelayMemoryV1, SnapshotChangeIntelligence } from "../lib/persistence/types";
import { composeReport, isReportStale, reportFilename } from "../lib/report/compose";
import { canExportReport, exportReport as printReport } from "../lib/report/export";
import type { ReportDocument } from "../lib/report/types";
import {
  curateObservations,
  formatMetricValue,
  formatPercentageChange,
  humanizeDataHealthFinding,
  presentObservation,
} from "../lib/presentation";
import type {
  WorkspaceAnalysisResult,
  WorkspaceSourceSummary,
  WorkspaceTrendPoint,
} from "../lib/workspace/analyze-workspace";
import { ClientMemorySettings, ClientSelector, FirstClient, RecentReports } from "./client-memory-ui";
import { ReportPreview } from "./report-preview";

type ReadyAnalysis = Extract<WorkspaceAnalysisResult, { status: "ready" }>;
type DashboardAnalysis = Pick<ReadyAnalysis, "sources" | "dataHealth" | "kpis" | "trend"> & { changeIntelligence: SnapshotChangeIntelligence };
type MappingException = Extract<WorkspaceAnalysisResult, { status: "mapping_required" }>["exceptions"][number];
type View = "overview" | "sources" | "report";
type MappingChoices = Partial<Record<ProviderSource, Record<number, CanonicalField | null>>>;
type RejectedResponse = { status: "rejected"; error: { code: string; message: string } };

const SOURCES: Array<{ id: ProviderSource; label: string; short: string }> = [
  { id: "meta_ads", label: "Meta Ads", short: "Meta" },
  { id: "google_ads", label: "Google Ads", short: "Google" },
  { id: "shopify", label: "Shopify", short: "Shopify" },
];

const METRIC_LABELS: Record<KpiMetricKey, string> = {
  spend: "Spend",
  commerce_revenue: "Commerce revenue",
  orders: "Orders",
  impressions: "Impressions",
  clicks: "Clicks",
  conversions: "Conversions",
  attributed_revenue: "Attributed revenue",
  ctr: "CTR",
  cpc: "CPC",
  cpa: "CPA",
  roas: "ROAS",
  mer: "MER",
  aov: "AOV",
  conversion_rate: "Conversion rate",
};

function sourceLabel(source: ProviderSource): string {
  return SOURCES.find((item) => item.id === source)?.label ?? source;
}

function canonicalLabel(field: string): string {
  return field.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", ...options })
    .format(new Date(`${value}T00:00:00Z`));
}

function periodLabel(start: string, end: string): string {
  if (!start || !end) return "Choose a reporting period";
  const startYear = start.slice(0, 4);
  const endYear = end.slice(0, 4);
  return startYear === endYear
    ? `${formatDate(start)} – ${formatDate(end, { year: "numeric" })}`
    : `${formatDate(start, { year: "numeric" })} – ${formatDate(end, { year: "numeric" })}`;
}

function selectedSources(files: Partial<Record<ProviderSource, File>>): ProviderSource[] {
  return SOURCES.flatMap((source) => files[source.id] ? [source.id] : []);
}

function friendlyError(code: string, selected: ProviderSource[]): string {
  if (code === "SOURCE_UNSUPPORTED" && selected.length === 1) {
    return `Relay couldn’t identify the ${sourceLabel(selected[0]!)} CSV. Choose an export from that source and try again.`;
  }
  if (code === "SOURCE_SLOT_MISMATCH") return "A CSV was added to the wrong source. Check the source cards and try again.";
  if (code === "INVALID_WORKSPACE_REQUEST") return "Check the reporting period and source selection, then try again.";
  return "Relay couldn’t prepare this workspace safely. Review the source files and try again.";
}

function metricByKey(metrics: KpiMetricResult[], key: KpiMetricKey): KpiMetricResult | undefined {
  return metrics.find((metric) => metric.key === key && metric.status === "available");
}

function currentCurrency(metric: KpiMetricResult): string | null {
  return metric.inputs.find((input) => input.period === "current" && input.currencyCode)?.currencyCode ?? null;
}

function SourceRail({
  files,
  analysis,
  client,
  onManage,
}: {
  files: Partial<Record<ProviderSource, File>>;
  analysis: DashboardAnalysis | null;
  client: ClientMemory;
  onManage: () => void;
}) {
  return (
    <aside className="source-rail" aria-label="Workspace source status">
      <div className="rail-heading">
        <p className="eyebrow">Source coverage</p>
        <button className="text-action" onClick={onManage}>Update data</button>
      </div>
      <ol>
        {SOURCES.map((source) => {
          const summary = analysis?.sources.find((item) => item.source === source.id);
          const hasFile = Boolean(files[source.id]);
          const expected = client.sources[source.id].expected;
          const state = summary?.status === "ready" ? "Ready" : summary ? "Needs attention" : hasFile ? "Selected" : expected ? "Expected" : "No data";
          return (
            <li key={source.id} className={`rail-source state-${summary?.status ?? (hasFile ? "selected" : "empty")}`}>
              <span className="status-dot" aria-hidden="true" />
              <div>
                <strong>{source.short}</strong>
                <span>{state}</span>
                {summary?.dateRange.end ? <small>Through {formatDate(summary.dateRange.end)}</small> : null}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="rail-note">Freshness reflects uploaded CSV data. Automatic sync is not active.</p>
    </aside>
  );
}

function EmptyOverview({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="empty-overview" aria-labelledby="empty-heading">
      <p className="eyebrow">Overview</p>
      <h1 id="empty-heading">Your performance workspace starts with trusted data.</h1>
      <p>Add the latest Meta Ads, Google Ads, or Shopify exports. Relay will prepare recognized files automatically and ask only when something needs correction.</p>
      <button className="primary-action" onClick={onAdd}>Add data</button>
      <div className="empty-proof" aria-label="How Relay prepares data">
        <span>Recognize sources</span><span>Check coverage</span><span>Build the dashboard</span>
      </div>
    </section>
  );
}

function SourceInput({
  source,
  file,
  summary,
  expected,
  onChange,
}: {
  source: (typeof SOURCES)[number];
  file?: File;
  summary?: WorkspaceSourceSummary;
  expected: boolean;
  onChange: (file: File | undefined) => void;
}) {
  const inputId = `${source.id}-csv`;
  return (
    <article className={`source-input-card${file ? " has-file" : ""}`}>
      <div className="source-card-topline">
        <span className="source-monogram" aria-hidden="true">{source.short.slice(0, 1)}</span>
        <div>
          <h3>{source.label}</h3>
          <p>CSV available · API connection unavailable</p>
        </div>
        <span className={`source-state ${summary?.status ?? (file ? "selected" : "empty")}`}>
          {summary?.status === "ready" ? "Ready" : file ? "Selected" : expected ? "Expected" : "No data"}
        </span>
      </div>
      {summary ? (
        <p className="source-meta">{summary.normalizedRowCount.toLocaleString("en-US")} observations · Through {formatDate(summary.dateRange.end)} · {summary.currencies.join(", ") || "No currency"}</p>
      ) : expected ? <p className="source-meta">Expected for this client</p> : null}
      {summary && expected ? <small className="source-expected">Expected for this client</small> : null}
      <div className="source-file-row">
        <input
          id={inputId}
          className="visually-hidden"
          type="file"
          accept=".csv,text/csv"
          aria-label={`${source.label} CSV`}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.files?.item(0) ?? undefined)}
        />
        <label className="file-action" htmlFor={inputId}>{file ? "Replace CSV" : "Add CSV"}</label>
        <span className="file-name">{file?.name ?? "No file selected"}</span>
        {file ? <button className="remove-file" type="button" onClick={() => onChange(undefined)}>Remove</button> : null}
      </div>
    </article>
  );
}

function MappingExceptions({
  exceptions,
  choices,
  onChoice,
}: {
  exceptions: MappingException[];
  choices: MappingChoices;
  onChoice: (source: ProviderSource, columnIndex: number, value: string) => void;
}) {
  const fields = exceptions.flatMap((exception) => exception.mapping.fields
    .filter((field) => field.status === "ambiguous")
    .map((field) => ({ source: exception.source, field })));
  const count = fields.length || exceptions.reduce((total, item) => total + item.mapping.requiredMissing.length, 0);
  return (
    <section className="mapping-exception" aria-labelledby="mapping-exception-heading">
      <p className="eyebrow">Needs your input</p>
      <h2 id="mapping-exception-heading">Relay needs help with {count} {count === 1 ? "field" : "fields"}</h2>
      <p>Choose only the fields Relay could not resolve. Everything else stays automatic.</p>
      {fields.length > 0 ? (
        <div className="mapping-fields">
          {fields.map(({ source, field }) => (
            <label key={`${source}-${field.columnIndex}`}>
              <span>Map {field.header}</span>
              <select
                aria-label={`Map ${field.header}`}
                value={choices[source]?.[field.columnIndex] === null ? "__ignored" : choices[source]?.[field.columnIndex] ?? ""}
                onChange={(event) => onChoice(source, field.columnIndex, event.target.value)}
              >
                <option value="">Choose a field</option>
                {field.candidates.map((candidate) => <option value={candidate} key={candidate}>{canonicalLabel(candidate)}</option>)}
                <option value="__ignored">Ignore this column</option>
              </select>
            </label>
          ))}
        </div>
      ) : (
        <p className="mapping-replace">The export does not contain a required field. Replace the CSV with a complete source export.</p>
      )}
    </section>
  );
}

function SourceManager({
  files,
  analysis,
  client,
  start,
  end,
  exceptions,
  choices,
  error,
  isPreparing,
  onFile,
  onClientChange,
  onReset,
  onStart,
  onEnd,
  onChoice,
  onSubmit,
}: {
  files: Partial<Record<ProviderSource, File>>;
  analysis: DashboardAnalysis | null;
  client: ClientMemory;
  start: string;
  end: string;
  exceptions: MappingException[];
  choices: MappingChoices;
  error: string | null;
  isPreparing: boolean;
  onFile: (source: ProviderSource, file: File | undefined) => void;
  onClientChange: (client: ClientMemory) => void;
  onReset: () => void;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
  onChoice: (source: ProviderSource, columnIndex: number, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="source-manager" aria-labelledby="source-manager-heading">
      <div className="manager-heading">
        <div><p className="eyebrow">Data Sources</p><h1 id="source-manager-heading">Prepare this workspace</h1></div>
        <p>CSV files are processed for this request and are not saved. Live API authorization is not available yet.</p>
      </div>
      <form onSubmit={onSubmit}>
        <section className="period-panel" aria-labelledby="period-heading">
          <div><p className="eyebrow">Reporting period</p><h2 id="period-heading">{periodLabel(start, end)}</h2><p>Relay compares the immediately previous period of equal length.</p></div>
          <div className="date-fields">
            <label><span>Start</span><input aria-label="Reporting period start" type="date" value={start} onChange={(event) => onStart(event.target.value)} required /></label>
            <label><span>End</span><input aria-label="Reporting period end" type="date" value={end} onChange={(event) => onEnd(event.target.value)} required /></label>
          </div>
        </section>
        <div className="source-input-list">
          {SOURCES.map((source) => <SourceInput key={source.id} source={source} file={files[source.id]} expected={client.sources[source.id].expected} summary={analysis?.sources.find((item) => item.source === source.id)} onChange={(file) => onFile(source.id, file)} />)}
        </div>
        <ClientMemorySettings client={client} onChange={onClientChange} onReset={onReset} />
        {exceptions.length > 0 ? <MappingExceptions exceptions={exceptions} choices={choices} onChoice={onChoice} /> : null}
        {error ? <div className="workspace-error" role="alert"><strong>Data needs a second look</strong><p>{error}</p></div> : null}
        {isPreparing ? (
          <div className="preparing-state" role="status" aria-live="polite">
            <span className="preparing-mark" aria-hidden="true" />
            <div><strong>Preparing your data</strong><p>Recognizing sources, mapping fields, and checking date and currency coverage.</p></div>
          </div>
        ) : null}
        <div className="manager-actions">
          <p>{selectedSources(files).length} of 3 source slots selected</p>
          <button className="primary-action" type="submit" disabled={isPreparing}>
            {error ? "Try again" : exceptions.length > 0 ? "Re-analyze data" : analysis ? "Update dashboard" : "Prepare dashboard"}
          </button>
        </div>
      </form>
    </section>
  );
}

function KpiBlock({ metric, className = "" }: { metric: KpiMetricResult; className?: string }) {
  return (
    <article className={`kpi-block ${className}`} data-testid={`hero-${metric.key}`}>
      <p>{METRIC_LABELS[metric.key]}</p>
      <strong>{formatMetricValue(metric, metric.value)}</strong>
      <span className={metric.comparison.percentageChange?.startsWith("-") ? "negative" : ""}>
        {formatPercentageChange(metric.comparison.percentageChange)} <small>vs previous period</small>
      </span>
    </article>
  );
}

function TrendChart({ trend, currency }: { trend: WorkspaceTrendPoint[]; currency: string | null }) {
  const values = trend.flatMap((point) => [point.commerceRevenue, point.paidSpend]).flatMap((value) => value === null ? [] : [Number(value)]);
  if (values.length === 0) return null;
  const maximum = Math.max(...values, 1);
  const x = (index: number) => trend.length === 1 ? 50 : 6 + (index / (trend.length - 1)) * 88;
  const y = (value: string) => 88 - (Number(value) / maximum) * 72;
  const line = (key: "commerceRevenue" | "paidSpend") => trend.flatMap((point, index) => point[key] === null ? [] : [`${x(index)},${y(point[key]!)}`]).join(" ");
  const hasCommerce = trend.some((point) => point.commerceRevenue !== null);
  const hasSpend = trend.some((point) => point.paidSpend !== null);
  return (
    <figure className="trend-figure" aria-label="Daily commerce revenue and paid spend trend">
      <div className="trend-heading">
        <div><p className="eyebrow">Daily trend</p><h3>Revenue and paid spend</h3></div>
        <div className="trend-legend">{hasCommerce ? <span className="revenue-key">Commerce revenue</span> : null}{hasSpend ? <span className="spend-key">Paid spend</span> : null}</div>
      </div>
      <svg viewBox="0 0 100 100" role="img" aria-label={`Daily values in ${currency ?? "the source currency"}`} preserveAspectRatio="none">
        <line x1="6" y1="88" x2="94" y2="88" className="chart-grid" />
        <line x1="6" y1="52" x2="94" y2="52" className="chart-grid" />
        <line x1="6" y1="16" x2="94" y2="16" className="chart-grid" />
        {hasCommerce ? <polyline points={line("commerceRevenue")} className="revenue-line" /> : null}
        {hasSpend ? <polyline points={line("paidSpend")} className="spend-line" /> : null}
        {trend.map((point, index) => <g key={point.date}>
          {point.commerceRevenue !== null ? <circle cx={x(index)} cy={y(point.commerceRevenue)} r="1.8" className="revenue-point"><title>{`${formatDate(point.date)} commerce revenue ${point.commerceRevenue}`}</title></circle> : null}
          {point.paidSpend !== null ? <circle cx={x(index)} cy={y(point.paidSpend)} r="1.5" className="spend-point"><title>{`${formatDate(point.date)} paid spend ${point.paidSpend}`}</title></circle> : null}
        </g>)}
      </svg>
      <figcaption>Daily Shopify gross revenue and combined Meta/Google spend share one compatible-currency scale. Provider-attributed revenue is not included.</figcaption>
      <table className="visually-hidden"><caption>Daily trend values</caption><thead><tr><th>Date</th><th>Commerce revenue</th><th>Paid spend</th></tr></thead><tbody>{trend.map((point) => <tr key={point.date}><th>{point.date}</th><td>{point.commerceRevenue ?? "Unavailable"}</td><td>{point.paidSpend ?? "Unavailable"}</td></tr>)}</tbody></table>
    </figure>
  );
}

function WhatChanged({ observations }: { observations: ChangeObservation[] }) {
  const [showAll, setShowAll] = useState(false);
  const curated = curateObservations(observations, 4);
  const visible = showAll ? observations : curated;
  return (
    <section className="dashboard-section changed-section" aria-labelledby="changed-heading">
      <div className="section-heading"><div><p className="eyebrow">Decision context</p><h2 id="changed-heading">What Changed</h2></div>{observations.length > curated.length ? <button className="text-action" onClick={() => setShowAll((value) => !value)}>{showAll ? "Show highlights" : "View all"}</button> : null}</div>
      {visible.length === 0 ? <p className="quiet-empty">No comparable movement is available yet. Add the previous period in a future export to populate change highlights.</p> : (
        <div className="change-grid">{visible.map((item) => {
          const presented = presentObservation(item);
          return <article className={`change-item tone-${presented.tone}`} key={item.id}><span aria-hidden="true" /><div><h3>{presented.title}</h3><p>{presented.detail}</p><small>{item.significance === "unavailable" ? "Context only" : `${canonicalLabel(item.significance)} change`}</small></div></article>;
        })}</div>
      )}
    </section>
  );
}

function NarrativeList({ items }: { items: NarrativeItem[] }) {
  return (
    <ul className="narrative-list">
      {items.map((item) => <li key={item.id}><strong>{item.title}</strong><span>{item.text}</span></li>)}
    </ul>
  );
}

function PerformanceSummary({
  analysis,
  freshness,
}: {
  analysis: DashboardAnalysis;
  freshness: ReturnType<typeof freshnessStatus>;
}) {
  const narrative = generateNarrative({
    reportingPeriod: analysis.dataHealth.reportingPeriod,
    dataHealth: analysis.dataHealth,
    kpis: analysis.kpis,
    observations: analysis.changeIntelligence,
    targets: analysis.changeIntelligence.targetEvaluations,
    sources: analysis.sources,
    freshness,
  });
  const developments = [...narrative.highlights, ...narrative.channelSummaries].slice(0, 4);
  return (
    <section className="dashboard-section narrative-section" aria-labelledby="summary-heading" data-testid="performance-summary">
      <div className="section-heading"><div><p className="eyebrow">Deterministic narrative</p><h2 id="summary-heading">Performance Summary</h2></div></div>
      <div className="narrative-overview"><h3>{narrative.headline}</h3><p>{narrative.summary}</p></div>
      {developments.length > 0 ? <div><h3 className="narrative-subheading">Key developments</h3><NarrativeList items={developments} /></div> : null}
      {narrative.attention.length > 0 ? <div><h3 className="narrative-subheading">Needs attention</h3><NarrativeList items={narrative.attention} /></div> : null}
      <details className="narrative-evidence"><summary>Inspect evidence</summary><ul>{[...developments, ...narrative.attention].map((item) => <li key={item.id}><strong>{item.title}</strong><span>{item.evidenceRefs.map((evidence) => `${evidence.kind}: ${evidence.id}`).join(" · ")}</span></li>)}</ul></details>
    </section>
  );
}

function ChannelCard({ source, breakdown, summary }: { source: ProviderSource; breakdown?: KpiSourceBreakdown; summary?: WorkspaceSourceSummary }) {
  const keys: KpiMetricKey[] = source === "shopify" ? ["commerce_revenue", "orders", "aov"] : ["spend", "roas", "cpa", "conversions"];
  const metrics = keys.flatMap((key) => breakdown?.metrics.find((metric) => metric.key === key && metric.status === "available") ?? []);
  return (
    <article className="channel-card">
      <div className="channel-title"><div><span className={`channel-mark ${source}`} aria-hidden="true" /><h3>{sourceLabel(source)}</h3></div><span>{summary?.status === "ready" ? "Ready" : "Review"}</span></div>
      <dl>{metrics.slice(0, 3).map((metric) => <div key={metric.key}><dt>{METRIC_LABELS[metric.key]}</dt><dd>{formatMetricValue(metric, metric.value)}</dd><small>{formatPercentageChange(metric.comparison.percentageChange)}</small></div>)}</dl>
      <p>{summary ? `${summary.normalizedRowCount.toLocaleString("en-US")} observations · Through ${formatDate(summary.dateRange.end)}` : "No current data"}</p>
    </article>
  );
}

function Dashboard({
  analysis,
  snapshot,
  client,
  onUpdate,
  onOpenReport,
}: {
  analysis: DashboardAnalysis;
  snapshot: AnalysisSnapshot;
  client: ClientMemory;
  onUpdate: () => void;
  onOpenReport: () => void;
}) {
  const readyKpis = analysis.kpis.status === "ready" ? analysis.kpis : null;
  const readyChanges = analysis.changeIntelligence.status === "ready" ? analysis.changeIntelligence : null;
  const heroKeys: KpiMetricKey[] = metricByKey(readyKpis?.metrics ?? [], "commerce_revenue")
    ? ["commerce_revenue", "spend", "mer", "orders"]
    : ["spend", "conversions", "cpa", "clicks"];
  const hero = heroKeys.flatMap((key) => metricByKey(readyKpis?.metrics ?? [], key) ?? []);
  const spendMetric = metricByKey(readyKpis?.metrics ?? [], "spend");
  const targetBreaches = readyChanges?.observations.filter((item) => item.type === "TARGET_BREACH") ?? [];
  const healthAttention = analysis.dataHealth.findings.filter((finding) => finding.blocking || finding.severity === "warning").map(humanizeDataHealthFinding);
  const qualityLabel = analysis.dataHealth.status === "healthy" ? "Good" : analysis.dataHealth.status === "blocked" ? "Blocked" : `${healthAttention.length} item${healthAttention.length === 1 ? "" : "s"} to review`;
  const dataThrough = snapshot.sourceFreshness.reduce<string | null>((earliest, source) => earliest === null || source.dataThrough < earliest ? source.dataThrough : earliest, null);
  const freshness = freshnessStatus(snapshot);
  const freshnessLabel = freshness === "current" ? "Current" : freshness === "needs_refresh" ? "Needs refresh" : "Old";
  return (
    <div className="dashboard">
      <section className="performance-section" aria-labelledby="performance-heading">
        <div className="performance-heading"><div><p className="eyebrow">Performance</p><h1 id="performance-heading">Performance</h1><p>{periodLabel(analysis.dataHealth.reportingPeriod.currentPeriod.start, analysis.dataHealth.reportingPeriod.currentPeriod.end)} <span>vs {periodLabel(analysis.dataHealth.reportingPeriod.comparisonPeriod.start, analysis.dataHealth.reportingPeriod.comparisonPeriod.end)}</span></p></div><div className="performance-actions"><button className="secondary-action" onClick={onUpdate}>Update data</button><button className="primary-action" onClick={onOpenReport} disabled={analysis.dataHealth.status === "blocked" || !snapshot.narrative}>Open report</button></div></div>
        <div className={`freshness-banner freshness-${freshness}`}><strong>{dataThrough ? `Data through ${formatDate(dataThrough)}` : `Last analyzed ${new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(new Date(snapshot.analyzedAt))}`}</strong><span>{freshnessLabel}</span><small>Last analyzed {new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(snapshot.analyzedAt))}. Manual CSV data; no automatic sync.</small></div>
        {readyKpis ? <div className="hero-kpis">{hero.map((metric, index) => <KpiBlock key={metric.key} metric={metric} className={index === 0 ? "primary-kpi" : ""} />)}</div> : <div className="blocked-panel"><strong>Performance is paused</strong><p>Resolve the blocking data issue before Relay calculates KPIs.</p></div>}
        <TrendChart trend={analysis.trend} currency={spendMetric ? currentCurrency(spendMetric) : null} />
      </section>
      <PerformanceSummary analysis={analysis} freshness={freshness} />
      <WhatChanged observations={readyChanges?.observations ?? []} />
      <section className="dashboard-section channels-section" aria-labelledby="channels-heading">
        <div className="section-heading"><div><p className="eyebrow">Source view</p><h2 id="channels-heading">Channels</h2></div></div>
        <div className="channel-grid">{SOURCES.filter((source) => analysis.sources.some((item) => item.source === source.id)).map((source) => <ChannelCard key={source.id} source={source.id} summary={analysis.sources.find((item) => item.source === source.id)} breakdown={readyKpis?.sourceBreakdown.find((item) => item.source === source.id)} />)}</div>
      </section>
      <section className="dashboard-section attention-section" aria-labelledby="attention-heading">
        <div className="section-heading"><div><p className="eyebrow">Action queue</p><h2 id="attention-heading">Attention</h2></div><span className="attention-count">{targetBreaches.length + healthAttention.length}</span></div>
        {targetBreaches.length + healthAttention.length === 0 ? <p className="quiet-empty good-state">Nothing needs your attention for this reporting period.</p> : (
          <div className="attention-list">
            {targetBreaches.map((item) => { const presented = presentObservation(item); return <article key={item.id}><span className="attention-icon" aria-hidden="true">!</span><div><h3>{presented.title}</h3><p>{presented.detail}</p></div></article>; })}
            {healthAttention.map((item) => <article key={item.finding.id}><span className="attention-icon" aria-hidden="true">!</span><div><h3>{item.title}</h3><p>{item.description}</p>{item.action ? <button className="text-action" onClick={onUpdate}>{item.action}</button> : null}</div></article>)}
          </div>
        )}
      </section>
      <section className="quality-section" aria-labelledby="quality-heading">
        <div><p className="eyebrow">Trust signal</p><h2 id="quality-heading">Data quality</h2></div>
        <strong className={`quality-badge ${analysis.dataHealth.status}`}>Data quality {qualityLabel}</strong>
        <details><summary>View details</summary><div><p>{analysis.dataHealth.checksRun.length} deterministic checks ran across source coverage, dates, currency, mapping, provenance, duplicates, and reconciliation.</p>{analysis.dataHealth.findings.length > 0 ? <ul>{analysis.dataHealth.findings.map((finding) => <li key={finding.id}><strong>{finding.code}</strong><span>{finding.message}</span></li>)}</ul> : <p>No Data Health findings.</p>}</div></details>
      </section>
      <RecentReports client={client} />
    </div>
  );
}

function WorkspaceSession({
  memory,
  client,
  onSelectClient,
  onCreateClient,
  onRenameClient,
  onDeleteClient,
  onClientChange,
  onReset,
}: {
  memory: RelayMemoryV1;
  client: ClientMemory;
  onSelectClient: (id: string) => void;
  onCreateClient: (name: string) => void;
  onRenameClient: (name: string) => void;
  onDeleteClient: () => void;
  onClientChange: (client: ClientMemory) => void;
  onReset: () => void;
}) {
  const [view, setView] = useState<View>("overview");
  const [files, setFiles] = useState<Partial<Record<ProviderSource, File>>>({});
  const [start, setStart] = useState(client.latestAnalysisSnapshot?.reportingPeriod.currentPeriod.start ?? "");
  const [end, setEnd] = useState(client.latestAnalysisSnapshot?.reportingPeriod.currentPeriod.end ?? "");
  const [dashboardState, setDashboardState] = useState<{ analysis: DashboardAnalysis; snapshot: AnalysisSnapshot } | null>(() => (
    client.latestAnalysisSnapshot ? { analysis: client.latestAnalysisSnapshot, snapshot: client.latestAnalysisSnapshot } : null
  ));
  const [exceptions, setExceptions] = useState<MappingException[]>([]);
  const [choices, setChoices] = useState<MappingChoices>({});
  const [error, setError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [report, setReport] = useState<ReportDocument | null>(null);
  const fileSources = useMemo(() => selectedSources(files), [files]);
  const expectedSources = useMemo(() => SOURCES.flatMap((source) => client.sources[source.id].expected || files[source.id] ? [source.id] : []), [client.sources, files]);

  function setFile(source: ProviderSource, file: File | undefined) {
    setFiles((current) => {
      const next = { ...current };
      if (file) next[source] = file;
      else delete next[source];
      return next;
    });
    setChoices((current) => ({ ...current, [source]: {} }));
    setExceptions((current) => current.filter((item) => item.source !== source));
    setError(null);
    if (file && !client.sources[source].expected) {
      onClientChange({
        ...client,
        updatedAt: new Date().toISOString(),
        sources: { ...client.sources, [source]: { ...client.sources[source], expected: true } },
        workflow: { ...client.workflow, firstSetupStartedAt: client.workflow.firstSetupStartedAt ?? new Date().toISOString() },
      });
    }
  }

  function setMappingChoice(source: ProviderSource, columnIndex: number, value: string) {
    setChoices((current) => ({
      ...current,
      [source]: { ...current[source], [columnIndex]: value === "__ignored" ? null : value as CanonicalField },
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (fileSources.length === 0) {
      setError("Add at least one source CSV before preparing the dashboard.");
      return;
    }
    if (!start || !end || start > end) {
      setError("Choose a valid reporting period before preparing the dashboard.");
      return;
    }
    setIsPreparing(true);
    setError(null);
    try {
      const formData = new FormData();
      for (const source of fileSources) formData.set(source, files[source]!);
      const mappingOverrides = Object.fromEntries(fileSources.map((source) => [source, Object.entries(choices[source] ?? {}).map(([columnIndex, canonicalField]) => ({ columnIndex: Number(columnIndex), canonicalField }))]));
      formData.set("workspaceContext", JSON.stringify({ currentPeriod: { start, end }, expectedSources, mappingOverrides, savedMappings: clientMappingRequest(client) }));
      formData.set("changeTargets", JSON.stringify(client.targets));
      const response = await fetch("/api/workspace/analyze", { method: "POST", body: formData });
      const payload = await response.json() as WorkspaceAnalysisResult | RejectedResponse;
      if (!response.ok || payload.status === "rejected") {
        const code = payload.status === "rejected" ? payload.error.code : "WORKSPACE_ANALYSIS_FAILED";
        setError(friendlyError(code, fileSources));
        return;
      }
      if (payload.status === "mapping_required") {
        setExceptions(payload.exceptions);
        setView("sources");
        return;
      }
      setExceptions([]);
      const analyzedAt = new Date().toISOString();
      const updatedClient = recordWorkspaceAnalysis(client, payload, { snapshotId: crypto.randomUUID(), analyzedAt, targets: client.targets });
      onClientChange(updatedClient);
      setDashboardState({ analysis: payload, snapshot: updatedClient.latestAnalysisSnapshot! });
      setView("overview");
    } catch {
      setError("Relay couldn’t reach the analysis service. Your selected files are still here; try again.");
    } finally {
      setIsPreparing(false);
    }
  }

  function openReport() {
    if (!dashboardState) return;
    if (report) {
      setView("report");
      return;
    }
    try {
      setReport(composeReport({ client, snapshot: dashboardState.snapshot, generatedAt: new Date().toISOString() }));
      setView("report");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Relay couldn’t prepare this report.");
    }
  }

  function exportReport() {
    if (!report || !canExportReport(report, dashboardState?.snapshot)) return;
    const previousTitle = window.document.title;
    window.document.title = reportFilename(report).replace(/\.pdf$/i, "");
    printReport(report, dashboardState?.snapshot, () => window.print());
    window.setTimeout(() => { window.document.title = previousTitle; }, 0);
  }

  function refreshReport() {
    if (!dashboardState) return;
    try {
      setReport(composeReport({ client, snapshot: dashboardState.snapshot, generatedAt: new Date().toISOString() }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Relay couldn’t refresh this report.");
    }
  }

  return (
    view === "report" && report ? <ReportPreview report={report} stale={isReportStale(report, dashboardState?.snapshot)} onBack={() => setView("overview")} onExport={exportReport} onRefresh={refreshReport} /> : <main className="app-shell">
      <header className="topbar">
        <a className="relay-mark" href="#main-content" aria-label="Relay home"><span aria-hidden="true">R</span><strong>Relay</strong></a>
        <ClientSelector clients={memory.clients} activeClient={client} onSelect={onSelectClient} onCreate={onCreateClient} onRename={onRenameClient} onDelete={onDeleteClient} />
        <div className="topbar-period"><span>{periodLabel(start, end)}</span><small>{dashboardState ? "Saved in this browser" : "Not analyzed yet"}</small></div>
      </header>
      <nav className="primary-nav" aria-label="Primary navigation">
        <button className={view === "overview" ? "active" : ""} aria-current={view === "overview" ? "page" : undefined} onClick={() => setView("overview")}>Overview</button>
        <button className={view === "sources" ? "active" : ""} aria-current={view === "sources" ? "page" : undefined} onClick={() => setView("sources")}>Data Sources <span>{expectedSources.length}</span></button>
        {dashboardState ? <button onClick={openReport}>Reports</button> : null}
      </nav>
      <div className="workspace-layout">
        <SourceRail files={files} analysis={dashboardState?.analysis ?? null} client={client} onManage={() => setView("sources")} />
        <div id="main-content" className="main-content">
          {view === "sources" ? (
            <SourceManager files={files} analysis={dashboardState?.analysis ?? null} client={client} start={start} end={end} exceptions={exceptions} choices={choices} error={error} isPreparing={isPreparing} onFile={setFile} onClientChange={onClientChange} onReset={onReset} onStart={setStart} onEnd={setEnd} onChoice={setMappingChoice} onSubmit={submit} />
          ) : dashboardState ? <Dashboard analysis={dashboardState.analysis} snapshot={dashboardState.snapshot} client={client} onUpdate={() => setView("sources")} onOpenReport={openReport} /> : <EmptyOverview onAdd={() => setView("sources")} />}
        </div>
      </div>
      <footer className="app-footer"><span>Browser-only memory</span><span>CSV data is not retained</span><span>Deterministic analytics</span></footer>
    </main>
  );
}

export function RelayWorkspace() {
  const storeRef = useRef<RelayMemoryStore | null>(null);
  const loadedRef = useRef(false);
  const [memory, setMemory] = useState<RelayMemoryV1 | null>(null);
  const [invalidMemory, setInvalidMemory] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const store = createBrowserMemoryStore();
    storeRef.current = store;
    const loaded = store.load();
    let storageWarning = loaded.reason === "unavailable"
      ? "Relay cannot access browser storage. You can continue, but this session will not be remembered."
      : null;
    let nextMemory = loaded.memory;
    const active = nextMemory.clients.find((client) => client.id === nextMemory.activeClientId);
    if (loaded.status === "ready" && active?.latestAnalysisSnapshot) {
      nextMemory = updateClient(nextMemory, active.id, (client) => ({ ...client, workflow: { ...client.workflow, dashboardReturnCount: client.workflow.dashboardReturnCount + 1 } }));
      try { store.save(nextMemory); } catch { storageWarning = "Relay could not update local browser memory."; }
    }
    queueMicrotask(() => {
      setInvalidMemory(loaded.status === "invalid" && loaded.reason !== "unavailable");
      setStorageError(storageWarning);
      setMemory(nextMemory);
    });
  }, []);

  function persist(next: RelayMemoryV1) {
    setMemory(next);
    setInvalidMemory(false);
    try {
      storeRef.current?.save(next);
      setStorageError(null);
    } catch {
      setStorageError("Relay could not save this browser-only memory. Check available site storage or clear local Relay data.");
    }
  }

  function reset() {
    setMemory(createEmptyMemory());
    setInvalidMemory(false);
    try {
      storeRef.current?.reset();
      setStorageError(null);
    } catch {
      setStorageError("Relay could not clear browser memory. The current session was reset, but saved browser data may remain.");
    }
  }

  if (memory === null) return <main className="memory-loading" role="status">Loading local Relay memory…</main>;
  const activeClient = memory.clients.find((client) => client.id === memory.activeClientId) ?? memory.clients[0];
  if (!activeClient) return <>{storageError ? <div className="storage-banner" role="alert">{storageError}</div> : null}<FirstClient invalidMemory={invalidMemory} onReset={reset} onCreate={(name) => persist(createClient(memory, { id: crypto.randomUUID(), name, now: new Date().toISOString() }))} /></>;

  return (
    <>
      {storageError ? <div className="storage-banner" role="alert">{storageError}</div> : null}
      <WorkspaceSession
        key={activeClient.id}
        memory={memory}
        client={activeClient}
        onSelectClient={(id) => persist(selectClient(memory, id))}
        onCreateClient={(name) => persist(createClient(memory, { id: crypto.randomUUID(), name, now: new Date().toISOString() }))}
        onRenameClient={(name) => persist(renameClient(memory, activeClient.id, name, new Date().toISOString()))}
        onDeleteClient={() => persist(deleteClient(memory, activeClient.id))}
        onClientChange={(client) => persist(updateClient(memory, activeClient.id, () => client))}
        onReset={reset}
      />
    </>
  );
}
