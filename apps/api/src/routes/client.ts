import { Router, type Request } from 'express';
import { z } from 'zod';
import {
  BRANCHES,
  MAINTENANCE_CATEGORIES,
  MANAGEMENT_FEE_RATE,
  type BranchName,
  type ClientLease,
  type ClientMe,
  type ClientProfile,
  type MaintenanceItem,
  type MessageThread,
  type NotificationItem
} from '@housing/shared';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { asyncHandler, HttpError } from '../lib/http.js';
import { branchLabel, fullName, isBranchName, toSessionUser, userInclude } from '../lib/serialize.js';
import { audit } from '../lib/audit.js';
import { notify } from '../lib/notify.js';
import { nextApplicationReference, nextMaintenanceReference } from '../lib/codes.js';
import { clientLeaseInclude, signLease, toClientLease, buildLeasePayments } from '../lib/leases.js';
import { formatMvr, isMonthKey, monthName, parseYmd, ymd } from '../lib/dates.js';

const router = Router();
router.use(requireAuth, authorize('CLIENT'));

const STAFF_ROLE_NAMES = ['SYSTEM_ADMIN', 'BRANCH_MANAGER', 'PROPERTY_SPECIALIST', 'RECEPTIONIST'];

async function loadClient(req: Request) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { ...userInclude, clientProfile: true } });
  if (!user || user.role?.name !== 'CLIENT') throw new HttpError(404, 'Client account not found.');
  return user;
}

function toProfile(user: Awaited<ReturnType<typeof loadClient>>): ClientProfile {
  const p = user.clientProfile;
  const sex = p?.sex === 'Female' || p?.sex === 'Male' ? p.sex : null;
  const loc = p?.preferredLocation;
  return {
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    email: user.email,
    phone: user.phone ?? '',
    sex,
    dateOfBirth: ymd(p?.dateOfBirth),
    maxRent: p?.maxRent ?? null,
    preferredLocation: isBranchName(loc) ? loc : null,
    roomCount: p?.roomCount ?? null,
    mfaEnabled: user.mfaEnabled
  };
}

async function currentLease(clientId: string) {
  return prisma.lease.findFirst({
    where: { clientId, status: { in: ['ACTIVE', 'AWAITING_SIGNATURE'] } },
    include: clientLeaseInclude,
    // Prefer the active lease over one still awaiting signatures.
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
  });
}

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const user = await loadClient(req);
    const [applications, viewings] = await Promise.all([
      prisma.application.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
      prisma.viewing.findMany({ where: { clientId: user.id }, orderBy: { scheduledAt: 'desc' } })
    ]);
    const body: ClientMe = {
      user: toSessionUser(user),
      profile: toProfile(user),
      applications: applications.map((a) => ({ id: a.id, propertyId: a.propertyId, status: a.status, createdAt: a.createdAt.toISOString() })),
      viewings: viewings.map((v) => ({ id: v.id, propertyId: v.propertyId, status: v.status, scheduledAt: v.scheduledAt.toISOString() }))
    };
    res.json(body);
  })
);

const profileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    phone: z.string().trim().min(7).max(20),
    sex: z.enum(['Female', 'Male']).nullable(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
      .nullable(),
    maxRent: z.number().int().positive().max(1_000_000).nullable(),
    preferredLocation: z.enum(BRANCHES).nullable(),
    roomCount: z.number().int().min(1).max(10).nullable()
  })
  .partial()
  .passthrough(); // email and mfaEnabled are accepted but ignored (identity is managed by Clerk)

