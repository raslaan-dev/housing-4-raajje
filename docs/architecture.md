# Architecture

## Overview

Housing_4_Raajje is designed as a multi-branch property management platform for Malé, Hulhumalé and Villingili. The system separates business workflows into role-based modules and keeps enforcement in the API layer.

## Layers

- Frontend: SvelteKit user interface and dashboards.
- API: Express service with validation, role checks and branch checks.
- Shared package: typed constants and reusable business logic.
- Database: Prisma + SQLite for relational persistence.
- Auth: Clerk for identity and MFA.
- Notifications: Resend for transactional email.

## Workflow

1. Users authenticate via Clerk.
2. The API resolves the user role and branch.
3. Business rules validate property, application, viewing and lease flows.
4. SQLite stores normalized relational records.
5. Notifications fire from a dedicated service layer, not ad hoc route logic.

## Role boundaries

- Admin: administrative, master data and audit functions.
- Branch manager: branch-scoped operational management.
- Property specialist: verification, listings and lease processing.
- Receptionist: inquiries, scheduling and front-desk tasks.
- Owner: own-property and payout management.
- Client: search, apply, view, lease and maintenance.
