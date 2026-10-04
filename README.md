This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Phase 1.2: Supabase authentication

Implemented email/password signup, confirmation, login, logout, cookie sessions,
server-protected `/dashboard`, and Google/Facebook OAuth with a PKCE callback.
See [authentication setup and verification](./docs/authentication.md) before running.
Only Supabase Auth is accessed from Next.js; tenant business operations remain
the responsibility of FastAPI. No organization model or business tables are added.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Organization onboarding (Phase 1.4)

The dashboard now loads memberships through FastAPI and directs new users to
`/dashboard/onboarding`. Apply the backend onboarding migration before using it.
See [setup, scope, commands and manual checks](../docs/phase-1.4-onboarding.md).
The Knowledge Base destination is an authorized entry page; document uploads are
intentionally deferred to Phase 2.