router.patch(
  '/profile',
  asyncHandler(async (req, res) => {
    const user = await loadClient(req);
    const body = profileSchema.parse(req.body ?? {});
    await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        clientProfile: {
          upsert: {
            create: {
              sex: body.sex ?? null,
              dateOfBirth: body.dateOfBirth ? parseYmd(body.dateOfBirth) : null,
              maxRent: body.maxRent ?? null,
              preferredLocation: body.preferredLocation ?? null,
              roomCount: body.roomCount ?? null
            },
            update: {
              sex: body.sex,
              dateOfBirth: body.dateOfBirth === undefined ? undefined : body.dateOfBirth ? parseYmd(body.dateOfBirth) : null,
              maxRent: body.maxRent,
              preferredLocation: body.preferredLocation as BranchName | null | undefined,
              roomCount: body.roomCount
            }
          }
        }
      }
    });
    await audit(user.id, 'client.profile.updated', 'User', user.id, `Client ${user.code} updated their profile`, 'All');
    const out: ClientProfile = toProfile(await loadClient(req));
    res.json(out);
  })
);

router.post(
  '/applications',
  asyncHandler(async (req, res) => {
    const user = await loadClient(req);
    const body = z.object({ propertyId: z.string().min(1), termMonths: z.number().int().min(1).max(60) }).parse(req.body ?? {});
    const property = await prisma.property.findUnique({ where: { id: body.propertyId }, include: { branch: true } });
    if (!property || property.approvalStatus !== 'APPROVED') throw new HttpError(404, 'Property not found.');
    if (property.status !== 'AVAILABLE') throw new HttpError(409, 'This property is not available.');
    const existing = await prisma.application.findFirst({
      where: { userId: user.id, propertyId: property.id, status: { in: ['PENDING', 'APPROVED'] } }
    });
    if (existing) throw new HttpError(409, 'You have already applied for this property.');

    const reference = await nextApplicationReference();
    const app = await prisma.application.create({
      data: { userId: user.id, propertyId: property.id, termMonths: body.termMonths, reference, status: 'PENDING' }
    });
    await audit(user.id, 'application.submitted', 'Application', app.id, `Client ${user.code} applied for ${property.title} (${reference})`, branchLabel(property.branch));
    await notify(user.id, 'APPLICATION', 'Application received', `Your application ${reference} for ${property.title} is with the branch for review.`, 'Email');

    const out: ClientMe['applications'][number] & { reference: string } = {
      id: app.id,
      propertyId: app.propertyId,
      status: app.status,
      createdAt: app.createdAt.toISOString(),
      reference
    };
    res.status(201).json(out);
  })
);

router.post(
  '/viewings',
  asyncHandler(async (req, res) => {
    const user = await loadClient(req);
    const body = z.object({ propertyId: z.string().min(1) }).parse(req.body ?? {});
    const property = await prisma.property.findUnique({ where: { id: body.propertyId }, include: { branch: true } });
    if (!property || property.approvalStatus !== 'APPROVED') throw new HttpError(404, 'Property not found.');
    if (property.status !== 'AVAILABLE') throw new HttpError(409, 'This property is not available for viewings.');
    const existing = await prisma.viewing.findFirst({ where: { clientId: user.id, propertyId: property.id, status: 'SCHEDULED' } });
    if (existing) throw new HttpError(409, 'You already have a viewing scheduled for this property.');

    const scheduledAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const viewing = await prisma.viewing.create({
      data: { clientId: user.id, propertyId: property.id, scheduledAt, status: 'SCHEDULED', notes: 'Requested by client; staff to confirm' }
    });
    await audit(user.id, 'viewing.requested', 'Viewing', viewing.id, `Client ${user.code} requested a viewing of ${property.title}`, branchLabel(property.branch));
    await notify(user.id, 'VIEWING', 'Viewing requested', `We received your viewing request for ${property.title}. Staff will confirm the time.`, 'SMS');

    const out: ClientMe['viewings'][number] = {
      id: viewing.id,
      propertyId: viewing.propertyId,
      status: viewing.status,
      scheduledAt: viewing.scheduledAt.toISOString()
    };
    res.status(201).json(out);
  })
);

router.get(
  '/lease',
  asyncHandler(async (req, res) => {
    const lease = await currentLease(req.user!.id);
    const out: ClientLease | null = lease ? toClientLease(lease) : null;
    res.json(out);
  })
);

