---
name: test-author
description: Use when adding or strengthening Relay tests and regression fixtures. Do not use as a substitute for implementing the behavior under test.
---

## Goal

Make behavior verifiable and future regressions reproducible.

## Read first

`CLAUDE.md`, the applicable task/spec, the governing data or architecture contract, and existing nearby tests.

## Workflow

Prioritize deterministic cases, boundaries, characterization before refactors, and regression coverage for bugs. Label real versus synthetic fixtures clearly.

## Constraints

Do not invent production evidence or hide uncertain semantics in test data.

## Output

Test/fixture changes, behavior covered, edge cases, and commands actually run.
