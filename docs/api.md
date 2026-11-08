# API documentation

Base URL: `http://localhost:4000/api`

All responses are JSON. Errors are `{ "message": string }` with a matching status (400 validation, 401 unauthenticated, 403 wrong role or branch, 404 missing, 409 conflict with current state). Response and request types live in `packages/shared/src/portal.ts` (exported from `@housing/shared`); the route files annotate every response with them so `tsc` catches drift.

## Authentication

In local development (`NODE_ENV=development`), requests without an `Authorization` header may use these development-only identity headers:

```
x-user-id: <user id>        x-user-email: <email>        x-user-role: CLIENT | OWNER | SYSTEM_ADMIN | ...
```

These headers are ignored in preview and production. Preview demo sign-in returns a short-lived HMAC-signed bearer token; all other bearer tokens must pass Clerk verification. Invalid tokens never fall back to development headers.

Demo staff sign-in sends a six-digit email code; the code expires after 10 minutes, allows at most five attempts, and can be resent once per minute. Client and owner demo sign-in do not use this staff OTP. Configure `STAFF_OTP_EMAIL` as the shared delivery mailbox for seeded `.test` staff accounts, `STAFF_OTP_SECRET` as a private random secret of at least 32 characters, and a working `RESEND_API_KEY` plus verified `RESEND_FROM` sender. Keep those values in local/Cloudflare environment settings, not source control. For preview, configure the mailbox and sender on the preview Worker, and store `STAFF_OTP_SECRET` and `RESEND_API_KEY` as preview secrets. Preview demo sessions are signed with `STAFF_OTP_SECRET` and expire after eight hours. Apply the `0002_staff_otp_challenges.sql` migration before enabling OTP on a database.

Staff branch scope is never taken from headers. A system admin may pass `?branch=all|Male|Hulhumale|Villingili` (default `all`). Every other staff role is pinned to the branch stored on their user record.

Every mutation writes an `AuditLog` row (`metadata = { description, branch }`) and, where someone needs to know, a `Notification` row (`channel` = `SMS`, `Email` or `SMS + Email`). Email goes out through Resend only when `RESEND_API_KEY` is a real key.

## Auth `/api/auth`

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/demo-accounts` | – | `DemoAccount[]` (local development and configured preview only) |
| POST | `/demo-login` | `{ email, accountType? }` | Client/owner: `{ user, token? }`; staff: `{ otpRequired: true, destination }` and sends an email code |
| POST | `/staff-otp/resend` | `{ email }` | `{ sent: true, destination }`; 429 during the one-minute resend cooldown |
| POST | `/staff-otp/verify` | `{ email, code }` | `{ user, token? }`; 401 for an invalid, expired, or used code |
| POST | `/register` | `RegisterBody` | 201 `{ user: SessionUser, token? }`; 409 if the email exists. Creates CLIENT or OWNER only. |
| GET | `/me` | – | the authenticated request user |

Demo login and OTP routes are enabled only in local development or configured preview; they return 404 in production.

## Public listings `/api/properties`

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/?city&rooms&type&maxRent&q&sort` | `Listing[]`, approved and available only. `city` = Malé/Hulhumalé/Villingili, `rooms` = 1/2/3/`4+`, `type` = Apartment/Flat, `sort` = new/low/high. No owner data. |
| GET | `/:id` | `Listing` (404 unless approved) |

