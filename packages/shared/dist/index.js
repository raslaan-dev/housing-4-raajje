export const BRANCHES = ['Male', 'Hulhumale', 'Villingili'];
export const ROLES = [
    'SYSTEM_ADMIN',
    'BRANCH_MANAGER',
    'PROPERTY_SPECIALIST',
    'RECEPTIONIST',
    'OWNER',
    'CLIENT'
];
export const PROPERTY_STATUS = ['AVAILABLE', 'RENTED', 'UNDER_MAINTENANCE', 'PENDING_APPROVAL'];
export const LEASE_STATUS = ['DRAFT', 'AWAITING_SIGNATURE', 'ACTIVE', 'EXPIRED', 'TERMINATED'];
export const VIEWING_STATUS = ['SCHEDULED', 'ATTENDED', 'NO_SHOW', 'CANCELLED', 'REJECTED'];
export const APPLICATION_STATUS = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'];
export const MAINTENANCE_STATUS = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
export function isAdminRole(role) {
    return role === 'SYSTEM_ADMIN' || role === 'BRANCH_MANAGER';
}
export function matchesRentPreference(monthlyRent, maxRent) {
    return monthlyRent <= maxRent;
}
export function calculateLeaseExpiry(startDate, months) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + months);
    return date;
}
export function isLeaseReadyForActivation(signatures) {
    return Boolean(signatures.ownerSigned && signatures.clientSigned);
}
export function branchMatchesLocation(branch, location) {
    const normalizedLocation = location.toLowerCase();
    const branchMap = {
        Male: ['male', 'malé', 'male city'],
        Hulhumale: ['hulhumale', 'hulhumale city'],
        Villingili: ['villingili']
    };
    return branchMap[branch].includes(normalizedLocation);
}
export * from './portal.js';
