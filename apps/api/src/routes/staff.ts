import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import {
  BRANCHES,
  FEEDBACK_METRICS,
  QUEUE_CHECKS,
  calculateLeaseExpiry,
  type AuditEntry,
  type BranchReport,
  type Inquiry,
  type MatchResult,
  type QueueItem,
  type StaffAccount,
  type StaffLease,
  type StaffOptions,
  type StaffOverview,
  type StaffRole,
  type StaffViewing
} from '@housing/shared';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { asyncHandler, HttpError, param } from '../lib/http.js';
import { assertInScope, resolveScope, type ResolvedScope } from '../lib/scope.js';
import {
  STAFF_ROLES,
  asStaffRole,
  branchCity,
  branchDisplay,
  branchLabel,
  fullName,
  isBranchName,
  toBranchRef
} from '../lib/serialize.js';
import { audit, parseAuditMetadata } from '../lib/audit.js';
import { notify } from '../lib/notify.js';
import { nextLeaseReference, nextUserCode } from '../lib/codes.js';
import { addMonths, currentMonth, formatLongDate, formatMvr, isMonthKey, monthRange, parseYmd, todayRange } from '../lib/dates.js';

const router = Router();

const ALL_STAFF: StaffRole[] = STAFF_ROLES;
const QUEUE_ROLES: StaffRole[] = ['PROPERTY_SPECIALIST', 'BRANCH_MANAGER', 'SYSTEM_ADMIN'];
const VIEWING_ROLES: StaffRole[] = ['PROPERTY_SPECIALIST', 'RECEPTIONIST', 'BRANCH_MANAGER', 'SYSTEM_ADMIN'];
const LEASE_ROLES: StaffRole[] = ['PROPERTY_SPECIALIST', 'BRANCH_MANAGER', 'SYSTEM_ADMIN'];
const INQUIRY_ROLES: StaffRole[] = ['RECEPTIONIST', 'BRANCH_MANAGER', 'SYSTEM_ADMIN'];
const REPORT_ROLES: StaffRole[] = ['BRANCH_MANAGER', 'SYSTEM_ADMIN'];

const ROLE_LABEL: Record<StaffRole, string> = {
  SYSTEM_ADMIN: 'System Admin',
  BRANCH_MANAGER: 'Branch Manager',
  PROPERTY_SPECIALIST: 'Property Specialist',
  RECEPTIONIST: 'Receptionist'
};

router.use(requireAuth, authorize(...ALL_STAFF));

/** Prisma filter for relations that hang off a property (applications, viewings, leases, maintenance). */
const viaProperty = (scope: ResolvedScope) => (scope.branchId ? { property: { branchId: scope.branchId } } : {});

async function scopedBranches(scope: ResolvedScope) {
  const branches = await prisma.branch.findMany({ where: scope.branchId ? { id: scope.branchId } : {} });
  return branches.sort((a, b) => BRANCHES.indexOf(a.name as never) - BRANCHES.indexOf(b.name as never));
}

async function branchOccupancy(scope: ResolvedScope) {
  const branches = await scopedBranches(scope);
  const approved = await prisma.property.findMany({ where: { ...scope.where, approvalStatus: 'APPROVED', isActive: true } });
  return branches.map((branch) => {
    const props = approved.filter((p) => p.branchId === branch.id);
    const rented = props.filter((p) => p.status === 'RENTED').length;
    return {
      branch: toBranchRef(branch),
      properties: props.length,
      occupancy: props.length ? Math.round((rented / props.length) * 100) : 0,
      avgRent: props.length ? Math.round(props.reduce((s, p) => s + p.monthlyRent, 0) / props.length) : 0,
      rented
    };
  });
}

/* ---------- Overview ---------- */

router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const scope = await resolveScope(req);
    const [pendingRegistrations, pendingApplications, viewingsToday, openMaintenance, branches] = await Promise.all([
      prisma.property.count({ where: { ...scope.where, approvalStatus: 'PENDING' } }),
      prisma.application.count({ where: { status: 'PENDING', ...viaProperty(scope) } }),
      prisma.viewing.count({ where: { scheduledAt: todayRange(), status: { notIn: ['CANCELLED', 'REJECTED'] }, ...viaProperty(scope) } }),
      prisma.maintenanceRequest.count({ where: { status: { notIn: ['RESOLVED', 'CLOSED'] }, ...viaProperty(scope) } }),
      branchOccupancy(scope)
    ]);
    const out: StaffOverview = {
      scope: scope.scope,
      queues: { pendingRegistrations, pendingApplications, viewingsToday, openMaintenance },
      branches: branches.map(({ branch, properties, occupancy, avgRent }) => ({ branch, properties, occupancy, avgRent }))
    };
    res.json(out);
  })
);

