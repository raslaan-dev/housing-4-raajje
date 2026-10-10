import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import type { Listing } from '@housing/shared';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { asyncHandler, HttpError, param } from '../lib/http.js';
import { cityToBranch, toListing } from '../lib/serialize.js';

const router = Router();

const str = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);
const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Public listings: approved and available only. No owner data is exposed. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const city = str(req.query.city);
    const rooms = str(req.query.rooms);
    const type = str(req.query.type);
    const maxRentRaw = str(req.query.maxRent);
    const q = str(req.query.q);
    const sort = str(req.query.sort) ?? 'new';

    const where: Prisma.PropertyWhereInput = { approvalStatus: 'APPROVED', status: 'AVAILABLE', isActive: true };

    if (city) {
      const branch = cityToBranch(city);
      if (!branch) throw new HttpError(400, 'city must be Malé, Hulhumalé or Villingili.');
      where.branch = { name: branch };
    }
    if (rooms) {
      if (rooms === '4+') where.roomCount = { gte: 4 };
      else if (/^\d+$/.test(rooms)) where.roomCount = Number(rooms);
      else throw new HttpError(400, "rooms must be 1, 2, 3 or '4+'.");
    }
    if (type) {
      if (type !== 'Apartment' && type !== 'Flat') throw new HttpError(400, 'type must be Apartment or Flat.');
      where.propertyType = type;
    }
    if (maxRentRaw) {
      const maxRent = Number(maxRentRaw);
      if (!Number.isFinite(maxRent) || maxRent <= 0) throw new HttpError(400, 'maxRent must be a positive number.');
      where.monthlyRent = { lte: maxRent };
    }

    const orderBy =
      sort === 'low' ? { monthlyRent: 'asc' as const } : sort === 'high' ? { monthlyRent: 'desc' as const } : { createdAt: 'desc' as const };

    const rows = await prisma.property.findMany({ where, include: { branch: true }, orderBy });
    let listings: Listing[] = rows.map(toListing);

    if (q) {
      // SQLite has no case-insensitive contains for non-ASCII; filter in JS with accents folded.
      const needle = fold(q);
      listings = listings.filter((l) => [l.title, l.address, l.district, l.city].some((f) => fold(f).includes(needle)));
    }

    res.json(listings);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const property = await prisma.property.findUnique({ where: { id: param(req, 'id') }, include: { branch: true } });
    if (!property || property.approvalStatus !== 'APPROVED') throw new HttpError(404, 'Property not found.');
    const listing: Listing = toListing(property);
    res.json(listing);
  })
);

router.post(
  '/',
  requireAuth,
  authorize('SYSTEM_ADMIN', 'BRANCH_MANAGER', 'PROPERTY_SPECIALIST', 'OWNER'),
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const ownerId = body.ownerId ?? req.user?.id ?? 'demo-owner';

    const property = await prisma.property.create({
      data: {
        title: body.title ?? 'New apartment',
        description: body.description ?? 'Property awaiting review',
        location: body.location ?? 'Male',
        roomCount: Number(body.roomCount ?? 2),
        monthlyRent: Number(body.monthlyRent ?? 15000),
        status: 'PENDING_APPROVAL',
        approvalStatus: 'PENDING',
        isActive: true,
        owner: {
          connect: { id: ownerId }
        },
        branch: {
          connectOrCreate: {
            where: { name: body.branch ?? 'Male' },
            create: { name: body.branch ?? 'Male', city: 'Malé' }
          }
        }
      }
    });

    res.status(201).json(property);
  })
);

export default router;
