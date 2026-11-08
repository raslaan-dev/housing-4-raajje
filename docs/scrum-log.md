# Scrum Log — Housing_4_Raajje

Final-year software engineering project. This log records the Scrum process used to
build the Housing_4_Raajje multi-branch property management platform: sprint goals,
daily stand-ups, review outcomes and retrospectives.

- **Methodology:** Scrum, two-week sprints
- **Project window:** 2026-09-01 → 2026-11-14
- **Ceremonies:** Daily stand-up (async), Sprint Planning, Sprint Review, Retrospective
- **Board:** Backlog → To Do → In Progress → In Review → Done
- **Repository:** `housing-4-raajje` (monorepo: `apps/web`, `apps/api`, `packages/database`, `packages/shared`)

> Dates and stand-up entries below are backdated to reconstruct the project timeline
> for the project report. Sprint 6 is in progress at the time of writing (2026-11-08).

## Team & roles

| Member        | Scrum role        | Primary area                                  |
| ------------- | ----------------- | --------------------------------------------- |
| Raslaan       | Developer         | API, database, auth/RBAC, deployment          |
| Member 2      | Developer         | Web (SvelteKit), staff dashboards, UI         |
| Member 3      | Developer         | Public/client portal, matching, notifications |
| Rotating      | Scrum Master      | Facilitation rotates each sprint              |
| Supervisor    | Product Owner     | Backlog priorities, acceptance of increments  |

## Definition of Done

- Feature works end-to-end for every affected role
- Permissions enforced **server-side** (not just hidden in the UI)
- Status changes use the shared status vocabulary
- Relevant action written to the audit log
- Unit/integration tests added where logic is non-trivial; `npm test` green
- Docs updated (`docs/` and seed data where applicable)

---

## Sprint 0 — Inception & setup (2026-09-01 → 2026-09-05)

**Goal:** Agree scope against the assignment spec, choose the stack, stand up the repo.

