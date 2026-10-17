import { Router } from 'express';
import { z } from 'zod';
import type { DemoAccount, RoleName, SessionUser } from '@housing/shared';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../lib/http.js';
import { toSessionUser, userInclude } from '../lib/serialize.js';
import { nextUserCode } from '../lib/codes.js';
import { audit } from '../lib/audit.js';
import { notify } from '../lib/notify.js';
import { parseYmd } from '../lib/dates.js';

const router = Router();

const ROLE_ORDER: RoleName[] = ['SYSTEM_ADMIN', 'BRANCH_MANAGER', 'PROPERTY_SPECIALIST', 'RECEPTIONIST', 'OWNER', 'CLIENT'];

function assertDemoEnabled() {
  const enabled = process.env.NODE_ENV === 'development' || (process.env.NODE_ENV === 'preview' && process.env.DEMO_LOGIN === 'true');
  if (!enabled) throw new HttpError(404, 'Not found.');
}

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: req.user,
    message: 'Authenticated session is active.'
  });
});

/** Seeded accounts shown in the local sign-in picker (at least one per role). Disabled in production. */
const DEMO_EMAILS = [
  'shiham.ali@housing-4-raajje.test',
  'hassan.zameel@housing-4-raajje.test',
  'ibrahim.shafeeu@housing-4-raajje.test',
  'ahmed.afzal@housing-4-raajje.test',
  'aminath.rasha@housing-4-raajje.test',
  'hussain.nimal@housing-4-raajje.test',
  'mariyam.leena@housing-4-raajje.test',
  'owner@housing-4-raajje.test',
  'client@housing-4-raajje.test'
];

router.get(
  '/demo-accounts',
  asyncHandler(async (_req, res) => {
    assertDemoEnabled();
    const users = await prisma.user.findMany({ where: { email: { in: DEMO_EMAILS } }, include: userInclude });
    const accounts: DemoAccount[] = users
      .map(toSessionUser)
      .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || (a.branch?.number ?? 0) - (b.branch?.number ?? 0))
      .map(({ id, code, email, name, role, branch }) => ({ id, code, email, name, role, branch }));
    res.json(accounts);
  })
);

router.post(
  '/demo-login',
  asyncHandler(async (req, res) => {
    assertDemoEnabled();
    const { email } = z.object({ email: z.string().email() }).parse(req.body ?? {});
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, include: userInclude });
    if (!user) throw new HttpError(404, 'No account with that email.');
    const body: { user: SessionUser } = { user: toSessionUser(user) };
    res.json(body);
  })
);

const registerSchema = z
  .object({
    role: z.enum(['CLIENT', 'OWNER']),
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    email: z.string().trim().toLowerCase().email(),
    phone: z.string().trim().min(7).max(20),
    nationalId: z.string().trim().min(3).max(20).optional(),
    sex: z.enum(['Female', 'Male']).optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
      .optional(),
    maxRent: z.number().int().positive().max(1_000_000).optional()
  })
  .superRefine((v, ctx) => {
    if (v.role === 'OWNER' && !v.nationalId) ctx.addIssue({ code: 'custom', path: ['nationalId'], message: 'National ID is required for owners' });
  });

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body ?? {});
    if (await prisma.user.findUnique({ where: { email: body.email } })) throw new HttpError(409, 'An account with this email already exists.');

    const role = await prisma.role.findUnique({ where: { name: body.role } });
    if (!role) throw new HttpError(500, 'Roles are not seeded.');
    const code = await nextUserCode(body.role === 'CLIENT' ? 'CL' : 'OWN');

    const user = await prisma.user.create({
      data: {
        code,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        roleId: role.id,
        status: 'ACTIVE',
        ...(body.role === 'CLIENT'
          ? {
              clientProfile: {
                create: {
                  sex: body.sex ?? null,
                  dateOfBirth: body.dateOfBirth ? parseYmd(body.dateOfBirth) : null,
                  maxRent: body.maxRent ?? null
                }
              }
            }
          : { ownerProfile: { create: { nationalId: body.nationalId ?? null, payoutMethod: 'Bank transfer' } } })
      },
      include: userInclude
    });

    await audit(user.id, 'user.registered', 'User', user.id, `Registered ${body.role === 'CLIENT' ? 'client' : 'owner'} account ${code}`, 'All');
    await notify(user.id, 'WELCOME', 'Welcome to Housing_4_Raajje', `Your ${body.role === 'CLIENT' ? 'client' : 'owner'} account ${code} is ready.`, 'Email');

    const out: { user: SessionUser } = { user: toSessionUser(user) };
    res.status(201).json(out);
  })
);

export default router;
