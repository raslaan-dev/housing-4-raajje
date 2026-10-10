import type { Branch, Lease, LeaseSignature, Payment, Property, User } from '@prisma/client';
import { isLeaseReadyForActivation, type ClientLease, type LeasePayment } from '@housing/shared';
import { prisma } from './prisma.js';
import { HttpError } from './http.js';
import { audit } from './audit.js';
import { notify } from './notify.js';
import { branchCity, branchLabel, fullName, toBranchRef } from './serialize.js';
import { currentMonth, dueDate, monthKey, monthsBetween, unpaidState } from './dates.js';

/** Number of months covered by a lease (stored termMonths, or derived from the dates). */
export function leaseTerm(lease: Pick<Lease, 'termMonths' | 'startDate' | 'expiryDate'>): number {
  if (lease.termMonths) return lease.termMonths;
  const s = lease.startDate;
  const e = lease.expiryDate;
  return Math.max(1, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1);
}

/**
 * Rent schedule from the lease start month up to the current month (capped at expiry), newest first.
 * Months with a PAID Payment row are PAID; the rest are PENDING or OVERDUE (due on the 5th).
 * Leases that are not yet active have no schedule.
 */
export function buildLeasePayments(lease: Lease & { payments: Payment[] }, now = new Date()): LeasePayment[] {
  if (lease.status === 'DRAFT' || lease.status === 'AWAITING_SIGNATURE') return [];
  const start = monthKey(lease.startDate);
  const cur = currentMonth(now);
  const expiry = monthKey(lease.expiryDate);
  const end = cur < expiry ? cur : expiry;

  return monthsBetween(start, end)
    .map((month): LeasePayment => {
      const paid = lease.payments.find((p) => p.month === month && p.status === 'PAID');
      if (paid) {
        return {
          id: paid.id,
          month,
          amount: paid.amount,
          paymentMethod: paid.paymentMethod,
          paymentDate: paid.paymentDate?.toISOString() ?? null,
          dueDate: dueDate(month),
          status: 'PAID'
        };
      }
      return {
        id: null,
        month,
        amount: lease.monthlyRent,
        paymentMethod: null,
        paymentDate: null,
        dueDate: dueDate(month),
        status: unpaidState(month, now)
      };
    })
    .reverse();
}

export const clientLeaseInclude = {
  property: { include: { branch: true } },
  signatures: true,
  executingStaff: true,
  payments: true
} as const;

type FullLease = Lease & {
  property: Property & { branch: Branch };
  signatures: LeaseSignature[];
  executingStaff: User | null;
  payments: Payment[];
};

export function signedAt(lease: { signatures: LeaseSignature[] }, role: 'CLIENT' | 'OWNER'): string | null {
  const sig = lease.signatures.find((s) => s.role === role && s.signedAt);
  return sig?.signedAt?.toISOString() ?? null;
}

export function toClientLease(lease: FullLease, now = new Date()): ClientLease {
  const payments = buildLeasePayments(lease, now);
  const cur = currentMonth(now);
  return {
    id: lease.id,
    reference: lease.reference ?? lease.id,
    status: lease.status,
    property: {
      id: lease.property.id,
      title: lease.property.title,
      address: lease.property.address ?? '',
      district: lease.property.district ?? lease.property.location,
      city: branchCity(lease.property.branch.name),
      branch: toBranchRef(lease.property.branch)
    },
    monthlyRent: lease.monthlyRent,
    advancePayment: lease.advancePayment,
    securityDeposit: lease.securityDeposit,
    startDate: lease.startDate.toISOString(),
    expiryDate: lease.expiryDate.toISOString(),
    termMonths: leaseTerm(lease),
    clientSigned: lease.clientSigned,
    ownerSigned: lease.ownerSigned,
    clientSignedAt: signedAt(lease, 'CLIENT'),
    ownerSignedAt: signedAt(lease, 'OWNER'),
    executingStaff: lease.executingStaff ? { code: lease.executingStaff.code ?? '', name: fullName(lease.executingStaff) } : null,
    executedAt: lease.executedAt?.toISOString() ?? null,
    payments,
    current: payments.find((p) => p.month === cur) ?? null
  };
}

/**
 * Record a signature for one side. When both sides have signed the lease becomes ACTIVE,
 * executedAt is stamped and the property is marked RENTED.
 */
export async function signLease(leaseId: string, role: 'CLIENT' | 'OWNER', signerId: string) {
  const lease = await prisma.lease.findUnique({ where: { id: leaseId }, include: { property: { include: { branch: true } } } });
  if (!lease) throw new HttpError(404, 'Lease not found.');
  if (role === 'CLIENT' && lease.clientId !== signerId) throw new HttpError(403, 'This lease belongs to another client.');
  if (role === 'OWNER' && lease.property.ownerId !== signerId) throw new HttpError(403, 'This lease is for a property you do not own.');
  if (lease.status !== 'AWAITING_SIGNATURE') throw new HttpError(409, 'This lease is not awaiting signatures.');
  if ((role === 'CLIENT' && lease.clientSigned) || (role === 'OWNER' && lease.ownerSigned)) {
    throw new HttpError(409, 'You have already signed this lease.');
  }

  const now = new Date();
  const clientSigned = role === 'CLIENT' ? true : lease.clientSigned;
  const ownerSigned = role === 'OWNER' ? true : lease.ownerSigned;
  const activate = isLeaseReadyForActivation({ clientSigned, ownerSigned });
  const reference = lease.reference ?? lease.id;
  const label = branchLabel(lease.property.branch);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.leaseSignature.findFirst({ where: { leaseId, role } });
    if (existing) {
      await tx.leaseSignature.update({ where: { id: existing.id }, data: { signedAt: now, status: 'SIGNED', signerId } });
    } else {
      await tx.leaseSignature.create({ data: { leaseId, role, signerId, signedAt: now, status: 'SIGNED' } });
    }
    await tx.lease.update({
      where: { id: leaseId },
      data: { clientSigned, ownerSigned, ...(activate ? { status: 'ACTIVE', executedAt: now } : {}) }
    });
    if (activate) {
      await tx.property.update({ where: { id: lease.propertyId }, data: { status: 'RENTED' } });
      await tx.propertyStatusHistory.create({
        data: { propertyId: lease.propertyId, status: 'RENTED', reason: `Lease ${reference} activated`, changedBy: signerId }
      });
    }
  });

  await audit(signerId, `lease.signed.${role.toLowerCase()}`, 'Lease', leaseId, `${role === 'CLIENT' ? 'Client' : 'Owner'} signed lease ${reference}`, label);
  if (activate) {
    await audit(signerId, 'lease.activated', 'Lease', leaseId, `Lease ${reference} activated after both signatures`, label);
    const body = `Lease ${reference} for ${lease.property.title} is now active.`;
    await notify(lease.clientId, 'LEASE_ACTIVE', 'Lease active', body, 'SMS + Email');
    await notify(lease.property.ownerId, 'LEASE_ACTIVE', 'Lease active', body, 'SMS + Email');
  } else {
    const otherId = role === 'CLIENT' ? lease.property.ownerId : lease.clientId;
    await notify(otherId, 'LEASE_SIGNATURE', 'Lease signed by the other party', `${role === 'CLIENT' ? 'The client' : 'The owner'} signed lease ${reference}. Your signature is still needed.`, 'Email');
  }
}
