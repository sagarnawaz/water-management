# AquaRoute Ops

Mobile-first water supply management for a local water business. The product is built for two roles only:

- `Admin / Owner`
- `Rider`

There is no customer login. The browser UI is intentionally simple, card-based, touch-friendly, and optimized for fast daily operations.

## What’s included

- Login screen with role-based redirect
- Admin dashboard
- Customers module
- Riders module
- Orders module with guided multi-step creation flow
- Rider dashboard and delivery detail flow
- Mark delivered flow with payment outcome handling
- Payment verification and manual payment entry
- Customer ledger / due tracking
- Reports dashboard
- Basic settings / business profile page
- Supabase Auth + Database + Storage wiring
- Demo mode fallback with sample data when Supabase env vars are missing

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- React Hook Form
- Zod
- Supabase Auth
- Supabase Database
- Supabase Storage

## credentials

Use these in local demo mode:
ADMIN:
create direct in supabase

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env.local
```

3. If you want full Supabase mode, set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- optional `SUPABASE_SERVICE_ROLE_KEY`

4. Apply the SQL migration in Supabase:

- Run all migration

5. Run the app:

```bash
npm run dev
```

6. Verification:

```bash
npm run lint
npm run build
```

When Supabase env vars are present:

- login uses Supabase Auth
- route/session helpers read the authenticated Supabase user
- server actions write to Supabase tables and upload optional proof files to Storage

## Route structure

```text
app/
  (auth)/
    login/
    forgot-password/
  (app)/
    admin/
      customers/
      riders/
      orders/
      payments/
      ledger/
      reports/
      settings/
    rider/
      deliveries/[orderId]/
        complete/
        success/
  actions/
```

## Deployment to Vercel + Supabase

