import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const requests = await prisma.maintenanceRequest.findMany({ include: { property: true, client: true } });
  res.json(requests);
});

router.post('/', requireAuth, authorize('CLIENT', 'OWNER', 'PROPERTY_SPECIALIST'), async (req, res) => {
  const body = req.body ?? {};
  const request = await prisma.maintenanceRequest.create({
    data: {
      propertyId: body.propertyId,
      clientId: body.clientId ?? req.user?.id ?? 'demo-client',
      ownerId: body.ownerId,
      issue: body.issue ?? 'General maintenance required',
      priority: body.priority ?? 'MEDIUM',
      status: body.status ?? 'OPEN',
      assignedStaffId: body.assignedStaffId
    }
  });

  res.status(201).json(request);
});

router.patch('/:id', requireAuth, authorize('PROPERTY_SPECIALIST', 'BRANCH_MANAGER'), async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const request = await prisma.maintenanceRequest.update({
    where: { id },
    data: {
      status: req.body?.status ?? 'IN_PROGRESS',
      assignedStaffId: req.body?.assignedStaffId
    }
  });

  res.json(request);
});

export default router;
