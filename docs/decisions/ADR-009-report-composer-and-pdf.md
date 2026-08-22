# ADR-009: Deterministic report composer and browser PDF export

## Status

Accepted for Sprint 16.

## Decision

Relay composes a pure, renderer-independent `ReportDocument` from a client and an existing authoritative analysis snapshot. It accepts no raw CSV, parsed rows, canonical observations, or provider payloads, and fails closed for blocked Data Health, missing deterministic Narrative Intelligence, or inconsistent revenue semantics.

Use the browser print flow as the V1 PDF mechanism. The printable preview is the report source; `window.print()` is an explicit user action. No dependency, server runtime, Chromium package, worker, or PDF bytes are introduced.

## Evaluation

Browser print is zero-dependency, Vercel-compatible, deterministic at the report-model boundary, and keeps preview and print in one layout system. Its limitation is that the browser owns the Save-as-PDF dialog and final metadata controls. Direct document libraries would duplicate layout; headless Chromium would add runtime, packaging, Vercel, and maintenance risk without a V1 need.

## Consequences

Relay sets a deterministic, sanitized filename-like document title before print, then restores the application title. Print CSS sets A4 sizing and page-break rules. Future programmatic PDFs may be considered only with a new ADR and must render the same `ReportDocument`.
