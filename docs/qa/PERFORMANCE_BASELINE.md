# Sprint 17 local performance baseline

This is a local synthetic baseline, not a production latency claim. The release-stress integration test generates one 50,000-row, 5 MiB-below-limit Meta CSV and runs the complete server-side workspace pipeline. On 2026-08-24 under Node 24.14.0, the observed test completed in 807 ms; its safety budget is under 10 seconds on the release workstation.

V1 working budgets are: normal dashboard interaction/reload under 1 second in local E2E; one maximum supported CSV analysis under 10 seconds; report composition is synchronous from a compact snapshot and should complete within the same interaction; three-source analysis remains bounded by three 5 MiB source files. The test suite verifies bounds and completion, not production network or browser-rendering latency.

No material frontend performance issue was found in review: persisted state excludes raw arrays/files, analysis runs only on explicit submission, and report preview renders compact derived sections. Revisit these budgets before public access, higher source limits, or durable persistence.
