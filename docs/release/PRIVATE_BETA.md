# Relay private beta contract

## Audience and allowed use

Relay’s beta is a small controlled group of marketers and agency users working with synthetic or intentionally supplied business data. They may manually upload supported Meta Ads, Google Ads, and Shopify CSV exports; review deterministic analysis; and use browser-native Save-as-PDF from the report preview.

It is not production-mature SaaS. Do not use it for regulated, highly sensitive, sole-source-of-record, unattended, or time-critical decision workflows. Testers remain responsible for reviewing supplied data and reports before sharing them.

## Data, privacy, and local memory

Uploads are processed transiently by Relay’s server routes. Raw CSVs, canonical rows, credentials, provider payloads, and PDF bytes are not persisted by Relay. Client names, targets, mapping rules, notes, compact derived snapshots, and limited report history are stored only in the current browser’s local storage. That data has no encryption, account ownership, cloud backup, or multi-device sync and can be lost on site-data clearing, browser reset, or storage failure.

## Limits and known behavior

- One current CSV each for Meta Ads, Google Ads, and Shopify; 5 MiB and 50,000 data rows per CSV; 256 columns; three sources/workspace.
- Up to 50 local clients, 52 history summaries/client, 10 targets/client, 20 notes/client, and 128 saved mappings/client.
- Manual CSV refresh only; no live OAuth, automatic sync, scheduled reports, email delivery, database, accounts, or teams.
- Chromium, Safari/WebKit, and Firefox current stable releases are supported for upload, workspace, local memory, and report preview. PDF print layout and Save-as-PDF controls are browser-owned and can differ.

## Access, support, and exit

The beta must be deployment-gated with Vercel Authentication and no public production domain. Testers receive explicit access and must not redistribute a deployment link. Support reports should include Relay version/commit, browser/version, route or UI state, safe error code, source type, bounded row count, and reporting period—never an export by default.

Beta exit requires no open P0/P1, green deterministic and supported-browser smoke suites, completed release checklist, and reviewed beta feedback. Production/public exposure requires a separate access and rate-limit decision.
