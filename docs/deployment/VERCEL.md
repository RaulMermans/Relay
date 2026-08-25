# Vercel production contract

## Current production record

| Field | Value |
| --- | --- |
| Project | `relay` (`prj_Is4GW7cwg2bOmltMIeKFWqYq8rTK`) |
| Team | `raulmermans' projects` (`team_XhPrQDNS4DIWblm4khq4VNU0`) |
| Framework | Next.js |
| Production branch | `main` |
| Current production commit | `e8aff9472fb25f24a4c4e774a75fe48636debe24` |
| Deployment | `dpl_DpkqQt7grBe2AF3YKhatwJqfN9ze` (READY) |
| Production URL | `https://relay-9880vu2ib-raulmermans-projects.vercel.app/` |
| Runtime | Node 24.x / npm 11.x |
| Build | repository-default `npm run build` |
| Relay-specific environment variables | none |

`GET /api/health` on the current production deployment returned `200` with `{ "status": "ok", "service": "relay" }`, `Cache-Control: no-store`, and no internal configuration. The production root remains protected: unauthorised access redirects to Vercel authentication.

## Access model

Relay remains a deployment-gated private beta. Vercel Authentication restricts access to authorised testers; no application authentication is added because V1 has no cloud client records, live OAuth, or server-owned identity boundary. Public access remains out of scope until a durable rate/abuse-control design is selected. See [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection) and [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication).

## Deployment checks

Before promoting a changed release, confirm the protected deployment, `GET /api/health`, a synthetic supported-CSV workflow, browser-local restore, report preview, browser print boundary, and runtime error/log state. Do not add secrets merely to make a CSV-only Relay deployment pass. `NODE_ENV` may be `development`, `test`, or `production`; server-only configuration must never use a `NEXT_PUBLIC_` prefix unless intentionally public.

## Rollback

The previous verified production deployment is `dpl_Eb5rB5equRdeTaYaewJuqimFPrzS` at commit `c05bd108cc552a945cc1b97f6c311a650d9bd3c8`. If the current deployment has a P0/P1 failure, redeploy that known-good Vercel deployment/commit, verify `/api/health` and the protected route, then pause tester access as needed. Relay has no database, migration, cloud state, or PDF artifact to roll back. Browser-local memory may remain; use Relay’s existing recovery/reset behavior only when appropriate.
