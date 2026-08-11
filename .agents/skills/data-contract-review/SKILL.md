---
name: data-contract-review
description: Review Relay changes that affect canonical metrics, provider mapping, normalization, or data semantics. Use whenever a task changes canonical observations, money/currency handling, mapping aliases, provider normalizers, or their regression fixtures.
---

# Data contract review

## Goal

Identify semantic regressions before canonical data reaches Data Health, analytics, or reports. This is a read-only review skill: report findings; do not broaden implementation authority.

## Progressive disclosure

Read only the following, in order:

1. The requested task and changed-file list.
2. `docs/data/DATA_CONTRACT.md`.
3. `docs/data/SOURCE_RULES.md`.
4. The relevant revenue/adapter ADR for the affected domain.
5. The affected mapping module, provider normalizer, and focused tests/fixtures.

Do not recursively read `docs/`, load unrelated provider code, or inspect raw fixture contents beyond the focused test case.

## Review procedure

1. Identify the source domain and the canonical fields added, changed, or removed.
2. Check that advertising attribution and commerce revenue remain separate and that no generic revenue semantic was introduced.
3. Check null versus zero behavior, fixed-precision parsing, currency presence, currency transformations, and mixed-currency handling.
4. Check that provider IDs and display names remain distinct, dates retain declared grain/timezone behavior, and provenance retains a safe source locator plus mapping origin.
5. Check aliases and manual targets for deterministic behavior, ambiguity, duplicate-target rejection, and domain restrictions.
6. Check normalizers do not leak raw headers downstream, fabricate unavailable values, silently aggregate, or drop source-row traceability.
7. Check focused golden/failure tests cover the altered semantic and an appropriate unhappy path.

## Report format

Return only prioritized findings:

- `P0`/`P1`: contract-breaking semantic, integrity, or sensitive-data issue that must block the change.
- `P2`/`P3`: clear evidence, affected file, and a bounded recommendation.
- If none: state `No findings` and list residual assumptions/questions.

Do not claim tests passed unless their observed output is provided in the review context.