/* ---------- Verification queue ---------- */

async function buildQueue(scope: ResolvedScope): Promise<QueueItem[]> {
  const [properties, applications] = await Promise.all([
    prisma.property.findMany({
      where: { ...scope.where, approvalStatus: 'PENDING' },
      include: { branch: true, owner: { include: { ownerProfile: true } } }
    }),
    prisma.application.findMany({
      where: { status: 'PENDING', ...viaProperty(scope) },
      include: { user: { include: { clientProfile: true } }, property: { include: { branch: true } } }
    })
  ]);

  const items: QueueItem[] = [
    ...properties.map(
      (p): QueueItem => ({
        id: p.id,
        kind: 'PROPERTY',
        reference: p.reference ?? p.id,
        title: p.title,
        subtitle: `Property registration · ${fullName(p.owner)} (${p.owner.code ?? 'owner'})`,
        branch: toBranchRef(p.branch),
        createdAt: p.createdAt.toISOString(),
        fields: [
          { label: 'Address', value: [p.address, p.district ?? p.location].filter(Boolean).join(' · ') },
          { label: 'Type', value: `${p.propertyType} · ${p.roomCount} ${p.roomCount === 1 ? 'room' : 'rooms'}` },
          { label: 'Target rent', value: formatMvr(p.monthlyRent) },
          { label: 'Owner phone', value: p.owner.phone ? `${p.owner.phone} (${p.owner.ownerProfile?.nationalId ? 'verified' : 'unverified'})` : '—' },
          { label: 'Matched branch', value: branchDisplay(p.branch) }
        ],
        checks: [...QUEUE_CHECKS.PROPERTY]
      })
    ),
    ...applications.map((a): QueueItem => {
      const profile = a.user.clientProfile;
      const sexDob = [profile?.sex, profile?.dateOfBirth ? formatLongDate(profile.dateOfBirth) : null].filter(Boolean).join(' · ') || '—';
      const preferred =
        [profile?.preferredLocation ? branchCity(profile.preferredLocation) : null, profile?.roomCount ? `${profile.roomCount} rooms` : null]
          .filter(Boolean)
          .join(' · ') || '—';
      return {
        id: a.id,
        kind: 'APPLICATION',
        reference: a.reference ?? a.id,
        title: fullName(a.user),
        subtitle: `${a.user.code ?? 'Client'} · applying for ${a.property.title}`,
        branch: toBranchRef(a.property.branch),
        createdAt: a.createdAt.toISOString(),
        fields: [
          { label: 'Sex / DOB', value: sexDob },
          { label: 'Max rent', value: profile?.maxRent ? formatMvr(profile.maxRent) : '—' },
          { label: 'Preferred', value: preferred },
          { label: 'Term', value: a.termMonths ? `${a.termMonths} months` : '—' },
          { label: 'Phone', value: a.user.phone ?? '—' }
        ],
        checks: [...QUEUE_CHECKS.APPLICATION]
      };
    })
  ];

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

router.get(
  '/queue',
  authorize(...QUEUE_ROLES),
  asyncHandler(async (req, res) => {
    const out: QueueItem[] = await buildQueue(await resolveScope(req));
    res.json(out);
  })
);

function parseKind(raw: string): 'PROPERTY' | 'APPLICATION' {
  const kind = raw.toUpperCase();
  if (kind !== 'PROPERTY' && kind !== 'APPLICATION') throw new HttpError(400, 'kind must be property or application.');
  return kind;
}

/** Approve a registration or application. Responds with the refreshed queue (QueueItem[]). */
router.post(
  '/queue/:kind/:id/approve',
  authorize(...QUEUE_ROLES),
  asyncHandler(async (req, res) => {
    const scope = await resolveScope(req);
    const kind = parseKind(param(req, 'kind'));
    const { checks } = z.object({ checks: z.array(z.string()) }).parse(req.body ?? {});
    const missing = QUEUE_CHECKS[kind].filter((c) => !checks.includes(c));
    if (missing.length) throw new HttpError(400, `Complete every check before approving. Missing: ${missing.join('; ')}.`);
    const actorId = req.user!.id;

    if (kind === 'PROPERTY') {
      const p = await prisma.property.findUnique({ where: { id: param(req, 'id') }, include: { branch: true } });
      if (!p) throw new HttpError(404, 'Registration not found.');
      assertInScope(scope, p.branchId);
      if (p.approvalStatus !== 'PENDING') throw new HttpError(409, 'This registration has already been decided.');
      await prisma.$transaction([
        prisma.property.update({ where: { id: p.id }, data: { approvalStatus: 'APPROVED', status: 'AVAILABLE' } }),
        prisma.propertyStatusHistory.create({ data: { propertyId: p.id, status: 'AVAILABLE', reason: 'Registration approved', changedBy: actorId } })
      ]);
      const ref = p.reference ?? p.id;
      await audit(actorId, 'property.approved', 'Property', p.id, `Approved property registration ${ref} (${p.title})`, branchLabel(p.branch));
      await notify(p.ownerId, 'REGISTRATION', `Registration ${ref} approved`, `${p.title} is verified and now listed as available.`, 'SMS + Email');
    } else {
      const a = await prisma.application.findUnique({ where: { id: param(req, 'id') }, include: { user: true, property: { include: { branch: true } } } });
      if (!a) throw new HttpError(404, 'Application not found.');
      assertInScope(scope, a.property.branchId);
      if (a.status !== 'PENDING') throw new HttpError(409, 'This application has already been decided.');
      await prisma.application.update({ where: { id: a.id }, data: { status: 'APPROVED' } });
      await audit(actorId, 'application.approved', 'Application', a.id, `Approved client application ${a.user.code ?? a.userId}`, branchLabel(a.property.branch));
      await notify(a.userId, 'APPLICATION', 'Application approved', `Your application for ${a.property.title} was approved. Staff will prepare the lease.`, 'SMS + Email');
    }

    const out: QueueItem[] = await buildQueue(scope);
    res.json(out);
  })
);

/** Return (reject) a registration or application. Responds with the refreshed queue (QueueItem[]). */
router.post(
  '/queue/:kind/:id/return',
  authorize(...QUEUE_ROLES),
  asyncHandler(async (req, res) => {
    const scope = await resolveScope(req);
    const kind = parseKind(param(req, 'kind'));
    const { reason } = z.object({ reason: z.string().trim().max(500).optional() }).parse(req.body ?? {});
    const actorId = req.user!.id;
    const why = reason ? ` Reason: ${reason}` : '';

    if (kind === 'PROPERTY') {
      const p = await prisma.property.findUnique({ where: { id: param(req, 'id') }, include: { branch: true } });
      if (!p) throw new HttpError(404, 'Registration not found.');
      assertInScope(scope, p.branchId);
      if (p.approvalStatus !== 'PENDING') throw new HttpError(409, 'This registration has already been decided.');
      await prisma.$transaction([
        prisma.property.update({ where: { id: p.id }, data: { approvalStatus: 'REJECTED' } }),
        prisma.propertyStatusHistory.create({ data: { propertyId: p.id, status: p.status, reason: `Registration returned.${why}`, changedBy: actorId } })
      ]);
      const ref = p.reference ?? p.id;
      await audit(actorId, 'property.returned', 'Property', p.id, `Returned property registration ${ref}.${why}`, branchLabel(p.branch));
      await notify(p.ownerId, 'REGISTRATION', `Registration ${ref} returned`, `${p.title} needs changes before it can be listed.${why}`, 'Email');
    } else {
      const a = await prisma.application.findUnique({ where: { id: param(req, 'id') }, include: { user: true, property: { include: { branch: true } } } });
      if (!a) throw new HttpError(404, 'Application not found.');
      assertInScope(scope, a.property.branchId);
      if (a.status !== 'PENDING') throw new HttpError(409, 'This application has already been decided.');
      await prisma.application.update({ where: { id: a.id }, data: { status: 'REJECTED', notes: reason ?? a.notes } });
      await audit(actorId, 'application.returned', 'Application', a.id, `Returned client application ${a.user.code ?? a.userId}.${why}`, branchLabel(a.property.branch));
      await notify(a.userId, 'APPLICATION', 'Application not approved', `Your application for ${a.property.title} was not approved.${why}`, 'Email');
    }

    const out: QueueItem[] = await buildQueue(scope);
    res.json(out);
  })
);

/* ---------- Viewings ---------- */

const viewingInclude = { client: true, property: true, staff: true } as const;

function toStaffViewing(v: Prisma.ViewingGetPayload<{ include: typeof viewingInclude }>): StaffViewing {
  return {
    id: v.id,
    date: v.scheduledAt.toISOString(),
    status: v.status,
    client: { id: v.client.id, code: v.client.code ?? '' },
    property: { id: v.property.id, title: v.property.title },
    staff: v.staff ? { id: v.staff.id, name: fullName(v.staff) } : null,
    feedbackMetric: v.feedbackMetric,
    notes: v.notes
  };
}

router.get(
  '/viewings',
  authorize(...VIEWING_ROLES),
  asyncHandler(async (req, res) => {
    const scope = await resolveScope(req);
    const rows = await prisma.viewing.findMany({ where: viaProperty(scope), include: viewingInclude, orderBy: { scheduledAt: 'desc' } });
    const out: StaffViewing[] = rows.map(toStaffViewing);
    res.json(out);
  })
);

const logViewingSchema = z.object({
  clientId: z.string().min(1),
  propertyId: z.string().min(1),
  date: z.string().min(10),
  feedbackMetric: z.enum(FEEDBACK_METRICS),
  notes: z.string().trim().max(1000).optional().default('')
});

router.post(
  '/viewings',
  authorize(...VIEWING_ROLES),
  asyncHandler(async (req, res) => {
    const scope = await resolveScope(req);
    const body = logViewingSchema.parse(req.body ?? {});
    const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? parseYmd(body.date) : new Date(body.date);
    if (Number.isNaN(date.getTime())) throw new HttpError(400, 'date must be YYYY-MM-DD or an ISO date-time.');
    if (date.getTime() > Date.now() + 60 * 60 * 1000) throw new HttpError(400, 'An attended viewing cannot be in the future.');

    const [client, property] = await Promise.all([
      prisma.user.findUnique({ where: { id: body.clientId }, include: { role: true } }),
      prisma.property.findUnique({ where: { id: body.propertyId }, include: { branch: true } })
    ]);
    if (!client || client.role?.name !== 'CLIENT') throw new HttpError(404, 'Client not found.');
    if (!property || property.approvalStatus !== 'APPROVED') throw new HttpError(404, 'Property not found.');
    assertInScope(scope, property.branchId);

    const row = await prisma.viewing.create({
      data: {
        clientId: client.id,
        propertyId: property.id,
        staffId: req.user!.id,
        scheduledAt: date,
        status: 'ATTENDED',
        feedbackMetric: body.feedbackMetric,
        notes: body.notes || null
      },
      include: viewingInclude
    });
    await audit(req.user!.id, 'viewing.logged', 'Viewing', row.id, `Logged viewing ${client.code} at ${property.title}`, branchLabel(property.branch));

    const out: StaffViewing = toStaffViewing(row);
    res.status(201).json(out);
  })
);

/* ---------- Options for forms ---------- */

router.get(
  '/options',
  asyncHandler(async (req, res) => {
    const scope = await resolveScope(req);
    const [clients, properties, specialists] = await Promise.all([
      prisma.user.findMany({ where: { role: { name: 'CLIENT' } }, orderBy: { code: 'asc' } }),
      prisma.property.findMany({ where: { ...scope.where, approvalStatus: 'APPROVED' }, orderBy: { title: 'asc' } }),
      prisma.user.findMany({ where: { role: { name: 'PROPERTY_SPECIALIST' }, status: 'ACTIVE', ...scope.where }, orderBy: { firstName: 'asc' } })
    ]);
    const out: StaffOptions = {
      clients: clients.map((c) => ({ id: c.id, code: c.code ?? '', name: fullName(c) })),
      properties: properties.map((p) => ({ id: p.id, title: p.title, monthlyRent: p.monthlyRent, status: p.status })),
      specialists: specialists.map((s) => ({ id: s.id, name: fullName(s) })),
      feedbackMetrics: [...FEEDBACK_METRICS]
    };
    res.json(out);
  })
);

/* ---------- Matching ---------- */

function joinReasons(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}

async function buildMatches(scope: ResolvedScope, propertyId?: string): Promise<MatchResult> {
  const listings = await prisma.property.findMany({
    where: { ...scope.where, approvalStatus: 'APPROVED', status: 'AVAILABLE', isActive: true },
    include: { branch: true },
    orderBy: { createdAt: 'desc' }
  });
  if (propertyId && !listings.some((l) => l.id === propertyId)) throw new HttpError(404, 'No available listing with that id in your branch.');
  const selected = listings.find((l) => l.id === propertyId) ?? listings[0] ?? null;

  const result: MatchResult = {
    listings: listings.map((l) => ({ id: l.id, title: l.title, city: branchCity(l.branch.name), roomCount: l.roomCount, monthlyRent: l.monthlyRent })),
    selected: selected?.id ?? null,
    matches: []
  };
  if (!selected) return result;

  const clients = await prisma.user.findMany({
    where: { role: { name: 'CLIENT' }, status: 'ACTIVE' },
    include: { clientProfile: true },
    orderBy: { code: 'asc' }
  });
  const notified = await prisma.notification.findMany({ where: { type: `MATCH:${selected.id}` }, select: { userId: true } });
  const notifiedIds = new Set(notified.map((n) => n.userId));
  const city = branchCity(selected.branch.name);

  for (const c of clients) {
    const p = c.clientProfile;
    if (!p) continue;
    const reasons: ('location' | 'budget' | 'rooms')[] = [];
    const parts: string[] = [];
    if (p.preferredLocation === selected.branch.name) {
      reasons.push('location');
      parts.push(`location = ${city}`);
    }
    if (p.maxRent != null && p.maxRent >= selected.monthlyRent) {
      reasons.push('budget');
      parts.push(`monthly rent ${formatMvr(selected.monthlyRent)} ≤ client maximum ${formatMvr(p.maxRent)}`);
    }
    if (p.roomCount != null && p.roomCount === selected.roomCount) {
      reasons.push('rooms');
      parts.push(`${selected.roomCount} ${selected.roomCount === 1 ? 'room' : 'rooms'} as requested`);
    }
    if (reasons.length < 2) continue;
    result.matches.push({
      clientId: c.id,
      code: c.code ?? '',
      preferredLocation: p.preferredLocation ? branchCity(p.preferredLocation) : null,
      roomCount: p.roomCount,
      maxRent: p.maxRent,
      score: reasons.length as 2 | 3,
      reasons,
      explanation: `Matched because ${joinReasons(parts)}.`,
      notified: notifiedIds.has(c.id)
    });
  }
  result.matches.sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));
  return result;
}

