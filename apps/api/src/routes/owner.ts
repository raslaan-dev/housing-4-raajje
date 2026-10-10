import { Router, type Request } from 'express';
import { z } from 'zod';
import type { Branch, Lease, LeaseSignature, Payment, Property, User, Viewing } from '@prisma/client';
import {
  DISTRICTS,
  FEEDBACK_METRICS,
  MANAGEMENT_FEE_RATE,
  type OwnerOverview,
  type OwnerUnit,
  type PaymentState
} from '@housing/shared';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { asyncHandler, HttpError, param } from '../lib/http.js';
import { asPropertyType, branchCity, branchLabel, districtToBranch, fullName, toBranchRef, toSessionUser, userInclude } from '../lib/serialize.js';
import { audit } from '../lib/audit.js';
import { notify } from '../lib/notify.js';
import { nextPropertyReference } from '../lib/codes.js';
import { buildLeasePayments, leaseTerm, signLease } from '../lib/leases.js';
import { currentMonth, monthsBetween } from '../lib/dates.js';

const router = Router();
router.use(requireAuth, authorize('OWNER'));

const unitInclude = {
  branch: true,
  viewings: { include: { staff: true } },
  leases: { include: { payments: true, signatures: true } }
} as const;

type UnitRow = Property & {
  branch: Branch;
  viewings: (Viewing & { staff: User | null })[];
  leases: (Lease & { payments: Payment[]; signatures: LeaseSignature[] })[];
};

/** The lease an owner cares about for a unit: active first, otherwise one awaiting signatures. */
function liveLease(unit: UnitRow) {
  return unit.leases.find((l) => l.status === 'ACTIVE') ?? unit.leases.find((l) => l.status === 'AWAITING_SIGNATURE') ?? null;
}

function toOwnerUnit(unit: UnitRow, now = new Date()): OwnerUnit {
  const attended = unit.viewings.filter((v) => v.status === 'ATTENDED').sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
  const viewCount = attended.length;
  const feedback = FEEDBACK_METRICS.filter((m) => m !== 'None').map((metric) => {
    const count = attended.filter((v) => v.feedbackMetric === metric).length;
    return { metric, count, pct: viewCount ? Math.round((count / viewCount) * 100) : 0 };
  });

  const lease = liveLease(unit);
  let leaseOut: OwnerUnit['lease'] = null;
  if (lease) {
    const schedule = buildLeasePayments(lease, now);
    const cur = currentMonth(now);
    leaseOut = {
      id: lease.id,
      reference: lease.reference ?? lease.id,
      status: lease.status,
      startDate: lease.startDate.toISOString(),
      expiryDate: lease.expiryDate.toISOString(),
      termMonths: leaseTerm(lease),
      ownerSigned: lease.ownerSigned,
      clientSigned: lease.clientSigned,
      current: schedule.find((p) => p.month === cur) ?? null,
      history: schedule
        .slice(0, 6)
        .reverse()
        .map((p) => ({ month: p.month, status: p.status }))
    };
  }

  return {
    id: unit.id,
    title: unit.title,
    address: unit.address ?? '',
    district: unit.district ?? unit.location,
    city: branchCity(unit.branch.name),
    branch: toBranchRef(unit.branch),
    propertyType: asPropertyType(unit.propertyType),
    roomCount: unit.roomCount,
    monthlyRent: unit.monthlyRent,
    status: unit.status,
    approvalStatus: unit.approvalStatus,
    viewCount,
    lastViewing: attended[0]?.scheduledAt.toISOString() ?? null,
    feedback,
    viewings: attended.map((v) => ({
      id: v.id,
      date: v.scheduledAt.toISOString(),
      staffName: v.staff ? fullName(v.staff) : 'Branch staff',
      feedbackMetric: v.feedbackMetric,
      notes: v.notes
    })),
    lease: leaseOut
  };
}

async function loadOwner(req: Request) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { ...userInclude, ownerProfile: true } });
  if (!user || user.role?.name !== 'OWNER') throw new HttpError(404, 'Owner account not found.');
  return user;
}