router.post(
  '/lease/sign',
  asyncHandler(async (req, res) => {
    const user = await loadClient(req);
    const lease = await prisma.lease.findFirst({ where: { clientId: user.id, status: 'AWAITING_SIGNATURE' }, orderBy: { createdAt: 'desc' } });
    if (!lease) throw new HttpError(404, 'No lease is waiting for your signature.');
    await signLease(lease.id, 'CLIENT', user.id);
    const fresh = await prisma.lease.findUniqueOrThrow({ where: { id: lease.id }, include: clientLeaseInclude });
    const out: ClientLease = toClientLease(fresh);
    res.json(out);
  })
);

router.post(
  '/payments',
  asyncHandler(async (req, res) => {
    const user = await loadClient(req);
    const { month } = z.object({ month: z.string().refine(isMonthKey, 'Use YYYY-MM') }).parse(req.body ?? {});
    const lease = await prisma.lease.findFirst({ where: { clientId: user.id, status: 'ACTIVE' }, include: clientLeaseInclude });
    if (!lease) throw new HttpError(409, 'You have no active lease.');

    const schedule = buildLeasePayments(lease);
    const entry = schedule.find((p) => p.month === month);
    if (!entry) throw new HttpError(400, 'That month is not payable on this lease yet.');
    if (entry.status === 'PAID') throw new HttpError(409, 'Rent for that month is already paid.');

    const amount = lease.monthlyRent;
    const managementFee = Math.round(amount * MANAGEMENT_FEE_RATE);
    const payment = await prisma.payment.create({
      data: {
        leaseId: lease.id,
        userId: user.id,
        month,
        amount,
        paymentMethod: 'Online transfer',
        paymentDate: new Date(),
        status: 'PAID',
        managementFee,
        ownerPayoutAmount: amount - managementFee,
        payoutPeriod: month
      }
    });
    const label = branchLabel(lease.property.branch);
    await audit(user.id, 'payment.recorded', 'Payment', payment.id, `Rent ${month} paid online for lease ${lease.reference ?? lease.id}`, label);
    await notify(user.id, 'PAYMENT', 'Payment received', `Payment of ${formatMvr(amount)} received for ${monthName(month)}.`, 'SMS + Email');
    await notify(
      lease.property.ownerId,
      'PAYMENT',
      'Rent received',
      `Rent of ${formatMvr(amount)} for ${lease.property.title} (${monthName(month)}) was received. Your payout is ${formatMvr(amount - managementFee)}.`,
      'Email'
    );

    const fresh = await prisma.lease.findUniqueOrThrow({ where: { id: lease.id }, include: clientLeaseInclude });
    const out: ClientLease = toClientLease(fresh);
    res.status(201).json(out);
  })
);

router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const rows = await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } });
    const out: NotificationItem[] = rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      channel: n.channel,
      createdAt: n.createdAt.toISOString(),
      isRead: n.isRead
    }));
    res.json(out);
  })
);

function toMaintenanceItem(m: { id: string; reference: string | null; category: string | null; issue: string; status: string; createdAt: Date; property: { title: string } }): MaintenanceItem {
  return {
    id: m.id,
    reference: m.reference ?? m.id,
    category: m.category ?? 'Other',
    issue: m.issue,
    status: m.status,
    propertyTitle: m.property.title,
    createdAt: m.createdAt.toISOString()
  };
}

router.get(
  '/maintenance',
  asyncHandler(async (req, res) => {
    const rows = await prisma.maintenanceRequest.findMany({
      where: { clientId: req.user!.id },
      include: { property: true },
      orderBy: { createdAt: 'desc' }
    });
    const out: MaintenanceItem[] = rows.map(toMaintenanceItem);
    res.json(out);
  })
);

