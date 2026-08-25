# Relay V1 project closure

## Scope

Relay V1 is complete as a protected, CSV-only private beta: deterministic multi-source workspace analysis, browser-local client memory, report preview, and browser-native Print/Save-as-PDF. It does not claim public service readiness, user adoption, live OAuth, cloud persistence, application accounts, automatic refresh, scheduled delivery, or generative AI.

## Production record

- Current protected production commit: `e8aff9472fb25f24a4c4e774a75fe48636debe24`.
- Current Vercel deployment: `dpl_DpkqQt7grBe2AF3YKhatwJqfN9ze` (READY).
- Health: `GET /api/health` returned `200` with the minimal expected response.
- Access: Vercel Authentication; unauthorised root access redirects to Vercel sign-in.
- Rollback candidate: `dpl_Eb5rB5equRdeTaYaewJuqimFPrzS` at `c05bd108cc552a945cc1b97f6c311a650d9bd3c8`.

## Evidence

- Sprint 17 automated verification: lint, typecheck, build, audit, diff check, 304 Vitest tests, 209 unit tests, 95 integration tests, and 48 cross-browser Playwright tests passed.
- Synthetic production workspace: €225 Shopify Commerce Revenue, €55 compatible paid spend, 4.09x MER, 2 Shopify orders, and provider-specific 2x Meta/Google ROAS.
- Manual production review: browser-local restore after reload; dashboard/report review; primary actions and KPIs visible at 390 px and 768 px; six-page tagged A4 Chrome PDF with the expected methodology and source-specific results.
- Current production runtime review: no runtime error clusters and no error/warning logs observed after the health check.

## Closure checklist

| Item | Status |
| --- | --- |
| Product scope and semantic safeguards | Complete |
| Protected production deployment and health | Complete |
| Rollback record | Complete |
| Known issues and security policy | Complete |
| Case-study README and deployment documentation | Complete |
| Synthetic production screenshots | Partial — synthetic onboarding and data-preparation states captured; dashboard/report recapture is blocked by browser file-chooser automation |
| Explicit repository license | Blocked on maintainer choice |
| Final verification and independent review | Complete — no P0/P1 findings |
| Final release commit / `RELAY_V1_COMPLETE` | Pending |

## Known limitations retained at closure

- Browser-local memory is not encrypted, synced, or recoverable after site-data clearing.
- CSV refresh is manual; no live OAuth or background refresh is enabled.
- Browser print output is controlled by the browser and operating system.
- Public access requires a deliberate durable rate/abuse-control decision.

## Metrics status

Technical behavior is verified by the release suites and synthetic production workflow. User adoption, reporting-time reduction, insight acceptance, and report-completion hypotheses remain unobserved; they are not V1 results or public claims. See `docs/product/SUCCESS_METRICS.md` for the measurement definitions.
