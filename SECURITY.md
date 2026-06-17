# Security and privacy

## Secrets

- Browser code may use only `VITE_SUPABASE_URL` and a Supabase publishable key.
- Administrative scripts must use `SUPABASE_SECRET_KEY` from an ignored
  `.env.admin.local` file or the deployment secret manager.
- The Vercel project must contain only `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_KEY`; it does not need an administrative Supabase key.
- Never put secret/service-role keys in variables prefixed with `VITE_`.
- Rotate a secret immediately if it appears in source control, logs, screenshots,
  issue trackers, or browser bundles.

## Production checklist

1. Apply every migration in `supabase/migrations`, including
   `0004_security_privacy_hardening.sql`,
   `0005_catalog_least_privilege.sql`, and
   `0007_contribution_security_hardening.sql`.
2. Run the Supabase Security Advisor and review every exposed table/function.
3. Set `PUBLIC_SITE_URL` or `SITE_URL` in production so canonical/Open Graph
   metadata never depends on an untrusted forwarded host.
4. Configure exact OAuth redirect URLs. Do not use wildcard production domains.
5. Restrict Vercel preview wildcards to the project's team/account slug.
6. Enable MFA for project administrators and protect the deployment account.
7. Set session lifetime and inactivity limits appropriate to the project.
8. Keep database backups encrypted and test restoration and deletion procedures.
9. Add an abuse-control layer such as rate limiting or CAPTCHA before promoting
   anonymous reactions to a high-value or incentivized feature.
10. Publish a privacy notice identifying the controller, contact channel,
   purposes, legal bases, retention periods, providers, international transfers,
   and how data-subject requests are handled.
11. Maintain an incident-response process and evaluate notification duties for
    incidents involving personal data.

## Data handling

- Onboarding answers are visible only to the itinerary owner.
- Public itinerary links expose only the name, creation date, and selected places.
- Anonymous reaction identifiers are unique per itinerary and hashed at rest.
- A signed-in user can delete their own itinerary from `Meus Roteiros`.
- A signed-in user can delete their account and all cascaded itinerary data.

Security reports should be sent privately to the project owner, never opened as
a public issue with credentials or personal data attached.