router.get(
  '/matches',
  asyncHandler(async (req, res) => {
    const scope = await resolveScope(req);
    const propertyId = typeof req.query.propertyId === 'string' && req.query.propertyId ? req.query.propertyId : undefined;
    const out: MatchResult = await buildMatches(scope, propertyId);
    res.json(out);
  })
);

router.post(
  '/matches/notify',
  asyncHandler(async (req, res) => {
    const scope = await resolveScope(req);
    const body = z.object({ propertyId: z.string().min(1), clientId: z.string().min(1) }).parse(req.body ?? {});
    const result = await buildMatches(scope, body.propertyId);
    const match = result.matches.find((m) => m.clientId === body.clientId);
    if (!match) throw new HttpError(409, 'This client does not match the selected listing.');

    if (!match.notified) {
      const property = await prisma.property.findUniqueOrThrow({ where: { id: body.propertyId }, include: { branch: true } });
      await notify(
        body.clientId,
        `MATCH:${property.id}`,
        `New match: ${property.title}`,
        `${property.title} in ${branchCity(property.branch.name)} at ${formatMvr(property.monthlyRent)} a month. ${match.explanation}`,
        'SMS + Email'
      );
      await audit(req.user!.id, 'match.notified', 'Property', property.id, `Notified ${match.code} about ${property.title}`, branchLabel(property.branch));
    }

    const out: MatchResult = await buildMatches(scope, body.propertyId);
    res.json(out);
  })
);

