# Observability contract

Relay sends no product telemetry and integrates no observability vendor in V1. If deployment/runtime logging is configured, it may emit only route, status, safe error code, duration, bounded source count, and bounded row count for route errors, analysis failures, health failures, and report/export boundary failures.

It must never emit CSV content, filenames, parsed/canonical rows, provider payloads, client names, notes, mapping values, report text, cookies, authorization headers, tokens, or credentials. Beta support uses the safe diagnostic fields in the runbook rather than raw data.
