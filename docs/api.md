# API documentation

Base URL: `http://localhost:4000/api`

All responses are JSON. Errors are `{ "message": string }` with a matching status (400 validation, 401 unauthenticated, 403 wrong role or branch, 404 missing, 409 conflict with current state). Response and request types live in `packages/shared/src/portal.ts` (exported from `@housing/shared`); the route files annotate every response with them so `tsc` catches drift.

## Authentication

In local development (`NODE_ENV=development`), requests without an `Authorization` header may use these development-only identity headers:

```
x-user-id: <user id>        x-user-email: <email>        x-user-role: CLIENT | OWNER | SYSTEM_ADMIN | ...
```

These headers are ignored in preview and production. If an `Authorization` header is supplied, it must contain a valid Clerk bearer token; an invalid token is rejected and never falls back to development headers.

Staff branch scope is never taken from headers. A system admin may pass `?branch=all|Male|Hulhumale|Villingili` (default `all`). Every other staff role is pinned to the branch stored on their user record.

Every mutation writes an `AuditLog` row (`metadata = { description, branch }`) and, where someone needs to know, a `Notification` row (`channel` = `SMS`, `Email` or `SMS + Email`). Email goes out through Resend only when `RESEND_API_KEY` is a real key.

## Auth `/api/auth`

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/demo-accounts` | – | `DemoAccount[]` (local development and configured preview only) |
| POST | `/demo-login` | `{ email }` | `{ user: SessionUser }` (404 if unknown or disabled outside local development/configured preview) |
| POST | `/register` | `RegisterBody` | 201 `{ user: SessionUser }`; 409 if the email exists. Creates CLIENT or OWNER only. |
| GET | `/me` | – | the authenticated request user |

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
| POST | `/payments` | `{ month: 'YYYY-MM' }` | 201 `ClientLease`; 409 if already paid. Records 10% fee and 90% owner payout. |
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

`/api/applications`, `/api/viewings`, `/api/leases`, `/api/payments`, `/api/maintenance` and `/api/admin` from the first scaffold still exist. The portal does not use them.
