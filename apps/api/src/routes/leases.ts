import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { isLeaseReadyForActivation } from '@housing/shared';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const leases = await prisma.lease.findMany({ include: { property: true, client: true } });
  res.json(leases);
});

router.post('/', requireAuth, authorize('PROPERTY_SPECIALIST', 'BRANCH_MANAGER', 'SYSTEM_ADMIN'), async (req, res) => {
  const body = req.body ?? {};

  const startDate = new Date(body.startDate ?? Date.now());
  const lease = await prisma.lease.create({
    data: {
      propertyId: body.propertyId,
      clientId: body.clientId ?? req.user?.id ?? 'demo-client',
      executingStaffId: body.executingStaffId ?? 'demo-staff',
      startDate,
      expiryDate: new Date(startDate.getFullYear(), startDate.getMonth() + Number(body.durationMonths ?? 12), startDate.getDate()),
      monthlyRent: Number(body.monthlyRent ?? 15000),
      advancePayment: Number(body.advancePayment ?? 15000),
      securityDeposit: Number(body.securityDeposit ?? 30000),
      paymentMethod: body.paymentMethod ?? 'Bank Transfer',
      status: 'AWAITING_SIGNATURE',
      ownerSigned: false,
      clientSigned: false
    }
  });

  res.status(201).json(lease);
});

router.patch('/:id/sign', requireAuth, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const lease = await prisma.lease.findUnique({ where: { id } });
  if (!lease) return res.status(404).json({ message: 'Lease not found.' });

  const signerRole = req.user?.role ?? 'CLIENT';
  const ownerSigned = signerRole === 'OWNER' ? true : lease.ownerSigned;
  const clientSigned = signerRole === 'CLIENT' ? true : lease.clientSigned;

  const updated = await prisma.lease.update({
    where: { id },
    data: {
      ownerSigned,
      clientSigned,
      status: isLeaseReadyForActivation({ ownerSigned, clientSigned }) ? 'ACTIVE' : 'AWAITING_SIGNATURE'
    }
  });

  res.json(updated);
});

export default router;
