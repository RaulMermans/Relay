# Relay V1 threat model

## Trust boundaries

| Boundary | Authority | Rule |
| --- | --- | --- |
| Browser input | Untrusted | Files, form fields, and localStorage are validated before use. |
| Server inspection | Authoritative validation | Route handlers reject invalid/bounded requests and return safe errors only. |
| Canonical normalization | Authoritative analytical input | Only validated CSV values become canonical observations. |
| Data Health | Authoritative readiness | Blocked health stops KPI, narrative, and normal reports. |
| KPI and Change Intelligence | Authoritative facts | Deterministic engines retain provider/revenue semantics. |
| Narrative Intelligence and ReportDocument | Deterministic derived output | They accept compact derived facts, never raw rows or HTML. |
| localStorage | Untrusted persisted state | A strict, size-bounded schema is parsed on every load/save. |

## Threats and controls

| Asset | Threat | Existing control | Residual risk / required action | Status |
| --- | --- | --- | --- | --- |
| Browser / React UI | XSS or report injection | React text escaping; no `dangerouslySetInnerHTML`; no report URLs | Browser extensions remain outside Relay’s control | Accepted |
| CSV upload | Oversized, malformed, long-cell, null-byte input | Declared request checks; 5 MiB/file, 50k rows, 256 columns, 32,768-char field; UTF-8 parser | Chunked request bodies are bounded at file validation, after multipart parsing | Mitigated |
| CSV headers | Duplicate or formula-like headers | Duplicate normalized headers reject; formula-like strings stay inert text | Spreadsheet export of a downloaded CSV is not a product capability | Mitigated |
| Normalization | Numeric/BigInt resource abuse | Decimal strings cap at 256 characters; invalid values fail closed | Valid high-value business figures remain supported | Mitigated |
| Route handlers | Route abuse or server error leakage | Four routes have bounded/validated inputs, no-store responses, safe codes/messages | Gated beta has no per-user rate limiter; public launch needs one | Open: public-launch blocker |
| Browser memory | Corruption, prototype pollution, cross-client leakage | Namespaced storage, strict Zod schema, dangerous-key rejection, client ID references, ephemeral fallback | Users can tamper with their own browser state; server never treats it as authority | Accepted |
| Report preview / print | Raw data, stale client report, unsafe filename | Compact snapshot-only composer, stale export guard, sanitized title, explicit print | Browser determines final PDF destination and rendering | Mitigated |
| Provider adapters | Unsafe URLs, credentials, raw payload leakage | Request-scoped credentials only; safe endpoint validation, redaction, no live activation | OAuth remains unavailable without durable ownership and encrypted persistence | Accepted |
| Deployment | Secrets or unauthenticated exposure | No required application secret; deployment protection required for beta | Protection plan/cost must be confirmed before invite | Open: beta preflight |
| Logs / diagnostics | CSV, notes, tokens, payloads in logs | Only route/status/code/duration/count telemetry is permitted | Operators must not add payload logging | Mitigated |
| Data freshness | Stale-data confusion | Explicit manually-supplied data-through and stale-report state | Users must refresh CSVs manually | Accepted |

## Route inventory

| Route | Method / purpose | Input limit and validation | Sensitive data | Response / error policy | Abuse risk |
| --- | --- | --- | --- | --- | --- |
| `/api/health` | GET / deployment check | No body; validates only permitted runtime configuration | None | `{status, service}`, `no-store`; no config detail | Low |
| `/api/intake/csv` | POST / inspect one CSV | 5 MiB file; bounded multipart declaration; UTF-8, parser and CSV limits | Transient CSV | Compact intake metadata; stable 400 code/message | Medium |
| `/api/normalize/csv` | POST / normalize one CSV | Intake limits, 64 KiB mapping JSON, 8 KiB targets, Data Health context validation | Transient CSV | Derived facts only; stable 400 code/message | Medium |
| `/api/workspace/analyze` | POST / analyze up to 3 sources | 3 × 5 MiB files; strict context with 1–3 sources; bounded mappings/targets | Transient CSV | Compact workspace result; stable 400 code/message | High |

## Data inventory and logging rule

| Data | Processing / retention |
| --- | --- |
| Raw uploaded marketing data | Transient request memory only; never browser or server persisted. |
| Derived metrics and snapshots | Browser-persisted only, schema-bounded, per local client. |
| Client names, targets, notes, mappings | Browser-persisted only; not encrypted, not synced. |
| Report snapshots / PDFs | Compact snapshot may be browser-persisted; generated report/PDF bytes are never persisted. |
| Provider credentials | Absent; live OAuth is unavailable. |

Application logs must not contain CSV content, parsed rows, provider payloads, notes, tokens, credentials, or report text. Safe operational fields are route, status, safe error code, duration, and bounded source/row counts.

## Recovery and error taxonomy

`unsupported CSV`, `malformed CSV`, and mapping failures return a corrective upload/review path. Data Health blocks analytical output with a visible reason. Corrupt/unsupported local memory offers a Relay-only reset; unavailable/quota-limited storage continues ephemerally with a warning. A stale/blocked report remains non-exportable and offers refresh/back navigation. Network/server failures show a safe error and retry path, never a stack trace.
