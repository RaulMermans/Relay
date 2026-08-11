# ADR-002: Unified source adapter contract

## Status

Accepted for V1 architecture.

## Context

CSV uploads and API connectors are permanent Relay ingestion methods, but their transport concerns differ. CSV needs file validation, source detection, parsing, and mapping. Connectors need authorization/session abstraction, account discovery, fetching, pagination, and retries. Analytics must not know either transport or provider payload shapes.

## Options considered

### Option A: One interface for CSV adapters and API connectors

This appears uniform but forces unrelated lifecycle methods, such as OAuth and CSV parsing, into a fake common abstraction.

### Option B: Separate ingestion interfaces that converge on one normalized contract

CSV and connector adapters own their transport-specific work, then produce a shared raw representation and call the same normalization contract. Analytics receives canonical observations, provenance, and structured findings only.

## Decision

Adopt Option B.

- A CSV ingestion adapter identifies and validates the file, detects the source, parses it, applies/requests mapping, and produces a raw dataset representation.
- A connector ingestion adapter manages authorization/session state, account selection, fetching, pagination/retries, and produces a raw provider-result representation.
- A provider normalizer validates source input, maps provider fields, normalizes to canonical observations, returns provenance, and exposes structured errors/findings.
- The shared downstream boundary accepts canonical observations plus provenance and findings. It has no branch on CSV versus connector and no dependency on provider response structure.

## Consequences

Relay avoids a fake transport interface while preserving one canonical analytics contract. CSV/API equivalence is testable at the canonical boundary. Provider-specific details remain inside the adapter/normalizer family.

## Revisit triggers

Revisit if a third ingestion transport shares a real common lifecycle with CSV and connectors, or if repeated provider-normalization code demonstrates a smaller, evidence-based shared interface.

## Validation path

For equivalent Meta, Google, and Shopify fixture data, verify that CSV and connector paths produce equivalent canonical semantics, provenance shape, and validation findings where applicable.
