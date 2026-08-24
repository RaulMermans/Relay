# Vercel readiness contract

Relay is not deployed by this document. Vercel build command is `npm run build`, runtime is Node 24.x with npm 11.x, and no Relay-specific environment variable is required. `NODE_ENV` may be `development`, `test`, or `production`; server-only configuration must never be exposed with a `NEXT_PUBLIC_` prefix unless intentionally public.

Private beta decision: use Vercel Authentication with protected deployment access and do not expose a public production domain. Vercel documents that Vercel Authentication restricts access to authorised Vercel users and that protecting production domains requires an eligible protection scope/plan; confirm the team plan and protection scope before invite. No application authentication is added because V1 stores no cloud client records and live OAuth remains disabled. See [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection) and [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication).

Before any deployment, validate a protected preview, `GET /api/health`, one supported CSV flow, local-memory reload, report preview, and browser print. Roll back by redeploying the recorded known-good commit; do not claim a database rollback because none exists.