function toOwnerProfile(user: Awaited<ReturnType<typeof loadOwner>>): OwnerOverview['profile'] {
  return {
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    email: user.email,
    phone: user.phone ?? '',
    nationalId: user.ownerProfile?.nationalId ?? '',
    bankName: user.ownerProfile?.bankName ?? '',
    accountNumber: user.ownerProfile?.accountNumber ?? '',
    mfaEnabled: user.mfaEnabled
  };
}

async function loadUnit(ownerId: string, id: string): Promise<UnitRow> {
  const unit = await prisma.property.findUnique({ where: { id }, include: unitInclude });
  if (!unit) throw new HttpError(404, 'Property not found.');
  if (unit.ownerId !== ownerId) throw new HttpError(403, 'This property belongs to another owner.');
  return unit;
}

async function buildOverview(req: Request): Promise<OwnerOverview> {
  const now = new Date();
  const user = await loadOwner(req);
  const units = await prisma.property.findMany({ where: { ownerId: user.id }, include: unitInclude, orderBy: { createdAt: 'asc' } });
  const cur = currentMonth(now);

  // Rent schedule across every live lease, plus paid rows from older leases.
  const payments: OwnerOverview['payments'] = [];
  let overdue = 0;
  for (const unit of units) {
    for (const lease of unit.leases) {
      const reference = lease.reference ?? lease.id;
      const schedule = buildLeasePayments(lease, now);
      for (const p of schedule) {
        if (p.status === 'OVERDUE' && lease.status === 'ACTIVE') overdue += 1;
        payments.push({
          id: p.id ?? `${lease.id}:${p.month}`,
          date: p.paymentDate ?? p.dueDate,
          unitTitle: unit.title,
          leaseReference: reference,
          amount: p.amount,
          status: p.status
        });
      }
      // Paid rows outside the schedule window (e.g. expired leases).
      for (const pay of lease.payments) {
        if (pay.status === 'PAID' && !schedule.some((s) => s.id === pay.id)) {
          payments.push({
            id: pay.id,
            date: (pay.paymentDate ?? pay.createdAt).toISOString(),
            unitTitle: unit.title,
            leaseReference: reference,
            amount: pay.amount,
            status: 'PAID' as PaymentState
          });
        }
      }
    }
  }
  payments.sort((a, b) => b.date.localeCompare(a.date));

  const paid = units.flatMap((u) => u.leases.flatMap((l) => l.payments.filter((p) => p.status === 'PAID')));
  const year = now.getFullYear();
  const months = monthsBetween(`${year}-01`, cur).map((month) => {
    const gross = paid.filter((p) => p.month === month).reduce((sum, p) => sum + p.amount, 0);
    const fee = Math.round(gross * MANAGEMENT_FEE_RATE);
    return { month, gross, fee, net: gross - fee };
  });

  const pendingLeases = await prisma.lease.findMany({
    where: { status: 'AWAITING_SIGNATURE', ownerSigned: false, property: { ownerId: user.id } },
    include: { property: true, client: true },
    orderBy: { createdAt: 'desc' }
  });

  return {
    user: toSessionUser(user),
    units: units.map((u) => toOwnerUnit(u, now)),
    stats: {
      collectedThisMonth: months.find((m) => m.month === cur)?.gross ?? 0,
      available: units.filter((u) => u.status === 'AVAILABLE').length,
      overdue,
      month: cur
    },
    payments,
    earnings: { months, ytdNet: months.reduce((s, m) => s + m.net, 0), feeRate: MANAGEMENT_FEE_RATE },
    pendingSignatures: pendingLeases.map((l) => ({
      leaseId: l.id,
      reference: l.reference ?? l.id,
      unitTitle: l.property.title,
      clientCode: l.client.code ?? '',
      monthlyRent: l.monthlyRent,
      startDate: l.startDate.toISOString(),
      termMonths: leaseTerm(l)
    })),
    profile: toOwnerProfile(user)
  };
}

router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const out: OwnerOverview = await buildOverview(req);
    res.json(out);
  })
);

const registerSchema = z.object({
  title: z.string().trim().min(2).max(80),
  house: z.string().trim().min(1).max(80),
  goalhi: z.string().trim().min(1).max(80),
  district: z.enum(DISTRICTS),
  propertyType: z.enum(['Apartment', 'Flat']),
  roomCount: z.number().int().min(1).max(10),
  monthlyRent: z.number().int().min(1000).max(1_000_000)
});

