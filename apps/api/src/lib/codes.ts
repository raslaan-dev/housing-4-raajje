import { prisma } from './prisma.js';

function nextNumber(values: (string | null)[], prefix: string, fallback: number): number {
  let max = fallback;
  for (const v of values) {
    if (!v || !v.startsWith(prefix)) continue;
    const n = Number(v.slice(prefix.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

/** Next user code: CL-3120, OWN-20613, STF-020. */
export async function nextUserCode(kind: 'CL' | 'OWN' | 'STF'): Promise<string> {
  const prefix = `${kind}-`;
  const rows = await prisma.user.findMany({ where: { code: { startsWith: prefix } }, select: { code: true } });
  const fallback = kind === 'CL' ? 3000 : kind === 'OWN' ? 20000 : 0;
  const n = nextNumber(
    rows.map((r) => r.code),
    prefix,
    fallback
  );
  return `${prefix}${String(n).padStart(kind === 'STF' ? 3 : 4, '0')}`;
}

async function nextRef(prefix: string, values: (string | null)[]): Promise<string> {
  return `${prefix}${String(nextNumber(values, prefix, 0)).padStart(4, '0')}`;
}

export async function nextPropertyReference(): Promise<string> {
  const rows = await prisma.property.findMany({ where: { reference: { startsWith: 'APT-' } }, select: { reference: true } });
  return nextRef(
    'APT-',
    rows.map((r) => r.reference)
  );
}

export async function nextApplicationReference(): Promise<string> {
  const rows = await prisma.application.findMany({ where: { reference: { startsWith: 'APP-' } }, select: { reference: true } });
  return nextRef(
    'APP-',
    rows.map((r) => r.reference)
  );
}

export async function nextMaintenanceReference(): Promise<string> {
  const rows = await prisma.maintenanceRequest.findMany({ where: { reference: { startsWith: 'MR-' } }, select: { reference: true } });
  return nextRef(
    'MR-',
    rows.map((r) => r.reference)
  );
}

export async function nextLeaseReference(year = new Date().getFullYear()): Promise<string> {
  const prefix = `LSE-${year}-`;
  const rows = await prisma.lease.findMany({ where: { reference: { startsWith: prefix } }, select: { reference: true } });
  return nextRef(
    prefix,
    rows.map((r) => r.reference)
  );
}
