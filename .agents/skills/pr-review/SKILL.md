---
name: pr-review
description: Use for a read-only review of a Relay change or pull request. Do not use to rewrite code unless explicitly asked.
---

## Goal

Identify material correctness, contract, security, and maintainability risks.

## Read first

`CLAUDE.md`, task acceptance criteria, governing contracts, diff, and relevant tests.

## Workflow

Review task fit, correctness, security, edge cases, architecture drift, dependency sprawl, complexity, and test coverage. Rank issues P0-P3.

## Constraints

Do not invent issues or claim tests ran without evidence.

## Output

Prioritized findings with file references, rationale, and remaining questions; state explicitly when none are found.
