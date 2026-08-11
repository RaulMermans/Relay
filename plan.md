# Sprint 01 - Product Contract + Validation Design

## Goal

Turn Relay's product hypothesis into a precise, testable product contract before architecture or application implementation begins.

## Boundary

Documentation and validation specification only. No application scaffold, dependencies, product code, database, APIs, OAuth, connectors, parsers, UI, AI SDKs, or detailed architecture choices.

## Tasks

### T-010 Product Brief

**Outcome:** Define the first customer, recurring reporting job, promise, boundaries, dual ingestion model, cadence, PDF output, and human review.

**Relevant docs:** `docs/product/PROJECT_BRIEF.md`, `docs/product/MVP_SCOPE.md`.

**Acceptance criteria:** Customer and manual workaround are concrete; boundaries are explicit; hypotheses are not evidence.

**Status:** Complete.

### T-011 MVP Scope

**Outcome:** Set V1 scope, validation work that may remain manual, and explicit post-V1 exclusions.

**Relevant docs:** `docs/product/MVP_SCOPE.md`.

**Acceptance criteria:** Exactly three scope categories; every V1 item contributes to source data -> decision-ready report.

**Status:** Complete.

### T-012 Success Metrics

**Outcome:** Make primary and secondary validation metrics calculable and evidence-bound.

**Relevant docs:** `docs/product/SUCCESS_METRICS.md`.

**Acceptance criteria:** Every metric states definition, formula, numerator, denominator where applicable, unit, measurement moment, evidence, and status.

**Status:** Complete.

### T-013 User Research

**Outcome:** Provide an executable, privacy-aware research protocol for 3-5 target users.

**Relevant docs:** `docs/research/USER_RESEARCH.md`.

**Acceptance criteria:** Participant IDs, workflow timing, inputs, non-leading questions, privacy, and session output are specified.

**Status:** Complete.

### T-014 Report Analysis

**Outcome:** Define repeatable reverse-engineering of client reports and cross-report comparison.

**Relevant docs:** `docs/research/REPORT_ANALYSIS.md`.

**Acceptance criteria:** Report IDs, capture fields, comparison matrix, and common/configurable/human layers are specified.

**Status:** Complete.

### T-015 Validation Experiment

**Outcome:** Define one measured Relay-style reporting experiment and evidence-based decision rules.

**Relevant docs:** `docs/research/VALIDATION_EXPERIMENT.md`, `docs/product/SUCCESS_METRICS.md`.

**Acceptance criteria:** Inputs, output, measurements, grounding, and PASS/WEAK PASS/FAIL criteria are explicit.

**Status:** Complete.

### T-016 Assumption Register

**Outcome:** Track the initial product hypotheses and how each will be tested.

**Relevant docs:** `docs/product/ASSUMPTIONS.md`.

**Acceptance criteria:** A-001 through A-010 include all required fields and remain untested.

**Status:** Complete.

### T-017 Sprint 02 Decision Inputs

**Outcome:** Hand off unresolved product-driven architecture questions without deciding them.

**Relevant docs:** `docs/architecture/ARCHITECTURE.md`, `docs/decisions/README.md`.

**Acceptance criteria:** Required decision areas and highest-risk questions are explicit; no architecture decision is prematurely accepted.

**Status:** Complete.