/* ---------- Leases ---------- */

const leaseInclude = { property: true, client: true, executingStaff: true } as const;

function toStaffLease(l: Prisma.LeaseGetPayload<{ include: typeof leaseInclude }>): StaffLease {
  const reminder = new Date(l.expiryDate);
  reminder.setMonth(reminder.getMonth() - 2);
  return {
    id: l.id,
    reference: l.reference ?? l.id,
    status: l.status,
    property: { id: l.property.id, title: l.property.title },
    client: { id: l.client.id, code: l.client.code ?? '' },
    monthlyRent: l.monthlyRent,
    securityDeposit: l.securityDeposit,
    startDate: l.startDate.toISOString(),
    expiryDate: l.expiryDate.toISOString(),
    renewalReminder: reminder.toISOString(),
    paymentMethod: l.paymentMethod,
    clientSigned: l.clientSigned,
    ownerSigned: l.ownerSigned,
    executingStaff: l.executingStaff ? { code: l.executingStaff.code ?? '', name: fullName(l.executingStaff) } : null
  };
}

router.get(
  '/leases',
  asyncHandler(async (req, res) => {
    const scope = await resolveScope(req);
    const rows = await prisma.lease.findMany({ where: viaProperty(scope), include: leaseInclude, orderBy: { createdAt: 'desc' } });
    const out: StaffLease[] = rows.map(toStaffLease);
    res.json(out);
  })
);

