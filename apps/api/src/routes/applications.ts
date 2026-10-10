import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const applications = await prisma.application.findMany({
    include: { property: true, user: true }
  });

  res.json(applications);
});

router.post('/', requireAuth, authorize('CLIENT', 'PROPERTY_SPECIALIST'), async (req, res) => {
  const body = req.body ?? {};
  const application = await prisma.application.create({
    data: {
      userId: body.userId ?? req.user?.id ?? 'demo-client',
      propertyId: body.propertyId,
      status: 'PENDING',
      notes: body.notes ?? 'Submitted via portal.'
    }
  });

  res.status(201).json(application);
});

router.patch('/:id/status', requireAuth, authorize('SYSTEM_ADMIN', 'BRANCH_MANAGER', 'PROPERTY_SPECIALIST'), async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const status = String(req.body?.status ?? 'APPROVED');
  const application = await prisma.application.update({
    where: { id },
    data: { status }
  });

  res.json(application);
});

export default router;
