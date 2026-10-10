import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const viewings = await prisma.viewing.findMany({ include: { property: true, client: true } });
  res.json(viewings);
});

router.post('/', requireAuth, authorize('PROPERTY_SPECIALIST', 'RECEPTIONIST', 'CLIENT'), async (req, res) => {
  const body = req.body ?? {};

  const viewing = await prisma.viewing.create({
    data: {
      propertyId: body.propertyId,
      clientId: body.clientId ?? req.user?.id ?? 'demo-client',
      staffId: body.staffId,
      scheduledAt: new Date(body.scheduledAt ?? Date.now() + 86400000),
      status: body.status ?? 'SCHEDULED',
      notes: body.notes ?? 'Viewing scheduled.'
    }
  });

  res.status(201).json(viewing);
});

export default router;
