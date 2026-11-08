# Housing_4_Raajje

Housing_4_Raajje is a multi-branch property management platform designed for Malé, Hulhumalé, and Villingili. The project was created as a final-year university software engineering solution and implements a realistic property workflow covering registration, applications, viewings, leasing, payments, maintenance, and branch-level administration.

## Overview

The platform supports the full lifecycle of rental operations across multiple business roles:

- System Administrator
- Branch Manager
- Property Specialist
- Receptionist
- Property Owner
- Client / Tenant

The system is structured to enforce role-based access control, branch-aware business rules, and a maintainable multi-layer architecture rather than a static mockup.

## Features

- Multi-branch real-estate management
- Property registration and verification flow
- Client rental application workflow
- Viewing scheduling and feedback management
- Lease creation and signature tracking
- Payment and financial reporting
- Maintenance request tracking
- Rule-based property matching for client preferences
- Audit logging and administrative oversight
- Responsive, modern dashboard interface

## Technology Stack

- Frontend: SvelteKit + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: SQLite with Prisma ORM
- Authentication: Clerk-ready integration
- Notifications: Resend-ready transactional email service
- Validation: Zod and server-side checks
- Icons: [Moving Icons](https://www.movingicons.dev/icons) (`@jis3r/icons`, animated Lucide icons for Svelte)
- Fonts: Space Grotesk (headings, figures) and IBM Plex Sans (everything else)
- Hosting: Cloudflare Workers via `@sveltejs/adapter-cloudflare` (`apps/web/wrangler.jsonc`)

Product context lives in `PRODUCT.md`; the design system lives in `apps/web/DESIGN.md`.
- Testing: Vitest

## Project Structure

```text
housing-4-raajje/
├── apps/
│   ├── api/                # Express REST API and route logic
│   └── web/               # SvelteKit frontend
├── packages/
│   ├── database/          # Prisma schema, migrations, and seed data
│   └── shared/             # Shared enums and reusable logic
├── docs/                  # Architecture and project documentation
├── tests/                 # Automated tests
├── .env.example           # Environment variable template
├── .gitignore
├── package.json
├── README.md
├── vitest.config.ts
└── LICENSE                # optional, add if required by your repo policy
```

## Architecture Summary

The application follows a practical layered design:

- Frontend for dashboards and property workflows
- API for business logic and role enforcement
- Shared package for reusable validation and rules
- Prisma database layer for SQLite persistence
- Documentation for architecture and evaluation support

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

```bash
cp .env.example .env
```

Update the values with your actual environment configuration.

### 3. Generate Prisma client and initialize SQLite database

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 4. Start the backend

```bash
npm run api:dev
```

### 5. Start the frontend

```bash
npm run web:dev
```

## Environment Variables

The project expects the following variables in the environment:

```env
PORT=4000
NODE_ENV=development
CLERK_SECRET_KEY=your_secret_key
CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_WEBHOOK_SECRET=your_webhook_secret
DATABASE_URL="file:./dev.db"
RESEND_API_KEY=your_resend_key
RESEND_FROM="Housing_4_Raajje <verified-sender@example.com>"
STAFF_OTP_EMAIL=your_staff_otp_mailbox@example.com
STAFF_OTP_SECRET=generate_a_random_secret_at_least_32_characters
APP_URL=http://localhost:5173
PUBLIC_API_BASE=http://localhost:4000/api
```

> Clerk and Resend are required for production deployment, but local development can use placeholder values if needed for testing configuration.
> Keep real email addresses, Resend keys and `STAFF_OTP_SECRET` in ignored local `.env` or Cloudflare environment settings. Do not commit personal addresses or secrets.

## Testing

Run the automated checks with:

```bash
npm test
```

## Build

```bash
npm run build
```

## Database

SQLite lives at `packages/database/prisma/dev.db` (git-ignored). `DATABASE_URL="file:./dev.db"` is resolved relative to the Prisma schema folder. `npm run db:seed` wipes the database and reloads the demo data. That gives every account a new ID, so anyone already signed in has to sign in again.

The seed holds the three branches, 8 staff, 4 owners, clients, 15 properties (2 awaiting verification), 5 leases with their rent payments, viewings with feedback, maintenance requests, message threads, notifications, inquiries and audit entries. All of it is fictional demo data.

`packages/database/prisma/prisma/dev.db` is an older copy that nothing uses.

## Demo accounts

Clerk is not configured in local development. Seeded client and owner accounts sign in by email without a password. Seeded staff accounts require an email OTP: configure `STAFF_OTP_EMAIL`, `STAFF_OTP_SECRET`, `RESEND_API_KEY` and a verified `RESEND_FROM` in your local environment first. OTP codes are verified server-side and never stored in plain text.

| Role | Email |
| --- | --- |
| Client | `client@housing-4-raajje.test` |
| Owner | `owner@housing-4-raajje.test` |
| System administrator | `shiham.ali@housing-4-raajje.test` |
| Branch manager | `hassan.zameel@housing-4-raajje.test` |
| Property specialist | `ahmed.afzal@housing-4-raajje.test` |
| Receptionist | `mariyam.leena@housing-4-raajje.test` |

For local development and preview, `STAFF_OTP_EMAIL` may point all seeded staff OTPs to one mailbox while each account retains its unique `.test` login email. Do not put a personal mailbox address or OTP secret in committed files. Generate a random secret of at least 32 characters and configure it in the local `.env` or as a Cloudflare secret for the preview Worker. Apply API migration `0002_staff_otp_challenges.sql` before using staff OTP.

## What the web app covers

| Area | Route | Pages |
| --- | --- | --- |
| Public | `/`, `/homes/[id]` | Apartment search with filters and sort; apartment detail |
| Sign-in | `/login` | Client, Owner and Staff tabs; account creation; verification code |
| Client portal | `/client` | Find a home, apartment detail (apply, request a viewing), My lease (sign, pay rent), Messages, Maintenance, Profile |
| Owner portal | `/owner` | Dashboard, My properties (register an apartment), Availability, Earnings, Profile |
| Staff portal | `/staff` | Overview, plus pages by role (below) |

Staff pages by role:

| Role | Pages |
| --- | --- |
| Property specialist | Verification queue, Viewings, Matchmaker, Lease execution |
| Receptionist | Inquiries, Viewings |
| Branch manager | Branch reports, Verification queue, Viewings, Lease execution |
| System administrator | Staff accounts, Audit log, Branch reports, Verification queue |

Staff see only their own branch; administrators can switch branch. The API enforces both. Every change is written to the audit log.

The old routes redirect: `/dashboard` → `/staff`, `/properties` → `/`, `/applications` → `/staff/queue`, `/branches` → `/staff/reports`, `/list-property` → owner sign-in.

## API

The new role-scoped routes are `/api/client/*`, `/api/owner/*` and `/api/staff/*`. Auth routes are `/api/auth/demo-accounts`, `/api/auth/demo-login` and `/api/auth/register`. Public listing search is `/api/properties`. See `docs/api.md` for the full list.

Request and response shapes are defined once in `packages/shared/src/portal.ts` and used by both the API and the web app.

Rate limits: 2,000 requests per 15 minutes overall, and 60 per 15 minutes on `/api/auth`.

## Changes in this session (October 2026)

**Product and design records**
- Added `PRODUCT.md`: users, purpose, branches, status vocabulary, and the rule that no invented claims or figures appear in the UI.
- Added `apps/web/DESIGN.md`: the paper-and-teal ledger design system from the Claude Design files, including the rule that icons come only from Moving Icons.

**Web app (`apps/web`)**
- Rebuilt every page from the Claude Design files: Home, Sign In, Client Portal, Owner Portal (Dashboard, My Properties, Availability, Earnings) and Staff Portal.
- Replaced the old template home page and its placeholder copy and figures.
- Owner portal pages follow their design files. A Profile page was kept, and the My properties form also asks for rooms, because search and matching need it.
- Kept the owner dashboard and the staff Overview minimal, and removed extras that weren't in the designs.
- Added animated Moving Icons to every sidebar link, the back arrows, the compliance checklist ticks and the phone menu toggle.
- Wired every page to the API. Pages show loading, empty and error states.
- Made every page work at phone width.
- Raised text and link contrast to meet accessibility minimums.

**API (`apps/api`)**
- Added client, owner and staff routes, with role checks and server-side branch scoping.
- Replaced the fake demo login with one that signs in real seeded users, and added registration for clients and owners.
- Public property search now returns only approved, available listings, with no owner details.
- Added a shared error handler and an audit helper; mutations write to the audit log.
- Notifications are stored in the database, and email is sent through Resend only when a real key is configured.
- Lease rules: a lease becomes active only after both the client and the owner have signed; the property then becomes Rented. Rent is due on the 5th and becomes overdue after that.
- Loosened the global rate limit, which was blocking normal use, and added a tighter one on sign-in.

**Database (`packages/database`)**
- Added optional schema fields:
  - display codes for users (CL-, OWN-, STF-)
  - property address, district, type and reference
  - client sex, date of birth and rooms
  - application term and reference
  - viewing feedback
  - lease reference, term and execution date
  - maintenance category and reference
  - message thread key
  - notification channel
- Added an `Inquiry` model.
- Rewrote the seed with the people, homes and leases from the designs.

## Documentation

The project includes supporting documentation for:

- system architecture
- RBAC and authorization design
- API reference
- database schema
- requirement traceability
- setup and deployment flow

See the [docs](docs) directory for the documentation set.

## Notes

This project is designed to be understandable, maintainable, and defendable in a university evaluation setting. It emphasizes separation between frontend, backend, data model, business rules, authorization, and documentation rather than a single monolithic implementation.

## License

This repository is intended for educational use within the final-year project context. Add an appropriate license if required by your institution or GitHub repository policy.
