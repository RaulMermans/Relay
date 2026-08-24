"use client";

import type { ReportDocument } from "../lib/report/types";

function date(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00Z`));
}

function period(start: string, end: string) {
  return `${date(start)} – ${date(end)}`;
}

export function ReportPreview({ report, stale, onBack, onExport, onRefresh }: { report: ReportDocument; stale: boolean; onBack: () => void; onExport: () => void; onRefresh: () => void }) {
  const show = (section: ReportDocument["sections"][number]) => report.sections.includes(section);
  const issues = report.healthFindings;
  return (
    <main className="report-preview-shell">
      <header className="report-toolbar" aria-label="Report actions">
        <button className="text-action" type="button" onClick={onBack}>← Back to dashboard</button>
        <div><span>Report preview</span><button className="primary-action" type="button" onClick={onExport} disabled={stale}>Export PDF</button></div>
      </header>
      {stale ? <div className="report-stale" role="alert"><strong>This report is based on an older analysis.</strong><span>Refresh the report before exporting.</span><button className="text-action" type="button" onClick={onRefresh}>Refresh report</button></div> : null}
      <article className="client-report" aria-labelledby="report-title">
        <header className="report-cover">
          <div className="report-brand"><span aria-hidden="true">R</span> Relay</div>
          <p className="report-kicker">{report.client.cadence === "monthly" ? "Monthly performance report" : "Performance report"}</p>
          <h1 id="report-title">{report.client.name}</h1>
          <p className="report-period">{period(report.reportingPeriod.currentPeriod.start, report.reportingPeriod.currentPeriod.end)}</p>
          <dl><div><dt>Compared with</dt><dd>{period(report.reportingPeriod.comparisonPeriod.start, report.reportingPeriod.comparisonPeriod.end)}</dd></div><div><dt>Prepared</dt><dd>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(report.generatedAt))}</dd></div></dl>
        </header>
        <section className="report-executive report-section" aria-labelledby="executive-summary"><p className="report-eyebrow">Executive summary</p><h2 id="executive-summary">{report.executive.headline}</h2><p>{report.executive.summary}</p></section>
        {show("performance") ? <section className="report-section" aria-labelledby="performance-overview"><p className="report-eyebrow">Performance overview</p><h2 id="performance-overview">A concise view of this period</h2><div className="report-kpis">{report.performance.map((metric) => <dl key={metric.key}><dt>{metric.label}</dt><dd>{metric.value}</dd><small>{metric.comparison === "—" ? "No comparable prior-period value" : `${metric.comparison} vs previous period`}</small></dl>)}</div>{report.missingCommerce ? <p className="report-disclosure">Shopify data isn’t included. Commerce Revenue and MER are unavailable; paid-media metrics remain source-specific.</p> : null}{report.trend.length > 0 ? <p className="report-trend-summary">Trend coverage: {report.trend.length} days of paid spend and Shopify Commerce Revenue, shown only as supplied by the current analysis.</p> : null}</section> : null}
        {show("what_changed") ? <section className="report-section" aria-labelledby="what-changed"><p className="report-eyebrow">What changed</p><h2 id="what-changed">The developments worth reviewing</h2>{report.developments.length ? <ol className="report-stories">{report.developments.map((item) => <li key={item.id}><strong>{item.title}</strong><span>{item.text}</span></li>)}</ol> : <p>No material comparable changes were identified for this period.</p>}</section> : null}
        {show("channels") ? <section className="report-section" aria-labelledby="channel-performance"><p className="report-eyebrow">Channel performance</p><h2 id="channel-performance">Source-specific results</h2><div className="report-channels">{report.channels.map((channel) => <article key={channel.source}><header><h3>{channel.label}</h3><span>{channel.status === "ready" ? "Complete" : "Review coverage"}</span></header><dl>{channel.metrics.map((metric) => <div key={metric.key}><dt>{metric.label}</dt><dd>{metric.value}</dd><small>{metric.comparison}</small></div>)}</dl><p>Data through {date(channel.dataThrough)}.</p></article>)}</div></section> : null}
        {show("attention") ? <section className="report-section report-attention" aria-labelledby="needs-attention"><p className="report-eyebrow">Needs attention</p><h2 id="needs-attention">Items to review</h2>{[...report.attention, ...issues.map((finding) => ({ id: finding.id, title: "Data quality needs review", text: finding.message }))].length ? <ul>{[...report.attention, ...issues.map((finding) => ({ id: finding.id, title: "Data quality needs review", text: finding.message }))].map((item) => <li key={item.id}><strong>{item.title}</strong><span>{item.text}</span></li>)}</ul> : <p>No material issues detected for this reporting period.</p>}</section> : null}
        <section className="report-section report-quality" aria-labelledby="data-quality"><p className="report-eyebrow">Data quality and freshness</p><h2 id="data-quality">{report.dataHealth.status === "healthy" ? "Data quality: Good" : "Data quality needs review"}</h2><p>Data through {report.freshness.dataThrough ? date(report.freshness.dataThrough) : "the recorded analysis date"}. This report reflects manually supplied data and does not automatically refresh.</p><dl className="report-quality-sources">{report.channels.map((channel) => <div key={channel.source}><dt>{channel.label}</dt><dd>{channel.status === "ready" ? "Complete" : "Review coverage"}</dd></div>)}</dl></section>
        {show("methodology") ? <section className="report-section report-methodology" aria-labelledby="methodology"><p className="report-eyebrow">Methodology</p><h2 id="methodology">How to read this report</h2><ul>{report.methodology.map((note) => <li key={note}>{note}</li>)}</ul></section> : null}
        <footer className="report-footer"><span>Prepared with Relay</span><span>{period(report.reportingPeriod.currentPeriod.start, report.reportingPeriod.currentPeriod.end)}</span></footer>
      </article>
    </main>
  );
}
