# Database design

The relational model includes normalized entities for users, roles, branches, properties, applications, viewings, leases, payments, maintenance requests and audit logs.

## Major entities

- `User`
- `Role`
- `Branch`
- `Property`
- `Application`
- `Viewing`
- `Lease`
- `Payment`
- `MaintenanceRequest`
- `Notification`
- `AuditLog`

SQLite is used as the application database and Prisma handles migrations and typed queries.
