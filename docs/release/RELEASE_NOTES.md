# Relay V1 private-beta release notes

Relay V1 is a protected Vercel deployment for controlled portfolio/private-beta evaluation. It is not a public analytics service.

## Included

- A multi-source CSV workspace for Meta Ads, Google Ads, and Shopify.
- Data Health checks, source-safe KPIs, deterministic Change Intelligence, and inspectable deterministic Narrative Intelligence.
- Browser-local client configuration and compact dashboard history, with raw exports kept transient.
- A report preview and browser-native Print/Save-as-PDF boundary.
- Input hardening, security/data-contract review, cross-browser E2E coverage, protected deployment, health endpoint, runtime-log review, and a rollback record.

## Semantic guardrails

Shopify remains the Commerce Revenue, orders, AOV, and MER source of truth. Meta and Google attributed revenue remains provider-specific and is never combined into Commerce Revenue. Relay does not use a generative model, database, live OAuth, automatic refresh, scheduled reports, or persistent PDF/raw-CSV storage.

## Known limitations

Browser-local memory is not encrypted or synchronized; CSV refresh is manual; browser printing is browser/OS dependent; and public exposure requires an explicit rate/abuse-control decision. See `KNOWN_ISSUES.md`.