const createLeaseSchema = z.object({
  propertyId: z.string().min(1),
  clientId: z.string().min(1),
  monthlyRent: z.number().int().positive().max(1_000_000),
  securityDeposit: z.number().int().min(0).max(1_000_000),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  termMonths: z.number().int().min(1).max(60),
  paymentMethod: z.enum(['Bank deposit', 'Online transfer', 'Cash at branch'])
});

router.post(
  '/leases',
  authorize(...LEASE_ROLES),
  asyncHandler(async (req, res) => {
    const scope = await resolveScope(req);
    const body = createLeaseSchema.parse(req.body ?? {});
    const [property, client] = await Promise.all([
      prisma.property.findUnique({ where: { id: body.propertyId }, include: { branch: true } }),
      prisma.user.findUnique({ where: { id: body.clientId }, include: { role: true } })
    ]);
    if (!property || property.approvalStatus !== 'APPROVED') throw new HttpError(404, 'Property not found.');
    assertInScope(scope, property.branchId);
    if (!client || client.role?.name !== 'CLIENT') throw new HttpError(404, 'Client not found.');
    if (property.status !== 'AVAILABLE') throw new HttpError(409, 'Only an available property can be leased.');
    const open = await prisma.lease.findFirst({ where: { propertyId: property.id, status: { in: ['DRAFT', 'AWAITING_SIGNATURE', 'ACTIVE'] } } });
    if (open) throw new HttpError(409, `Lease ${open.reference ?? open.id} is already open for this property.`);

    const start = parseYmd(body.startDate);
    const expiry = calculateLeaseExpiry(start, body.termMonths);
    expiry.setDate(expiry.getDate() - 1);
    const reference = await nextLeaseReference();

    const lease = await prisma.lease.create({
      data: {
        reference,
        propertyId: property.id,
        clientId: client.id,
        executingStaffId: req.user!.id,
        startDate: start,
        expiryDate: expiry,
        termMonths: body.termMonths,
        monthlyRent: body.monthlyRent,
        advancePayment: body.monthlyRent,
        securityDeposit: body.securityDeposit,
        paymentMethod: body.paymentMethod,
        status: 'AWAITING_SIGNATURE',
        signatures: {
          create: [
            { role: 'CLIENT', signerId: client.id, status: 'PENDING' },
            { role: 'OWNER', signerId: property.ownerId, status: 'PENDING' }
          ]
        }
      },
      include: leaseInclude
    });

    await audit(req.user!.id, 'lease.drafted', 'Lease', lease.id, `Drafted lease ${reference} for ${client.code} at ${property.title}`, branchLabel(property.branch));
    const body2 = `Lease ${reference} for ${property.title} (${formatMvr(body.monthlyRent)} a month, ${body.termMonths} months) is ready for your signature.`;
    await notify(client.id, 'LEASE_SIGNATURE', 'Lease ready to sign', body2, 'SMS + Email');
    await notify(property.ownerId, 'LEASE_SIGNATURE', 'Lease ready to sign', body2, 'SMS + Email');

    const out: StaffLease = toStaffLease(lease);
    res.status(201).json(out);
  })
);

