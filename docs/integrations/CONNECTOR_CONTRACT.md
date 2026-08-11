# Future connector contract

Each connector must eventually provide concepts equivalent to:

- Connect and disconnect
- Connection status
- Account discovery and selection
- Reporting-data fetch
- Provider-output normalization
- Structured errors

Provider-specific API responses must not leak into analytics or business logic. CSV adapters and API connectors converge at the canonical-data boundary.

V1 uses transport-specific CSV and connector ingestion contracts that converge on one provider-normalization result, rather than a fake shared transport interface. See [ADR-002](../decisions/ADR-002-unified-source-adapter-contract.md).