router.post(
  '/maintenance',
  asyncHandler(async (req, res) => {
    const user = await loadClient(req);
    const body = z
      .object({ category: z.enum(MAINTENANCE_CATEGORIES), description: z.string().trim().min(3).max(1000) })
      .parse(req.body ?? {});
    const lease = await prisma.lease.findFirst({ where: { clientId: user.id, status: 'ACTIVE' }, include: { property: { include: { branch: true } } } });
    if (!lease) throw new HttpError(409, 'Maintenance can be reported only for a property you currently lease.');

    const reference = await nextMaintenanceReference();
    const row = await prisma.maintenanceRequest.create({
      data: {
        propertyId: lease.propertyId,
        clientId: user.id,
        ownerId: lease.property.ownerId,
        issue: body.description,
        category: body.category,
        reference,
        status: 'OPEN'
      },
      include: { property: true }
    });
    await audit(user.id, 'maintenance.reported', 'MaintenanceRequest', row.id, `Client ${user.code} reported ${reference} (${body.category}) at ${lease.property.title}`, branchLabel(lease.property.branch));
    await notify(lease.property.ownerId, 'MAINTENANCE', `Maintenance request ${reference}`, `${body.category} at ${lease.property.title}: ${body.description}`, 'Email');
    await notify(user.id, 'MAINTENANCE', `Maintenance request ${reference} received`, `Your ${body.category.toLowerCase()} request for ${lease.property.title} was sent to the owner.`, 'Email');

    const out: MaintenanceItem = toMaintenanceItem(row);
    res.status(201).json(out);
  })
);

async function loadThreads(clientId: string): Promise<MessageThread[]> {
  const rows = await prisma.message.findMany({
    where: { OR: [{ senderId: clientId }, { recipientId: clientId }] },
    include: { sender: { include: { role: true } }, recipient: { include: { role: true } } },
    orderBy: { createdAt: 'asc' }
  });

  const threads = new Map<string, MessageThread>();
  for (const m of rows) {
    const key = m.threadKey ?? m.subject ?? 'General';
    let thread = threads.get(key);
    if (!thread) {
      thread = { key, title: m.subject ?? key, staff: { id: '', name: '' }, messages: [] };
      threads.set(key, thread);
    }
    for (const party of [m.sender, m.recipient]) {
      if (!thread.staff.id && party.id !== clientId && STAFF_ROLE_NAMES.includes(party.role?.name ?? '')) {
        thread.staff = { id: party.id, name: fullName(party) };
      }
    }
    const mine = m.senderId === clientId;
    thread.messages.push({
      id: m.id,
      mine,
      // Owners never message clients directly; staff relay their words.
      senderName: m.sender.role?.name === 'OWNER' ? 'Owner (relayed)' : fullName(m.sender),
      content: m.content,
      createdAt: m.createdAt.toISOString()
    });
  }

  // Most recently active thread first.
  return [...threads.values()].sort((a, b) => (b.messages.at(-1)?.createdAt ?? '').localeCompare(a.messages.at(-1)?.createdAt ?? ''));
}

router.get(
  '/messages',
  asyncHandler(async (req, res) => {
    const out: MessageThread[] = await loadThreads(req.user!.id);
    res.json(out);
  })
);

router.post(
  '/messages',
  asyncHandler(async (req, res) => {
    const user = await loadClient(req);
    const body = z.object({ threadKey: z.string().min(1), content: z.string().trim().min(1).max(2000) }).parse(req.body ?? {});
    const thread = (await loadThreads(user.id)).find((t) => t.key === body.threadKey);
    if (!thread) throw new HttpError(404, 'Conversation not found.');
    if (!thread.staff.id) throw new HttpError(409, 'No staff member is assigned to this conversation.');

    const msg = await prisma.message.create({
      data: { senderId: user.id, recipientId: thread.staff.id, subject: thread.title, threadKey: thread.key, content: body.content }
    });
    await audit(user.id, 'message.sent', 'Message', msg.id, `Client ${user.code} messaged ${thread.staff.name} about ${thread.title}`, 'All');
    await notify(thread.staff.id, 'MESSAGE', `New message from ${user.code}`, body.content.slice(0, 140), 'Email');

    const out: MessageThread = (await loadThreads(user.id)).find((t) => t.key === body.threadKey)!;
    res.status(201).json(out);
  })
);

export default router;