/* ---------- Inquiries ---------- */

const inquiryInclude = { routedTo: true } as const;

function toInquiry(i: Prisma.InquiryGetPayload<{ include: typeof inquiryInclude }>): Inquiry {
  const channel = i.channel === 'Phone' || i.channel === 'Web' ? i.channel : 'Walk-in';
  return {
    id: i.id,
    name: i.name,
    phone: i.phone,
    about: i.about,
    channel,
    createdAt: i.createdAt.toISOString(),
    routedTo: i.routedTo ? { id: i.routedTo.id, name: fullName(i.routedTo) } : null
  };
}

router.get(
  '/inquiries',
  authorize(...INQUIRY_ROLES),
  asyncHandler(async (req, res) => {
    const scope = await resolveScope(req);
    const rows = await prisma.inquiry.findMany({ where: scope.where, include: inquiryInclude, orderBy: { createdAt: 'desc' } });
    const out: Inquiry[] = rows.map(toInquiry);
    res.json(out);
  })
);

router.post(
  '/inquiries/:id/route',
  authorize(...INQUIRY_ROLES),
  asyncHandler(async (req, res) => {
    const scope = await resolveScope(req);
    const { specialistId } = z.object({ specialistId: z.string().min(1) }).parse(req.body ?? {});
    const inquiry = await prisma.inquiry.findUnique({ where: { id: param(req, 'id') }, include: { branch: true } });
    if (!inquiry) throw new HttpError(404, 'Inquiry not found.');
    assertInScope(scope, inquiry.branchId);
    const specialist = await prisma.user.findUnique({ where: { id: specialistId }, include: { role: true } });
    if (!specialist || specialist.role?.name !== 'PROPERTY_SPECIALIST') throw new HttpError(404, 'Property specialist not found.');
    if (scope.branchId && specialist.branchId !== scope.branchId) throw new HttpError(403, 'That specialist works in another branch.');

    const row = await prisma.inquiry.update({ where: { id: inquiry.id }, data: { routedToId: specialist.id }, include: inquiryInclude });
    await audit(req.user!.id, 'inquiry.routed', 'Inquiry', inquiry.id, `Routed inquiry from ${inquiry.name} to ${fullName(specialist)}`, branchLabel(inquiry.branch));
    await notify(specialist.id, 'INQUIRY', 'Inquiry routed to you', `${inquiry.name} (${inquiry.phone}): ${inquiry.about}`, 'Email');

    const out: Inquiry = toInquiry(row);
    res.json(out);
  })
);

