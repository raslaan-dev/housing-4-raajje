# RBAC matrix

| Role | Permissions |
| --- | --- |
| SYSTEM_ADMIN | master data, staff, audit, backups, configuration |
| BRANCH_MANAGER | branch-scoped staff, properties and reports |
| PROPERTY_SPECIALIST | registrations, applications, leases, verification |
| RECEPTIONIST | inquiries, appointments, profile updates |
| OWNER | own property management, earnings and maintenance |
| CLIENT | search, applications, payments, maintenance |

The application enforces this via server-side API authorization middleware.
