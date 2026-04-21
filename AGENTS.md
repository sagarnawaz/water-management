<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This project may use a newer or changed version of Next.js with breaking changes in APIs, conventions, and file structure.

Before writing or modifying any code:

1. Read the relevant guides in `node_modules/next/dist/docs/`
2. Prefer the installed project conventions over general memory
3. Heed all deprecation warnings and migration notes
4. Do not assume old `pages/` router patterns unless the project explicitly uses them
5. Prefer App Router patterns if the project is structured that way
6. Follow the existing TypeScript, lint, and folder conventions in this repo
7. Reuse existing components and utilities before creating new ones
8. Keep code production-ready, minimal, and maintainable
9. Do not introduce outdated Next.js APIs
10. If unsure, inspect the current project structure and dependencies first
<!-- END:nextjs-agent-rules -->

# Project Rules

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- Shadcn
- Supabase
- Mobile-first responsive UI

## Code Style

- Use TypeScript strictly
- Keep components small and reusable
- Avoid unnecessary complexity
- Prefer server components where appropriate
- Use client components only when needed
- Use async/await and proper error handling
- Validate forms properly
- Keep UI simple and mobile-like

## UI Rules

- Build simple operational UI, not fancy marketing pages
- Use card-based layouts
- Use large touch-friendly buttons
- Keep forms one-column where possible
- Prioritize clarity and speed

## Product Context

This app is a water supply management system with two roles:

- Admin
- Rider

Main modules:

- Auth
- Customers
- Riders
- Orders
- Payments
- Ledger
- Reports

Payment is tracking-based, not gateway-based.
Supported methods:

- Cash
- Bank Transfer
- JazzCash
- EasyPaisa
- Credit

Online payments should require admin verification before being treated as confirmed.

## Workflow Rules

- Every order must be linked to a customer
- Rider must select payment outcome before completing delivery
- Ledger must update from orders and payments
- Avoid destructive deletes for critical business data
- Prefer status-based updates and audit-friendly flows
