---
name: connector-implementation
description: Implement or change a Relay provider connector, its provider normalizer, authorization/read-only scope, account discovery/selection, reporting fetch, pagination, errors, provenance, or CSV/API equivalence coverage. Use only for an approved provider-specific connector task, not for generic analytics or broad provider research.
---

# Connector implementation

## Read first

Read `CLAUDE.md`, `plan.md`, the current task, and only:

- `docs/integrations/CONNECTOR_CONTRACT.md`
- `docs/integrations/CONNECTOR_SECURITY.md`
- `docs/data/DATA_CONTRACT.md`
- `docs/data/SOURCE_RULES.md`
- current official provider documentation relevant to the task
- the affected connector, provider normalizer, fixtures, and tests

Do not recursively read documentation or research unrelated provider features.

## Workflow

1. Lock the current provider contract and official API/version evidence.
2. Define the server-side authorization boundary and least-privilege read-only scopes.
3. Implement account discovery and server-validated selection.
4. Implement bounded daily reporting fetch, pagination, and structured errors.
5. Normalize provider records into the existing canonical observations.
6. Add a synthetic API fixture equivalent to an existing CSV/canonical fixture.
7. Prove semantic equivalence while ignoring only transport-specific provenance.
8. Run focused security, data-contract, and test reviews.

## Hard rules

- Implement no provider write operation: no campaign, bid, budget, audience, or creative mutation.
- Keep access/refresh tokens, client secrets, auth headers, and raw credentials out of domain records, browser code, fixtures, errors, and logs.
- Keep KPI, Data Health decision, Change Intelligence, AI, and report logic out of connectors.
- Validate selected provider account IDs server-side against discovered/allowed accounts.
- Keep provider payloads inside the connector/normalizer boundary.
- Preserve null versus zero, currency, daily grain, source identity, and revenue semantics.
- Keep advertising attribution in `attributedRevenue`; never convert it to commerce revenue.
- Use current official provider documentation for live APIs; do not rely on remembered endpoints, scopes, versions, or limits.
- Do not claim durable connection state until secure durable server persistence exists.

## Output

Report provider contract evidence, scopes, account/fetch behavior, normalization/equivalence results, security findings, verification commands, and any persistence or activation blocker.
