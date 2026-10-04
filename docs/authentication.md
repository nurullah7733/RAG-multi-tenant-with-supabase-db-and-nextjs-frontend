# Phase 1.2 authentication

## Setup

Use Node.js 22+ and install from the lockfile with `npm ci` in `frontend/`.
Copy `.env.example` to `.env.local` only if you do not already have one; otherwise
merge the new variable names into your existing file. Never commit real values.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project HTTP(S) origin |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public publishable key (`sb_publishable_...`) or legacy `anon` key |
| `APP_URL` | Canonical frontend origin, locally `http://localhost:3000`, HTTPS in production |
| `NEXT_PUBLIC_API_BASE_URL` | Existing FastAPI origin, unchanged |

Do not put a service-role/secret key in this app. Key validation rejects secret
keys and legacy JWTs whose role is not `anon`. No Google or Facebook secret belongs
in frontend environment variables. Configuration is validated when auth routes
run; a build alone does not validate a live Supabase project.

## Manual Supabase configuration

1. Create or select your Supabase project and copy its project URL and public key.
2. Enable Email/password in Authentication providers, allow new user signup,
   and enable email confirmation. Configure a minimum password length of at least
   8 (the form supports 8–128 characters). Stricter provider rules still apply.
3. Set Authentication URL Configuration → Site URL to your `APP_URL`.
   Allow the exact redirect URL `<APP_URL>/auth/callback` for each environment.
   Avoid broad wildcard redirects in production.
4. Keep the signup email template's normal `{{ .ConfirmationURL }}` link.
   Signup passes the allowlisted callback as `emailRedirectTo`.
   Confirm in the browser that started signup: PKCE binds the exchange to its
   cookie. If you confirm elsewhere, return to the original app and sign in
   with email/password after the email has been verified.
5. Configure email delivery/SMTP and review Auth rate limits for real users.
   Supabase's development email service has delivery and recipient limitations.

No app SQL migration is required: identities remain in Supabase-managed Auth.
The existing `backend/supabase/` directory remains untouched. No root-level
Supabase directory, business table, RLS policy, or future schema was created.

## Google

Create a Web OAuth client in Google Cloud and configure the consent screen and
test users as needed. Register the exact Supabase callback displayed by the
Google provider settings (normally
`https://<project-ref>.supabase.co/auth/v1/callback`) as an authorized redirect URI.
Enable Google in Supabase Auth and save the client ID/secret there.
The application's `/auth/callback` is the subsequent Supabase-to-app redirect;
these two callback URLs have different purposes.

## Facebook

Configure Facebook Login for your Meta app. Register the exact Supabase callback
shown in its Facebook provider settings as a Valid OAuth Redirect URI. Configure
`public_profile` and `email` permissions in the authentication/account creation
use case. Enable Facebook in Supabase and save the app ID/secret there.
Development-mode access is limited to app roles/testers; complete applicable
provider requirements before allowing general users. This implementation does
not claim provider approval or enable WhatsApp integration.

Both buttons initiate the supported PKCE redirect flow. Denied/disabled providers,
missing or expired codes, and missing verifier cookies return a safe error.
Provider enablement cannot be inferred from the public project key; configure
each provider before expecting its button to succeed.

## Architecture and security

- Auth mutations use Next.js Server Actions and their POST/origin checks.
- `@supabase/ssr` maintains HTTP-only, SameSite=Lax cookies (Secure on HTTPS).
  There is intentionally no browser Supabase client or localStorage token store.
- `proxy.ts` refreshes sessions for auth pages/dashboard, passing refreshed
  cookies to both the downstream request and response, including redirects.
- `/dashboard` independently calls `auth.getUser()` on the server. A forged
  cookie or client-side navigation cannot establish identity.
- Auth responses are private/no-store; do not add CDN caching to these routes.
- OAuth uses a cookie-bound PKCE verifier. Callback destinations are fixed paths
  under `APP_URL`; `Host`, forwarded host, and `next` input cannot change them.
- Logout revokes the current session, clears its cookies, and redirects to login.
  Other devices stay signed in. No logout mutation is exposed as a GET route.
- Credentials, tokens and raw provider errors are not logged by application code.
  Configure hosting access logs to redact query strings on `/auth/callback`.
- No tenant data is accessed here. Membership/RLS and protected FastAPI business
  APIs must be implemented in their own later tasks.

## Commands

Run from `frontend/` (use `npm.cmd` instead of `npm` if PowerShell blocks scripts):

```text
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Tests use Node's built-in runner and the existing TypeScript compiler. Provider
and framework boundaries are mocked; they validate real auth action, callback,
proxy, validation, configuration and dashboard behavior without live credentials.
They do not replace live OAuth/email verification.

Existing backend regression checks, from `backend/`:

```powershell
$env:DEBUG = 'false'
.venv\Scripts\python.exe -m pytest -q -p no:cacheprovider
```

`DEBUG` must be boolean: this environment supplied `release`, which the existing
Pydantic settings reject. The test override does not edit your `.env`.
Existing backend settings also require its `SUPABASE_URL` configuration.

## Manual test checklist

1. Start with the configured environment. Visit `/dashboard` in a private browser:
   expect `/login` without protected content. Test a forged/invalid session cookie.
2. Open `/signup`. Invalid email/short password should be rejected. Sign up with
   a test email; expect confirmation instructions, not dashboard access yet.
3. Open the confirmation email in the same browser. Expect `/dashboard` with the
   verified email. If confirmation is intentionally disabled in a test project,
   signup should sign in immediately instead.
4. Sign out. Direct `/dashboard`, refresh, and back/reload must require login.
   Sign in with a wrong password: expect a generic error without account details.
5. Sign in correctly; reload `/dashboard` and restart the browser with its cookies
   preserved. Confirm session restoration. After the access token expires, reload
   and check that the refreshed session cookie persists and access still works.
6. Sign in with Google, then Facebook. Each should return through `/auth/callback`
   to `/dashboard`. Check logout and subsequent email/password login separately.
7. Cancel provider consent. Visit `/auth/callback`, use a reused/expired code, or
   remove the PKCE verifier cookie before callback: expect a safe login error.
   Add `next=https://example.org` or `next=//example.org`: no external redirect.
8. Disable a provider or temporarily block Supabase access: expect sign-in failure,
   never dashboard access. Retry after restoring connectivity.
9. Inspect responses: auth routes must not be publicly cached; HTTPS session
   cookies must have Secure, HttpOnly and SameSite=Lax attributes. Check browser
   assets contain no service-role/provider secret (none is required by this app).

## Scope and limitations

Live email/OAuth and real refresh/revocation require your configured Supabase
project and provider accounts and have not been assumed verified. Password reset,
MFA, organization onboarding, memberships, tenant tables/RLS, and backend token
verification are intentionally deferred. The next phase is 1.3; the detailed
roadmap lists Step 7 backend authentication verification before tenant APIs.

Official references consulted for this implementation:

- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Google login](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Facebook login](https://supabase.com/docs/guides/auth/social-login/auth-facebook)
- Installed Next.js 16 documentation for Proxy, cookies, and Server Actions.
