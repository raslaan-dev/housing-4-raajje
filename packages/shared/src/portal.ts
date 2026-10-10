// API contract shared by apps/api (producer) and apps/web (consumer).
// Dates are ISO strings. Money is whole MVR. Months are 'YYYY-MM'.

import type { BranchName, RoleName } from './index.js';

export type StaffRole = 'SYSTEM_ADMIN' | 'BRANCH_MANAGER' | 'PROPERTY_SPECIALIST' | 'RECEPTIONIST';
export type PropertyType = 'Apartment' | 'Flat';
export type PaymentState = 'PAID' | 'PENDING' | 'OVERDUE';

export type BranchRef = { id: string; name: BranchName; city: string; number: 1 | 2 | 3 };

export type SessionUser = {
  id: string;
  code: string; // CL-3092, OWN-20418, STF-014
  email: string;
  name: string;
  role: RoleName;
  branch: BranchRef | null;
  mfaEnabled: boolean;
};

export type DemoAccount = Pick<SessionUser, 'id' | 'code' | 'email' | 'name' | 'role' | 'branch'>;

/* ---------- Public listings ---------- */

export type Listing = {
  id: string;
  title: string;
  address: string; // "Fehivinaresge, Orchid Magu"
  district: string; // "Machangolhi · Malé"
  city: string; // "Malé" | "Hulhumalé" | "Villingili"
  branch: BranchRef;
  propertyType: PropertyType;
  roomCount: number;
  monthlyRent: number;
  status: string; // PROPERTY_STATUS
  approvalStatus: string; // PENDING | APPROVED | REJECTED
  createdAt: string;
};

export type ListingQuery = {
  city?: string;
  rooms?: string; // '1' | '2' | '3' | '4+'
  type?: PropertyType;
  maxRent?: number;
  q?: string;
  sort?: 'new' | 'low' | 'high';
};

/* ---------- Auth ---------- */

export type RegisterBody = {
  role: 'CLIENT' | 'OWNER';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationalId?: string; // owner
  sex?: 'Female' | 'Male'; // client
  dateOfBirth?: string; // client, YYYY-MM-DD
  maxRent?: number; // client
};

/* ---------- Client ---------- */

export type ClientProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  sex: 'Female' | 'Male' | null;
  dateOfBirth: string | null; // YYYY-MM-DD
  maxRent: number | null;
  preferredLocation: BranchName | null;
  roomCount: number | null;
  mfaEnabled: boolean;
};

export type ClientMe = {
  user: SessionUser;
  profile: ClientProfile;
  applications: { id: string; propertyId: string; status: string; createdAt: string }[];
  viewings: { id: string; propertyId: string; status: string; scheduledAt: string }[];
};

export type LeasePayment = {
  id: string | null; // null for the current unpaid month
  month: string;
  amount: number;
  paymentMethod: string | null;
  paymentDate: string | null;
  dueDate: string; // 5th of the month
  status: PaymentState;
};

export type ClientLease = {
  id: string;
  reference: string; // LSE-2026-0412
  status: string; // LEASE_STATUS
  property: { id: string; title: string; address: string; district: string; city: string; branch: BranchRef };
  monthlyRent: number;
  advancePayment: number;
  securityDeposit: number;
  startDate: string;
  expiryDate: string;
  termMonths: number;
  clientSigned: boolean;
  ownerSigned: boolean;
  clientSignedAt: string | null;
  ownerSignedAt: string | null;
  executingStaff: { code: string; name: string } | null;
  executedAt: string | null;
  payments: LeasePayment[]; // newest first, includes the current month
  current: LeasePayment | null; // this month's rent
};

export type NotificationItem = { id: string; type: string; title: string; body: string; channel: string; createdAt: string; isRead: boolean };

export type MaintenanceItem = {
  id: string;
  reference: string; // MR-0218
  category: string;
  issue: string;
  status: string; // MAINTENANCE_STATUS
  propertyTitle: string;
  createdAt: string;
};

export type MessageThread = {
  key: string; // subject used as the thread key
  title: string;
  staff: { id: string; name: string };
  messages: { id: string; mine: boolean; senderName: string; content: string; createdAt: string }[];
};

/* ---------- Owner ---------- */

export type FeedbackShare = { metric: string; count: number; pct: number };

export type OwnerUnit = {
  id: string;
  title: string;
  address: string;
  district: string;
  city: string;
  branch: BranchRef;
  propertyType: PropertyType;
  roomCount: number;
  monthlyRent: number;
  status: string;
  approvalStatus: string;
  viewCount: number;
  lastViewing: string | null;
  feedback: FeedbackShare[]; // reasons viewers did not proceed, pct of viewings
  viewings: { id: string; date: string; staffName: string; feedbackMetric: string | null; notes: string | null }[];
  lease: null | {
    id: string;
    reference: string;
    status: string;
    startDate: string;
    expiryDate: string;
    termMonths: number;
    ownerSigned: boolean;
    clientSigned: boolean;
    current: LeasePayment | null;
    history: { month: string; status: PaymentState }[]; // last 6 months, oldest first
  };
};