/* ---------- Reports ---------- */

router.get(
  '/reports',
  authorize(...REPORT_ROLES),
  asyncHandler(async (req, res) => {
    const scope = await resolveScope(req);
    const month = typeof req.query.month === 'string' && req.query.month ? req.query.month : addMonths(currentMonth(), -1);
    if (!isMonthKey(month)) throw new HttpError(400, 'month must be YYYY-MM.');
    const range = monthRange(month);

    const [occ, viewings, leasesExecuted, payments, staff] = await Promise.all([
      branchOccupancy(scope),
      prisma.viewing.count({ where: { scheduledAt: range, status: { notIn: ['CANCELLED', 'REJECTED'] }, ...viaProperty(scope) } }),
      prisma.lease.count({ where: { executedAt: range, ...viaProperty(scope) } }),
      prisma.payment.findMany({ where: { month, status: 'PAID', ...(scope.branchId ? { lease: { property: { branchId: scope.branchId } } } : {}) } }),
      prisma.user.findMany({
        where: { role: { name: { in: STAFF_ROLES } }, ...scope.where },
        include: { role: true },
        orderBy: { code: 'asc' }
      })
    ]);

    const staffIds = staff.map((s) => s.id);
    const [regs, views, leases] = await Promise.all([
      prisma.auditLog.groupBy({ by: ['actorId'], where: { action: 'property.approved', createdAt: range, actorId: { in: staffIds } }, _count: true }),
      prisma.viewing.groupBy({ by: ['staffId'], where: { scheduledAt: range, staffId: { in: staffIds }, status: { notIn: ['CANCELLED', 'REJECTED'] } }, _count: true }),
      prisma.lease.groupBy({ by: ['executingStaffId'], where: { executedAt: range, executingStaffId: { in: staffIds } }, _count: true })
    ]);

    const listedUnits = occ.reduce((s, b) => s + b.properties, 0);
    const rented = occ.reduce((s, b) => s + b.rented, 0);
    const out: BranchReport = {
      scope: scope.scope,
      month,
      figures: {
        listedUnits,
        occupancy: listedUnits ? Math.round((rented / listedUnits) * 100) : 0,
        viewings,
        leasesExecuted,
        rentCollected: payments.reduce((s, p) => s + p.amount, 0)
      },
      occupancy: occ.map((b) => ({ branch: b.branch, pct: b.occupancy })),
      staff: staff.map((s) => ({
        id: s.id,
        name: fullName(s),
        role: asStaffRole(s.role?.name),
        registrations: regs.find((r) => r.actorId === s.id)?._count ?? 0,
        viewings: views.find((v) => v.staffId === s.id)?._count ?? 0,
        leases: leases.find((l) => l.executingStaffId === s.id)?._count ?? 0
      }))
    };
    res.json(out);
  })
);

