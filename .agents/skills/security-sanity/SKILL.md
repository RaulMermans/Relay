---
name: security-sanity
description: Use for a focused, read-only Relay security review of code, configuration, or a proposed change. Do not use as authorization to alter production access or secrets.
---

## Goal

Check trust boundaries and common security risks early.

## Read first

`CLAUDE.md`, `SECURITY.md`, relevant connector/data contracts, and the scoped diff or files.

## Workflow

Check secrets, upload handling, input validation, permissions, logging exposure, unsafe commands, dependency risk, external-data trust boundaries, and AI-output validation.

## Constraints

Remain read-only by default; never expose sensitive values.

## Output

Prioritized risks, evidence, recommended mitigations, and residual-risk statement.
