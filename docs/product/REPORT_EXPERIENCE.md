# Relay report experience

## Purpose and reader

Relay turns a validated client analysis into a concise executive performance report for a marketer and their client. Its primary question is: **what happened during this period, what deserves attention, and what evidence supports that view?**

## Hierarchy and inclusion

Every report has a branded cover, deterministic executive summary, Data Quality and freshness disclosure, and source-safe methodology. By preference it may include Performance Overview, What Changed, Channel Performance, Needs Attention, and Methodology. It never includes raw CSVs, canonical rows, technical finding IDs, credentials, internal calculation fields, or ungrounded commentary.

The executive headline and summary are the existing deterministic Narrative Intelligence output. The composer does not rewrite them. Commerce Revenue remains Shopify-only; Meta and Google attributed values, ROAS, and CPA remain source-specific; unavailable commerce values are disclosed rather than rendered as zero.

## Visual and accessibility principles

The preview uses a light editorial A4 canvas, readable semantic headings, tables/definition lists, textual trend coverage, high-contrast status copy, and deliberate break rules. It is not a dashboard screenshot. Color is never the sole meaning carrier.

## Freshness, Data Health, and export

The report states the oldest included source’s data-through date and explicitly says that data is manually supplied and not automatically refreshed. Blocked Data Health prevents a normal performance report. Browser-native **Export PDF** opens the print flow from the same HTML/CSS preview; it does not persist PDF bytes. The browser controls final Save-as-PDF location, while Relay supplies a deterministic, sanitized suggested document title/filename. Export is disabled when the preview snapshot is no longer current.
