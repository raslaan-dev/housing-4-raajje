import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.use((_req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found.' });
  }
  next();
});

router.get('/', requireAuth, async (_req, res) => {
  const payments = await prisma.payment.findMany({ include: { lease: true } });
  res.json(payments);
});

router.post('/', requireAuth, authorize('PROPERTY_SPECIALIST', 'BRANCH_MANAGER', 'CLIENT'), async (req, res) => {
  const body = req.body ?? {};
  const payment = await prisma.payment.create({
    data: {
      leaseId: body.leaseId,
      userId: body.userId ?? req.user?.id ?? 'demo-client',
      month: body.month ?? '2026-10',
      amount: Number(body.amount ?? 15000),
      paymentMethod: body.paymentMethod ?? 'Bank Transfer',
      paymentDate: new Date(body.paymentDate ?? Date.now()),
      status: body.status ?? 'PAID',
      ownerPayoutAmount: Number(body.ownerPayoutAmount ?? 13500),
      managementFee: Number(body.managementFee ?? 1500),
      payoutPeriod: body.payoutPeriod ?? '2026-10'
    }
  });

  res.status(201).json(payment);
});

export default router;
