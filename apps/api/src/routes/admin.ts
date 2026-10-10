import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/overview', requireAuth, authorize('SYSTEM_ADMIN', 'BRANCH_MANAGER'), async (_req, res) => {
  const [properties, applications, leases, users] = await Promise.all([
    prisma.property.count(),
    prisma.application.count(),
    prisma.lease.count(),
    prisma.user.count()
  ]);

  res.json({
    totals: {
      properties,
      applications,
      leases,
      users
    }
  });
});

router.get('/audit-logs', requireAuth, authorize('SYSTEM_ADMIN'), async (_req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  res.json(logs);
});

export default router;
