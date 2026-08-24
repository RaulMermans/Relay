# Private-beta runbook

## Preflight

1. Confirm the release checklist is green and record the known-good commit.
2. Verify Node 24.x/npm 11.x and the production build locally.
3. Enable Vercel Authentication for the beta deployment; do not publish an unprotected production domain.
4. Use synthetic or intentionally supplied data and remove unnecessary identifying fields.

## Deployment and smoke test

1. Open the protected deployment in a private browser and confirm unauthorised access is denied.
2. Confirm `GET /api/health` returns only `{ "status": "ok", "service": "relay" }`.
3. Create a local client, upload a supported CSV, analyze, reload, preview a report, and invoke the browser print dialog.
4. Repeat the critical smoke on Chromium, Firefox, and WebKit/Safari-equivalent.

## Support and triage

Collect only safe diagnostics: release commit, browser/version, route/state, safe code, source type, row count, and reporting period. Do not request raw exports, notes, report text, cookies, credentials, or screenshots containing sensitive data unless a tester explicitly redacts and chooses to supply them. Classify P0–P3 per the release gate, reproduce with synthetic data, and pause beta for P0/P1.

## Rollback and recovery

Redeploy the recorded known-good commit through Vercel; do not delete the failed deployment until rollback is verified. Relay has no database rollback. Browser memory is versioned: incompatible/corrupt memory is reset through the Relay-only reset action, while valid V1 memory remains readable by a rollback release. Revoke tester deployment access if the beta is paused.

## Exit

Close beta only after the release gate passes, issues are triaged, and testers have been told how local-memory retention and PDF behavior work.
