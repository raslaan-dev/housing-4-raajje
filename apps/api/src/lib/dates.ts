// Month helpers. All calculations use server local time (the agency runs on Maldives time).
import type { PaymentState } from '@housing/shared';

export const RENT_DUE_DAY = 5;

const pad = (n: number, len = 2) => String(n).padStart(len, '0');

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function currentMonth(now = new Date()): string {
  return monthKey(now);
}

export function isMonthKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function monthStart(key: string): Date {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

export function addMonths(key: string, n: number): string {
  const d = monthStart(key);
  d.setMonth(d.getMonth() + n);
  return monthKey(d);
}

export function monthRange(key: string): { gte: Date; lt: Date } {
  return { gte: monthStart(key), lt: monthStart(addMonths(key, 1)) };
}

/** Inclusive list of month keys from `from` to `to` (empty when from > to). */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = from; k <= to; k = addMonths(k, 1)) out.push(k);
  return out;
}

export function dueDate(key: string): string {
  return `${key}-${pad(RENT_DUE_DAY)}`;
}

/** Unpaid rent is OVERDUE once today is past the 5th of that month, otherwise PENDING. */
export function unpaidState(key: string, now = new Date()): PaymentState {
  const due = monthStart(key);
  due.setDate(RENT_DUE_DAY);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return today > due ? 'OVERDUE' : 'PENDING';
}

export function ymd(date: Date | null | undefined): string | null {
  if (!date) return null;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parse 'YYYY-MM-DD' as a local calendar date. */
export function parseYmd(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayRange(now = new Date()): { gte: Date; lt: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

export function formatMvr(amount: number): string {
  return `MVR ${amount.toLocaleString('en-US')}`;
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function monthName(key: string): string {
  return monthStart(key).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
