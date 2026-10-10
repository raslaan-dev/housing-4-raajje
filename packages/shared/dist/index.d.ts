export declare const BRANCHES: readonly ["Male", "Hulhumale", "Villingili"];
export type BranchName = (typeof BRANCHES)[number];
export declare const ROLES: readonly ["SYSTEM_ADMIN", "BRANCH_MANAGER", "PROPERTY_SPECIALIST", "RECEPTIONIST", "OWNER", "CLIENT"];
export type RoleName = (typeof ROLES)[number];
export type UserRole = {
    id: string;
    name: RoleName;
};
export declare const PROPERTY_STATUS: readonly ["AVAILABLE", "RENTED", "UNDER_MAINTENANCE", "PENDING_APPROVAL"];
export type PropertyStatus = (typeof PROPERTY_STATUS)[number];
export declare const LEASE_STATUS: readonly ["DRAFT", "AWAITING_SIGNATURE", "ACTIVE", "EXPIRED", "TERMINATED"];
export type LeaseStatus = (typeof LEASE_STATUS)[number];
export declare const VIEWING_STATUS: readonly ["SCHEDULED", "ATTENDED", "NO_SHOW", "CANCELLED", "REJECTED"];
export type ViewingStatus = (typeof VIEWING_STATUS)[number];
export declare const APPLICATION_STATUS: readonly ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"];
export type ApplicationStatus = (typeof APPLICATION_STATUS)[number];
export declare const MAINTENANCE_STATUS: readonly ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];
export type MaintenanceStatus = (typeof MAINTENANCE_STATUS)[number];
export declare function isAdminRole(role: string | null | undefined): boolean;
export declare function matchesRentPreference(monthlyRent: number, maxRent: number): boolean;
export declare function calculateLeaseExpiry(startDate: Date, months: number): Date;
export declare function isLeaseReadyForActivation(signatures: {
    ownerSigned: boolean;
    clientSigned: boolean;
}): boolean;
export declare function branchMatchesLocation(branch: BranchName, location: string): boolean;
export * from './portal.js';