router.post(
  '/properties',
  asyncHandler(async (req, res) => {
    const user = await loadOwner(req);
    const body = registerSchema.parse(req.body ?? {});
    const branch = await prisma.branch.findUnique({ where: { name: districtToBranch(body.district) } });
    if (!branch) throw new HttpError(500, 'Branches are not seeded.');
    const reference = await nextPropertyReference();

    const created = await prisma.property.create({
      data: {
        title: body.title,
        description: `${body.propertyType} with ${body.roomCount} rooms in ${body.district}, registered by the owner and awaiting branch verification.`,
        location: body.district,
        address: `${body.house}, ${body.goalhi}`,
        district: body.district,
        propertyType: body.propertyType,
        reference,
        roomCount: body.roomCount,
        monthlyRent: body.monthlyRent,
        status: 'PENDING_APPROVAL',
        approvalStatus: 'PENDING',
        ownerId: user.id,
        branchId: branch.id,
        history: { create: { status: 'PENDING_APPROVAL', reason: 'Registered by owner', changedBy: user.id } }
      }
    });
    await audit(user.id, 'property.registered', 'Property', created.id, `Owner ${user.code} registered ${body.title} (${reference})`, branchLabel(branch));
    await notify(user.id, 'REGISTRATION', `Registration ${reference} received`, `${body.title} is waiting for verification by the ${branchCity(branch.name)} branch.`, 'Email');

    const out: OwnerUnit = toOwnerUnit(await loadUnit(user.id, created.id));
    res.status(201).json(out);
  })
);

router.patch(
  '/properties/:id/status',
  asyncHandler(async (req, res) => {
    const user = await loadOwner(req);
    const { status } = z.object({ status: z.enum(['AVAILABLE', 'RENTED', 'UNDER_MAINTENANCE']) }).parse(req.body ?? {});
    const unit = await loadUnit(user.id, param(req, 'id'));
    if (unit.approvalStatus !== 'APPROVED') throw new HttpError(409, 'This unit is still pending approval by the branch.');
    if (status === 'AVAILABLE' && unit.leases.some((l) => l.status === 'ACTIVE')) {
      throw new HttpError(409, 'This unit has an active lease, so it cannot be marked available.');
    }
    if (unit.status === status) {
      const out: OwnerUnit = toOwnerUnit(unit);
      return res.json(out);
    }

    await prisma.$transaction([
      prisma.property.update({ where: { id: unit.id }, data: { status } }),
      prisma.propertyStatusHistory.create({ data: { propertyId: unit.id, status, reason: `Changed by owner from ${unit.status}`, changedBy: user.id } })
    ]);
    await audit(user.id, 'property.status_changed', 'Property', unit.id, `Owner ${user.code} set ${unit.title} to ${status}`, branchLabel(unit.branch));

    const out: OwnerUnit = toOwnerUnit(await loadUnit(user.id, unit.id));
    res.json(out);
  })
);

router.post(
  '/leases/:id/sign',
  asyncHandler(async (req, res) => {
    const user = await loadOwner(req);
    await signLease(param(req, 'id'), 'OWNER', user.id);
    const out: OwnerOverview = await buildOverview(req);
    res.json(out);
  })
);

const profileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    phone: z.string().trim().min(7).max(20),
    nationalId: z.string().trim().min(3).max(20),
    bankName: z.string().trim().min(2).max(80),
    accountNumber: z.string().trim().min(4).max(40)
  })
  .partial()
  .passthrough(); // email and mfaEnabled are ignored (identity is managed by Clerk)

router.patch(
  '/profile',
  asyncHandler(async (req, res) => {
    const user = await loadOwner(req);
    const body = profileSchema.parse(req.body ?? {});
    const profileData = { nationalId: body.nationalId, bankName: body.bankName, accountNumber: body.accountNumber };
    await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        ownerProfile: { upsert: { create: profileData, update: profileData } }
      }
    });
    await audit(user.id, 'owner.profile.updated', 'User', user.id, `Owner ${user.code} updated their profile`, 'All');
    const out: OwnerOverview['profile'] = toOwnerProfile(await loadOwner(req));
    res.json(out);
  })
);

export default router;