/* ---------- Staff accounts (system admin) ---------- */

const accountInclude = { role: true, branch: true } as const;

function toStaffAccount(u: Prisma.UserGetPayload<{ include: typeof accountInclude }>): StaffAccount {
  return {
    id: u.id,
    code: u.code ?? '',
    name: fullName(u),
    email: u.email,
    role: asStaffRole(u.role?.name),
    branch: u.branch ? toBranchRef(u.branch) : null,
    mfaEnabled: u.mfaEnabled
  };
}

router.get(
  '/accounts',
  authorize('SYSTEM_ADMIN'),
  asyncHandler(async (req, res) => {
    const scope = await resolveScope(req);
    const rows = await prisma.user.findMany({
      where: { role: { name: { in: STAFF_ROLES } }, ...scope.where },
      include: accountInclude,
      orderBy: { code: 'asc' }
    });
    const out: StaffAccount[] = rows.map(toStaffAccount);
    res.json(out);
  })
);

const createAccountSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  role: z.enum(['SYSTEM_ADMIN', 'BRANCH_MANAGER', 'PROPERTY_SPECIALIST', 'RECEPTIONIST']),
  branch: z.enum(BRANCHES)
});

const emailPart = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');

router.post(
  '/accounts',
  authorize('SYSTEM_ADMIN'),
  asyncHandler(async (req, res) => {
    const body = createAccountSchema.parse(req.body ?? {});
    const email = `${emailPart(body.firstName)}.${emailPart(body.lastName)}@housing-4-raajje.test`;
    if (await prisma.user.findUnique({ where: { email } })) throw new HttpError(409, `An account with email ${email} already exists.`);
    const [role, branch] = await Promise.all([prisma.role.findUnique({ where: { name: body.role } }), prisma.branch.findUnique({ where: { name: body.branch } })]);
    if (!role || !branch || !isBranchName(branch.name)) throw new HttpError(500, 'Roles or branches are not seeded.');
    const code = await nextUserCode('STF');

    const user = await prisma.user.create({
      data: {
        code,
        email,
        firstName: body.firstName,
        lastName: body.lastName,
        roleId: role.id,
        branchId: branch.id,
        mfaEnabled: false,
        status: 'ACTIVE',
        staffProfile: { create: { employeeCode: code, department: ROLE_LABEL[body.role] } }
      },
      include: accountInclude
    });
    await audit(req.user!.id, 'staff.created', 'User', user.id, `Created staff account ${code} (${ROLE_LABEL[body.role]})`, branchLabel(branch));

    const out: StaffAccount = toStaffAccount(user);
    res.status(201).json(out);
  })
);

/* ---------- Audit log (system admin) ---------- */

router.get(
  '/audit',
  authorize('SYSTEM_ADMIN'),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    const out: AuditEntry[] = rows.map((r) => {
      const meta = parseAuditMetadata(r.metadata);
      return {
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        actor: r.actor ? { code: r.actor.code ?? '', name: fullName(r.actor) } : null,
        action: r.action,
        description: meta.description,
        branch: meta.branch
      };
    });
    res.json(out);
  })
);

export default router;