## Client `/api/client` (role CLIENT)

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/me` | – | `ClientMe` |
| PATCH | `/profile` | partial `ClientProfile` (email and mfaEnabled are ignored) | `ClientProfile` |
| POST | `/applications` | `{ propertyId, termMonths }` | 201 `{ id, propertyId, status, createdAt, reference }`; 409 if already applied |
| POST | `/viewings` | `{ propertyId }` | 201 `{ id, propertyId, status, scheduledAt }` (SCHEDULED, now + 2 days); 409 if one is already scheduled |
| GET | `/lease` | – | `ClientLease \| null` (ACTIVE first, else AWAITING_SIGNATURE) |
| POST | `/lease/sign` | – | `ClientLease`. The lease activates when both sides have signed. |
| POST | `/payments` | `{ month: 'YYYY-MM' }` | 201 `ClientLease` in development/preview demo mode; 503 in production until a trusted payment provider is integrated. |
| GET | `/notifications` | – | `NotificationItem[]`, newest first |
| GET | `/maintenance` | – | `MaintenanceItem[]`, newest first |
| POST | `/maintenance` | `{ category, description }` | 201 `MaintenanceItem` (for the leased property; owner notified) |
| GET | `/messages` | – | `MessageThread[]` |
| POST | `/messages` | `{ threadKey, content }` | 201 `MessageThread` (sent to the thread's staff member) |

Rent is due on the 5th. An unpaid month is `OVERDUE` once today is past the 5th of that month, otherwise `PENDING`.

## Owner `/api/owner` (role OWNER)

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/overview` | – | `OwnerOverview` |
| POST | `/properties` | `RegisterPropertyBody` | 201 `OwnerUnit` (PENDING_APPROVAL; branch from district; reference `APT-0nnn`) |
| PATCH | `/properties/:id/status` | `{ status: AVAILABLE \| RENTED \| UNDER_MAINTENANCE }` | `OwnerUnit`; 403 if not yours; 409 while pending approval or when setting AVAILABLE with an active lease |
| POST | `/leases/:id/sign` | – | `OwnerOverview` |
| PATCH | `/profile` | partial `OwnerOverview['profile']` | `OwnerOverview['profile']` |

## Staff `/api/staff` (staff roles; `?branch` scope as above)

| Method | Path | Roles | Body | Returns |
| --- | --- | --- | --- | --- |
| GET | `/overview` | all staff | – | `StaffOverview` |
| GET | `/queue` | PS, BM, SA | – | `QueueItem[]` |
| POST | `/queue/:kind/:id/approve` | PS, BM, SA | `{ checks: string[] }` (every `QUEUE_CHECKS[kind]` entry) | refreshed `QueueItem[]` |
| POST | `/queue/:kind/:id/return` | PS, BM, SA | `{ reason? }` | refreshed `QueueItem[]` |
| GET | `/viewings` | PS, RC, BM, SA | – | `StaffViewing[]` |
| POST | `/viewings` | PS, RC, BM, SA | `{ clientId, propertyId, date, feedbackMetric, notes }` | 201 `StaffViewing` (ATTENDED) |
| GET | `/options` | all staff | – | `StaffOptions` |
| GET | `/matches?propertyId` | all staff | – | `MatchResult` |
| POST | `/matches/notify` | all staff | `{ propertyId, clientId }` | `MatchResult` |
| GET | `/leases` | all staff | – | `StaffLease[]` |
| POST | `/leases` | PS, BM, SA | `CreateLeaseBody` | 201 `StaffLease` (AWAITING_SIGNATURE, `LSE-YYYY-0nnn`); 409 unless the property is AVAILABLE with no open lease |
| GET | `/inquiries` | RC, BM, SA | – | `Inquiry[]` |
| POST | `/inquiries/:id/route` | RC, BM, SA | `{ specialistId }` | `Inquiry` |
| GET | `/reports?month=YYYY-MM` | BM, SA | – | `BranchReport` (default: last full month) |
| GET | `/accounts` | SA | – | `StaffAccount[]` |
| POST | `/accounts` | SA | `{ firstName, lastName, role, branch }` | 201 `StaffAccount` |
| GET | `/audit` | SA | – | `AuditEntry[]`, newest 100 |

`:kind` is `property` or `application`. PS = property specialist, RC = receptionist, BM = branch manager, SA = system admin.

## Legacy endpoints

The legacy `/api/payments` route is demo-only and returns 404 in production. Other endpoints from the first scaffold (`/api/applications`, `/api/viewings`, `/api/leases`, `/api/maintenance` and `/api/admin`) remain separate from the portal flows.
