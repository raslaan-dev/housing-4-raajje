export const BRANCHES = ['Male', 'Hulhumale', 'Villingili'] as const;
export type BranchName = (typeof BRANCHES)[number];

export const ROLES = [
  'SYSTEM_ADMIN',
  'BRANCH_MANAGER',
  'PROPERTY_SPECIALIST',
  'RECEPTIONIST',
  'OWNER',
  'CLIENT'
] as const;

export type RoleName = (typeof ROLES)[number];

export type UserRole = {
  id: string;
  name: RoleName;
};

export const PROPERTY_STATUS = ['AVAILABLE', 'RENTED', 'UNDER_MAINTENANCE', 'PENDING_APPROVAL'] as const;
export type PropertyStatus = (typeof PROPERTY_STATUS)[number];

export const LEASE_STATUS = ['DRAFT', 'AWAITING_SIGNATURE', 'ACTIVE', 'EXPIRED', 'TERMINATED'] as const;
export type LeaseStatus = (typeof LEASE_STATUS)[number];

export const VIEWING_STATUS = ['SCHEDULED', 'ATTENDED', 'NO_SHOW', 'CANCELLED', 'REJECTED'] as const;
export type ViewingStatus = (typeof VIEWING_STATUS)[number];

export const APPLICATION_STATUS = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUS)[number];

export const MAINTENANCE_STATUS = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUS)[number];

export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'SYSTEM_ADMIN' || role === 'BRANCH_MANAGER';
}

export function matchesRentPreference(monthlyRent: number, maxRent: number): boolean {
  return monthlyRent <= maxRent;
}

export function calculateLeaseExpiry(startDate: Date, months: number): Date {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + months);
  return date;
}

export function isLeaseReadyForActivation(signatures: { ownerSigned: boolean; clientSigned: boolean }): boolean {
  return Boolean(signatures.ownerSigned && signatures.clientSigned);
}

export function branchMatchesLocation(branch: BranchName, location: string): boolean {
  const normalizedLocation = location.toLowerCase();
  const branchMap: Record<BranchName, string[]> = {
    Male: ['male', 'malé', 'male city'],
    Hulhumale: ['hulhumale', 'hulhumale city'],
    Villingili: ['villingili']
  };

  return branchMap[branch].includes(normalizedLocation);
}

export * from './portal.js';
