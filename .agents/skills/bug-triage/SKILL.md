---
name: bug-triage
description: Use to diagnose a reproducible Relay defect before fixing it. Do not use for speculative feature requests or unreproduced reports without clear evidence.
---

## Goal

Find the smallest evidence-backed fix without repeated speculative changes.

## Read first

`CLAUDE.md`, the bug report, relevant contracts, affected code, and existing tests.

## Workflow

Reproduce -> form three or fewer hypotheses -> run one check per hypothesis -> select the smallest likely fix -> add a regression test.

## Constraints

Do not change data semantics silently or bundle unrelated cleanup.

## Output

Reproduction evidence, hypothesis checks, root cause, minimal fix, and regression coverage.
