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

## Demo credentials

Use these in local demo mode:

- Admin: `owner@aquaroute.test` / `water123`
- Rider: `rafiq@aquaroute.test` / `water123`
- Rider: `kamran@aquaroute.test` / `water123`

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

- `supabase/migrations/001_init_water_supply.sql`

5. Run the app:

```bash
npm run dev
```

6. Verification:

```bash
npm run lint
npm run build
```

## Demo mode vs Supabase mode

When Supabase env vars are missing:

- the app still runs
- authentication uses demo credentials backed by secure httpOnly cookies
- dashboards and modules render from typed sample data
- mutation flows still execute and redirect, but state is not persisted

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

## Component architecture

- `components/layout/role-shell.tsx`
  - shared mobile/desktop shell, sidebar, bottom nav, logout
- `components/layout/page-header.tsx`
  - consistent page title and action bar
- `components/forms/*`
  - login, customer, rider, order wizard, manual payment, delivery completion
- `components/ui/*`
  - local shadcn-style primitives used across the app
- `components/metric-card.tsx`
  - dashboard KPI card
- `components/status-badge.tsx`
  - shared business status badge mapping

## Folder architecture

- `app/`
  - App Router pages, layouts, and server actions
- `components/`
  - reusable UI and workflow components
- `lib/auth/`
  - session and role access helpers
- `lib/supabase/`
  - browser/server/middleware Supabase clients
- `services/`
  - sample operational dataset and derived summaries
- `types/`
  - domain types
- `validations/`
  - Zod schemas
- `supabase/migrations/`
  - migration-ready SQL

## Core business rules implemented

- Every order belongs to a customer
- Orders can be assigned to riders
- Rider delivery completion always includes a payment outcome
- Online claims remain pending verification until admin review
- Critical records use status changes instead of unsafe deletion
- Ledger is designed to update from both orders and payments

## State and data flow

1. Auth
   - login form validates with Zod
   - server action authenticates via Supabase or demo credentials
   - role is resolved and the user is redirected to `/admin` or `/rider`
2. Reads
   - server components load data for each route
   - sample data powers demo mode
   - Supabase session helpers are used for protected routes and actions
3. Mutations
   - forms validate client-side with RHF + Zod
   - server actions re-validate on the server
   - actions write to Supabase if configured, otherwise complete in demo mode
4. Protection
   - `proxy.ts` handles session refresh and mock-mode route protection
   - `requireUser()` guards pages and server actions by role

## End-to-end user flows

### Admin flow

1. Login as owner
2. Review dashboard KPIs and quick actions
3. Add customer or create order from existing customer
4. Assign rider and expected payment method
5. Monitor deliveries and pending payment verification
6. Record late/manual payments
7. Review customer ledger and reports

### Rider flow

1. Login as rider
2. Open today’s assigned delivery cards
3. Call customer or open map if needed
4. Open delivery detail
5. Mark delivered with payment outcome
6. Upload optional proof for online/partial cases
7. See success screen and continue to next stop

## Form validation strategy

- Zod schemas in `validations/`
- React Hook Form for field management and touch-friendly forms
- Server actions re-validate all payloads
- Multi-step order flow validates step-by-step and again before save
- Delivery completion dynamically requires amount for cash/partial scenarios

## Sample dashboard data

The sample dataset includes:

- 5 customers
- 3 riders
- mixed assigned, delivered, pending-payment, and cancelled orders
- verified, pending-verification, and received payment records
- ledger entries for running balances

## Database design

Tables in the migration:

- `profiles`
- `riders`
- `customers`
- `orders`
- `payments`
- `ledger_entries`
- `delivery_proofs`
- `audit_logs`

The migration also includes:

- enum types for roles, order/payment statuses, and payment methods
- indexes on operational foreign keys
- `updated_at` triggers
- baseline RLS policies for admin and rider access

## Deployment to Vercel + Supabase

1. Create a Supabase project
2. Run `001_init_water_supply.sql`
3. Create the `delivery-proofs` storage bucket
4. Add Vercel env vars from `.env.example`
5. Deploy the repo to Vercel
6. Set the Supabase Auth redirect URL to your deployed domain
7. Create owner and rider users in Supabase Auth
8. Insert matching rows in `profiles` and `riders`
9. Verify:
   - admin can access `/admin`
   - rider can access `/rider`
   - rider online claims land as pending verification

## Notes

- The repository intentionally supports a no-backend demo mode to speed up UI review and stakeholder feedback.
- Once Supabase is configured, the same screens and server actions become the operational foundation for production rollout.