### Outcomes
- Stack fixed: SvelteKit + TypeScript (web), Express + TypeScript (API), Prisma + SQLite (database), shared enums/rules package.
- Six roles agreed: `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `PROPERTY_SPECIALIST`, `RECEPTIONIST`, `OWNER`, `CLIENT`.
- Three branches agreed: Malé, Hulhumalé, Villingili (stored without accents).
- Status vocabularies drafted for Property, Application, Viewing, Lease, Maintenance.
- Product principles written down (`PRODUCT.md`): *the branch is the unit of truth*.

### Stand-ups
- **Tue 09-01** — Kick-off. Read the assignment spec together, split it into epics.
- **Wed 09-02** — Decided monorepo with npm workspaces. Raslaan to scaffold.
- **Thu 09-03** — Drafted the RBAC matrix (`docs/rbac-matrix.md`). Blocker: unclear whether receptionists can approve applications → raised with supervisor.
- **Fri 09-04** — Supervisor clarified: receptionists schedule/record but cannot approve. Backlog groomed.

### Retrospective
- 👍 Clear spec reading early saved rework.
- 👎 Spent too long debating folder layout.
- 🎯 Action: timebox design debates to 30 min.

---

## Sprint 1 — Foundation: monorepo, schema, auth & RBAC (2026-09-08 → 2026-09-19)

**Goal:** A running skeleton: database schema, authentication, and server-side role checks.

### Sprint backlog
- [x] Monorepo + workspaces (`apps/*`, `packages/*`)
- [x] Prisma schema: User, Branch, Property, Lease, Application, Viewing, Maintenance, Payment, AuditLog
- [x] Seed data (`packages/database/prisma/seed.ts`) — branches, staff, sample properties
- [x] Clerk-ready auth scaffolding with local fallback (no key required in dev)
- [x] Server-side RBAC middleware + branch scoping
- [x] `docs/architecture.md`, `docs/database-design.md`

### Stand-ups (selected)
- **Mon 09-08** — Raslaan: scaffolded workspaces; today Prisma schema v1. Member 2: SvelteKit app shell. Member 3: public layout + routes.
- **Wed 09-10** — Schema migrating cleanly. Blocker: circular relation between Lease and Payment → resolved by nullable FK + explicit relation name.
- **Fri 09-12** — Seed script loads 3 branches, 6 staff, 12 properties. Auth fallback working offline.
- **Tue 09-16** — RBAC middleware enforces role + branch on every protected route. Member 3: login/redirect-by-role done.
- **Thu 09-18** — Audit log table + helper writing on create/update. Tests for role guards passing.

### Review
- Demonstrated: sign in as each role → land on the correct dashboard; a `PROPERTY_SPECIALIST` from Malé cannot read Hulhumalé records (403 from the API, not just a hidden link).
- Supervisor accepted the increment.

### Retrospective
- 👍 Local auth fallback unblocked everyone without Clerk keys.
- 👎 Seed data drifted from schema twice.
- 🎯 Action: one person owns the seed file per sprint.

---

## Sprint 2 — Properties, registration & verification (2026-09-22 → 2026-10-03)

**Goal:** Owners register properties; staff verify and publish them; clients browse listings.

### Sprint backlog
- [x] Owner property registration form (Zod validation, server-side)
- [x] Verification queue for staff → Pending approval → Available
- [x] Public listings + listing detail (Malé / Hulhumalé / Villingili filters)
- [x] Property status transitions: Available, Rented, Under maintenance, Pending approval
- [x] Image/field handling and branch assignment
- [ ] Saved searches (moved to backlog)

### Stand-ups (selected)
- **Mon 09-22** — Member 2: registration form fields match schema. Member 3: listings grid + filters. Raslaan: verification endpoints + status guards.
- **Wed 09-24** — Blocker: owners could set their own branch → fixed, branch derived from the property address region, staff can override.
- **Fri 09-26** — Verification flow works: specialist approves → property becomes Available and appears publicly.
- **Wed 10-01** — Listing detail page + rent in MVR. Empty states written (no listings yet / no results).
- **Fri 10-03** — Polished status badges to shared vocabulary across public + staff views.

### Review
- Demonstrated full path: owner registers → appears in verification queue → specialist approves → listing public.
- Saved searches deferred; supervisor agreed it is lower priority than leasing.

### Retrospective
- 👍 Shared status component kept UI consistent.
- 👎 Form validation duplicated between client and server at first.
- 🎯 Action: centralise validation schemas in `packages/shared`.

---

## Sprint 3 — Applications, viewings & matching (2026-10-06 → 2026-10-17)

**Goal:** Clients apply and book viewings; the system explains *why* a property matched.

### Sprint backlog
- [x] Client rental application workflow (Pending → Approved/Rejected/Withdrawn)
- [x] Viewing scheduling + outcomes (Scheduled, Attended, No-show, Cancelled, Rejected)
- [x] Rule-based matching engine (location, rent ≤ max, enough rooms) with reasons
- [x] `tests/matching.test.ts` — matching rules
- [x] Staff queues per branch for applications and viewings
- [x] Cloudflare deployment pipeline (web + API workers, D1 migrations)

### Stand-ups (selected)
- **Mon 10-06** — Member 3: client preferences model + matching rules. Member 2: application form + staff review screen. Raslaan: viewing endpoints.
- **Wed 10-08** — Matching returns human-readable reasons ("rent under your maximum", "2 rooms, you need 2"). Writing tests.
- **Fri 10-10** — Deployment: each Worker deployed under its own name, web worker connected to API worker, D1 migrations applied. (See commits that day.)
- **Tue 10-14** — Viewings: no-show and cancel paths done; receptionist can record outcomes, cannot approve applications (RBAC verified).
- **Thu 10-16** — `matching.test.ts` green. Edge case fixed: property with equal rent to the client max should still match (≤, not <).

### Review
- Demonstrated: client sets preferences → sees matched listings with reasons → applies → specialist approves → viewing scheduled → outcome recorded.
- First live deployment shown on Cloudflare.

### Retrospective
- 👍 Explaining matches landed well with the supervisor.
- 👎 Deployment ate a day mid-sprint.
- 🎯 Action: keep infra work at sprint boundaries, not mid-sprint.

---

## Sprint 4 — Leases, signatures & payments (2026-10-20 → 2026-10-31)

**Goal:** Draft and activate leases with dual signatures; record rent payments and owner payouts.

### Sprint backlog
- [x] Lease lifecycle: Draft → Awaiting signature → Active → Expired/Terminated
- [x] **Dual signature rule:** lease becomes Active only after owner *and* client sign
- [x] `tests/lease-rules.test.ts` — activation and signature rules
- [x] Payment recording + financial reporting per branch
- [x] Owner payouts view
- [x] Audit entries for every lease and payment action

### Stand-ups (selected)
- **Mon 10-20** — Raslaan: lease state machine. Member 2: lease draft/review UI. Member 3: signature capture for both parties.
- **Wed 10-22** — Blocker: lease activated after only one signature → fixed, activation guarded until both signatures present; test added.
- **Fri 10-24** — Payments recorded against active leases; branch financial summary totals correct.
- **Wed 10-29** — Owner payout view reads from payments; expired leases auto-flagged by end date.
- **Fri 10-31** — `lease-rules.test.ts` green. Terminated path (early termination) implemented with audit entry.

### Review
- Demonstrated: specialist drafts lease → owner signs → client signs → lease Active → rent payment recorded → appears in branch report and owner payout.
- Showed that signing by only one party leaves the lease in *Awaiting signature*.

### Retrospective
- 👍 State machine made lease rules easy to reason about and test.
- 👎 Financial rounding inconsistencies early on.
- 🎯 Action: single currency formatter for MVR across the app.

---

## Sprint 5 — Maintenance, messaging, notifications & audit (2026-11-03 → 2026-11-14) — *in progress*

**Goal:** Close the lifecycle: maintenance requests, in-app messaging, email notifications, and a reviewable audit log. Harden for examination.

### Sprint backlog
- [x] Maintenance requests: Open → Assigned → In progress → Resolved → Closed
- [x] Assignment of maintenance to staff within a branch
- [x] In-app messaging between clients, owners and staff
- [~] Resend-ready email notifications (local fallback when no key) — *in progress*
- [~] Audit log viewer for admins/managers — *in progress*
- [ ] Final accessibility & responsive pass
- [ ] Demo script + seed data freeze for examination

### Stand-ups (so far)
- **Mon 11-03** — Member 3: maintenance request form + status flow. Raslaan: assignment endpoints with branch scoping. Member 2: maintenance board UI.
- **Wed 11-05** — Messaging threads working; notifications firing via local fallback. Blocker: Resend key not yet provisioned → using fallback, will wire key before demo.
- **Fri 11-07** — Audit log viewer lists actor, action, record, branch and time. Filtering by branch added.
- **Sat 11-08** — *(today)* Writing this scrum log for the report. Next: finish notifications, audit viewer, then accessibility/responsive pass and freeze the demo seed.

### Planned for the rest of the sprint
- Provision Resend key; verify transactional emails on real addresses.
- Finish audit log viewer (export + date range).
- Accessibility (keyboard, contrast, labels) and responsive checks on all dashboards.
- Freeze seed data and write the examiner demo walkthrough.

### Review — *scheduled 2026-11-14*
### Retrospective — *scheduled 2026-11-14*

---

## Product backlog (remaining / stretch)

| Priority | Item                                           | Notes                                    |
| -------- | ---------------------------------------------- | ---------------------------------------- |
| High     | Resend email verification on real addresses    | Currently local fallback                 |
| High     | Audit log export (CSV) + date-range filter     | In progress                              |
| Medium   | Saved searches / search alerts for clients     | Deferred from Sprint 2                   |
| Medium   | Admin MFA enforcement end-to-end demo          | Clerk MFA required for admin role        |
| Low      | Owner payout statements (PDF)                   | Nice-to-have for examination             |
| Low      | Dark mode polish across staff dashboards        | Partial                                  |

## Velocity snapshot

| Sprint | Committed | Completed | Notes                               |
| ------ | --------- | --------- | ----------------------------------- |
| 1      | 6         | 6         | Foundation stable                   |
| 2      | 6         | 5         | Saved searches deferred             |
| 3      | 6         | 6         | Deployment landed                   |
| 4      | 6         | 6         | Lease rules fully tested            |
| 5      | 7         | 3 so far  | In progress (as of 2026-11-08)      |
