# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Housing_4_Raajje serves two audiences equally, separated by role:

- **Public and client side:** renters looking for homes in Malé, Hulhumalé and Villingili. They search listings, book viewings, apply, sign leases, pay rent and report maintenance problems. Property owners also use this side to manage their own listings, earnings and maintenance.
- **Staff side:** branch employees who run daily operations. The roles are system admin, branch manager, property specialist and receptionist. Each staff member works within their own branch, except the system admin.

Examiners and supervisors also judge the project against the assignment spec. The product should behave and read like a real platform, not like a demo.

## Product Purpose

A multi-branch property management platform that covers the whole rental lifecycle: registration, verification, listing, matching, viewings, applications, leases with signatures from both sides, payments, owner payouts, maintenance, messages and notifications. It is a university final-year project. It succeeds when every role can complete its workflows end to end, with permissions checked on the server and records traceable through an audit log.

## Positioning

Housing_4_Raajje is a fictional agency with three branches, one for each island community: Malé, Hulhumalé and Villingili. Every property, staff member and permission is tied to a branch. Matching between clients and properties explains itself, telling the client why a property matched (location, rent under their maximum, enough rooms). Rents are in MVR.

## Operating Context

- Staff use the role dashboards to verify registrations, process applications, schedule viewings, draft and activate leases, record payments and assign maintenance.
- Clients and owners use the public listings and their own portals.
- Identity comes from Clerk, and admin roles require MFA. Transactional email goes through Resend. Local development falls back to working without either key when they are not configured.

## Capabilities and Constraints

- Stack already chosen: SvelteKit + TypeScript (`apps/web`), Express + TypeScript API (`apps/api`), Prisma + SQLite (`packages/database`), shared enums and rules (`packages/shared`).
- Roles: `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `PROPERTY_SPECIALIST`, `RECEPTIONIST`, `OWNER`, `CLIENT` (see `docs/rbac-matrix.md`).
- Status vocabularies used everywhere in the UI:
  - Property: Available, Rented, Under maintenance, Pending approval
  - Application: Pending, Approved, Rejected, Withdrawn
  - Viewing: Scheduled, Attended, No-show, Cancelled, Rejected
  - Lease: Draft, Awaiting signature, Active, Expired, Terminated
  - Maintenance: Open, Assigned, In progress, Resolved, Closed
- A lease becomes active only after both the owner and the client have signed.
- Branch names: Malé, Hulhumalé, Villingili. The code stores them without accents (`Male`, `Hulhumale`).
- Language: English only. Currency: MVR.
- Clerk and Resend are required by the assignment and cannot be swapped out.

## Evidence on Hand

- Seed data in `packages/database/prisma/seed.ts` is the only data source. Sample properties and metrics must come from it, or be clearly marked as samples.
- Docs: `docs/architecture.md`, `docs/rbac-matrix.md`, `docs/api.md`, `docs/database-design.md`, `docs/setup-guide.md`.
- **None of the current home page copy is real.** This includes the "ColorBends" code sample, "Free forever", "210+ workflow views", "New category: micro-interactions" and the hard-coded metrics. It is all template leftovers. There are no real customers, testimonials, statistics, pricing or press, and none should be made up.
- No logo or brand assets exist beyond the name and the "H4R" monogram text.

## Product Principles

1. **The branch is the unit of truth.** Every view shows which branch a record belongs to, and staff only see what their branch allows.
2. **The workflow shows its state.** Status is the main thing users act on, so every status uses the shared vocabulary consistently.
3. **Real data, honest claims.** Show seeded or live records. Never use invented marketing numbers.
4. **Two experiences, one system.** Public and client pages should welcome renters. Staff pages should be built for fast, repeated work. Both use the same terminology.
5. **Built to be examined.** Each assignment requirement (roles, validation, MFA, notifications, audit) should be visible and easy to demonstrate.
