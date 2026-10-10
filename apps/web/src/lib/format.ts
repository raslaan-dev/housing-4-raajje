import type { BranchRef, PaymentState } from '@housing/shared';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const mvr = (n: number | null | undefined) => (n == null ? '—' : 'MVR ' + Math.round(n).toLocaleString('en-US'));

export function mvrCompact(n: number) {
  if (n >= 1_000_000) return 'MVR ' + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  return mvr(n);
}

export const thousands = (n: number) => (n / 1000).toFixed(1) + 'k';

export function date(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

export function shortDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}

export function time(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export const dateTime = (iso: string) => `${shortDate(iso)}, ${time(iso)}`;

/** Today shows a time, yesterday says so, older shows the date. */
export function relativeStamp(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.round((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (days === 0) return time(iso);
  if (days === 1) return 'Yesterday';
  return shortDate(iso);
}

/** 'YYYY-MM' → 'Oct 2026' */
export function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  return `${MON[m - 1]} ${y}`;
}

export const monthShort = (month: string) => MON[Number(month.split('-')[1]) - 1];
export const monthLong = (month: string) => MONTH_LONG[Number(month.split('-')[1]) - 1];

export const branchLabel = (b: BranchRef | null | undefined) => (b ? `Branch ${b.number} · ${b.city}` : 'All branches');

export const rooms = (n: number) => `${n} ${n === 1 ? 'room' : 'rooms'}`;

export const termLabel = (months: number) =>
  months % 12 === 0 ? `${months / 12} ${months === 12 ? 'year' : 'years'}` : `${months} ${months === 1 ? 'month' : 'months'}`;

/* ---------- Shared status vocabulary (PRODUCT.md) ---------- */

const LABELS: Record<string, string> = {
  AVAILABLE: 'Available',
  RENTED: 'Rented',
  UNDER_MAINTENANCE: 'Under maintenance',
  PENDING_APPROVAL: 'Pending approval',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  SCHEDULED: 'Scheduled',
  ATTENDED: 'Attended',
  NO_SHOW: 'No-show',
  CANCELLED: 'Cancelled',
  DRAFT: 'Draft',
  AWAITING_SIGNATURE: 'Awaiting signature',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  TERMINATED: 'Terminated',
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  PAID: 'Paid',
  OVERDUE: 'Overdue'
};

export const statusLabel = (s: string) => LABELS[s] ?? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ');

const TONE: Record<string, string> = {
  AVAILABLE: 'pill-sage',
  APPROVED: 'pill-sage',
  ACTIVE: 'pill-sage',
  ATTENDED: 'pill-sage',
  RESOLVED: 'pill-sage',
  CLOSED: 'pill-sage',
  PAID: 'pill-sage',
  RENTED: 'pill-ink',
  IN_PROGRESS: 'pill-ink',
  ASSIGNED: 'pill-ink',
  SCHEDULED: 'pill-ink',
  UNDER_MAINTENANCE: 'pill-moss',
  PENDING_APPROVAL: 'pill-dashed',
  PENDING: 'pill-dashed',
  AWAITING_SIGNATURE: 'pill-dashed',
  DRAFT: 'pill-dashed',
  OPEN: 'pill-dashed',
  OVERDUE: 'pill-solid'
};

export const statusTone = (s: string) => TONE[s] ?? 'pill-ink';

export const paymentLabel = (s: PaymentState, dueDate?: string | null) =>
  s === 'PAID' ? 'Paid' : s === 'OVERDUE' ? 'Overdue' : dueDate ? `Due ${shortDate(dueDate)}` : 'Due';

export const ROLE_LABEL: Record<string, string> = {
  SYSTEM_ADMIN: 'System Administrator',
  BRANCH_MANAGER: 'Branch Manager',
  PROPERTY_SPECIALIST: 'Property Specialist',
  RECEPTIONIST: 'Receptionist',
  OWNER: 'Owner',
  CLIENT: 'Client'
};

export const CITIES = ['Malé', 'Hulhumalé', 'Villingili'] as const;

export const BRANCH_OPTIONS = [
  { value: 'Male', label: 'Branch 1 · Malé' },
  { value: 'Hulhumale', label: 'Branch 2 · Hulhumalé' },
  { value: 'Villingili', label: 'Branch 3 · Villingili' }
] as const;

export function branchForDistrict(district: string) {
  if (district.includes('Hulhumal')) return 'Branch 2 · Hulhumalé';
  if (district.includes('Villingili')) return 'Branch 3 · Villingili';
  return 'Branch 1 · Malé';
}

/** 'Fehivinaresge, Orchid Magu, Machangolhi' — address plus the district part that is not the island. */
export function streetLine(p: { address: string; district: string; city: string }) {
  const area = p.district.split(' · ')[0];
  return area && area !== p.city ? `${p.address}, ${area}` : p.address;
}

export const fullAddress = (p: { address: string; district: string; city: string }) => `${streetLine(p)} · ${p.city}`;