export type OwnerOverview = {
  user: SessionUser;
  units: OwnerUnit[];
  stats: { collectedThisMonth: number; available: number; overdue: number; month: string };
  payments: { id: string; date: string; unitTitle: string; leaseReference: string; amount: number; status: PaymentState }[]; // newest first
  earnings: { months: { month: string; gross: number; fee: number; net: number }[]; ytdNet: number; feeRate: number };
  pendingSignatures: { leaseId: string; reference: string; unitTitle: string; clientCode: string; monthlyRent: number; startDate: string; termMonths: number }[];
  profile: { firstName: string; lastName: string; email: string; phone: string; nationalId: string; bankName: string; accountNumber: string; mfaEnabled: boolean };
};

export type RegisterPropertyBody = {
  title: string;
  house: string;
  goalhi: string;
  district: string; // one of DISTRICTS
  propertyType: PropertyType;
  roomCount: number;
  monthlyRent: number;
};

/* ---------- Staff ---------- */

export type BranchScope = 'all' | BranchName;

export type StaffOverview = {
  scope: BranchScope;
  queues: { pendingRegistrations: number; pendingApplications: number; viewingsToday: number; openMaintenance: number };
  branches: { branch: BranchRef; properties: number; occupancy: number; avgRent: number }[];
};

export type QueueItem = {
  id: string;
  kind: 'PROPERTY' | 'APPLICATION';
  reference: string;
  title: string;
  subtitle: string;
  branch: BranchRef;
  createdAt: string;
  fields: { label: string; value: string }[];
  checks: string[];
};

export type StaffViewing = {
  id: string;
  date: string;
  status: string;
  client: { id: string; code: string };
  property: { id: string; title: string };
  staff: { id: string; name: string } | null;
  feedbackMetric: string | null;
  notes: string | null;
};

export type StaffOptions = {
  clients: { id: string; code: string; name: string }[];
  properties: { id: string; title: string; monthlyRent: number; status: string }[];
  specialists: { id: string; name: string }[];
  feedbackMetrics: string[];
};

export type MatchResult = {
  listings: { id: string; title: string; city: string; roomCount: number; monthlyRent: number }[];
  selected: string | null;
  matches: {
    clientId: string;
    code: string;
    preferredLocation: string | null;
    roomCount: number | null;
    maxRent: number | null;
    score: 2 | 3;
    reasons: ('location' | 'budget' | 'rooms')[];
    explanation: string;
    notified: boolean;
  }[];
};

export type StaffLease = {
  id: string;
  reference: string;
  status: string;
  property: { id: string; title: string };
  client: { id: string; code: string };
  monthlyRent: number;
  securityDeposit: number;
  startDate: string;
  expiryDate: string;
  renewalReminder: string;
  paymentMethod: string;
  clientSigned: boolean;
  ownerSigned: boolean;
  executingStaff: { code: string; name: string } | null;
};

export type CreateLeaseBody = {
  propertyId: string;
  clientId: string;
  monthlyRent: number;
  securityDeposit: number;
  startDate: string; // YYYY-MM-DD
  termMonths: number;
  paymentMethod: 'Bank deposit' | 'Online transfer' | 'Cash at branch';
};

export type Inquiry = {
  id: string;
  name: string;
  phone: string;
  about: string;
  channel: 'Walk-in' | 'Phone' | 'Web';
  createdAt: string;
  routedTo: { id: string; name: string } | null;
};

export type BranchReport = {
  scope: BranchScope;
  month: string;
  figures: { listedUnits: number; occupancy: number; viewings: number; leasesExecuted: number; rentCollected: number };
  occupancy: { branch: BranchRef; pct: number }[];
  staff: { id: string; name: string; role: StaffRole; registrations: number; viewings: number; leases: number }[];
};

export type StaffAccount = { id: string; code: string; name: string; email: string; role: StaffRole; branch: BranchRef | null; mfaEnabled: boolean };

export type AuditEntry = { id: string; createdAt: string; actor: { code: string; name: string } | null; action: string; description: string; branch: string };

export const DISTRICTS = [
  'Henveiru · Malé',
  'Machangolhi · Malé',
  'Maafannu · Malé',
  'Galolhu · Malé',
  'Phase 1 · Hulhumalé',
  'Phase 2 · Hulhumalé',
  'Villingili'
] as const;

export const FEEDBACK_METRICS = [
  'None',
  'Financial constraint ("Little expensive")',
  'Location ("Too far from work/school")',
  'Size ("Rooms too small")',
  'Furnishing ("Needs more furniture")'
] as const;

export const MAINTENANCE_CATEGORIES = ['Plumbing', 'Electrical', 'Air conditioning', 'Furniture', 'Other'] as const;

export const QUEUE_CHECKS = {
  PROPERTY: ['Ownership documents verified', 'Unit inspected and furnished', 'Rent within area guidance'],
  APPLICATION: ['National ID verified', 'Employment letter received', 'Reference contacted']
} as const;

export const MANAGEMENT_FEE_RATE = 0.1;
