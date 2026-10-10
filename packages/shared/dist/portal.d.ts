import type { BranchName, RoleName } from './index.js';
export type StaffRole = 'SYSTEM_ADMIN' | 'BRANCH_MANAGER' | 'PROPERTY_SPECIALIST' | 'RECEPTIONIST';
export type PropertyType = 'Apartment' | 'Flat';
export type PaymentState = 'PAID' | 'PENDING' | 'OVERDUE';
export type BranchRef = {
    id: string;
    name: BranchName;
    city: string;
    number: 1 | 2 | 3;
};
export type SessionUser = {
    id: string;
    code: string;
    email: string;
    name: string;
    role: RoleName;
    branch: BranchRef | null;
    mfaEnabled: boolean;
};
export type DemoAccount = Pick<SessionUser, 'id' | 'code' | 'email' | 'name' | 'role' | 'branch'>;
export type Listing = {
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
    createdAt: string;
};
export type ListingQuery = {
    city?: string;
    rooms?: string;
    type?: PropertyType;
    maxRent?: number;
    q?: string;
    sort?: 'new' | 'low' | 'high';
};
export type RegisterBody = {
    role: 'CLIENT' | 'OWNER';
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    nationalId?: string;
    sex?: 'Female' | 'Male';
    dateOfBirth?: string;
    maxRent?: number;
};
export type ClientProfile = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    sex: 'Female' | 'Male' | null;
    dateOfBirth: string | null;
    maxRent: number | null;
    preferredLocation: BranchName | null;
    roomCount: number | null;
    mfaEnabled: boolean;
};
export type ClientMe = {
    user: SessionUser;
    profile: ClientProfile;
    applications: {
        id: string;
        propertyId: string;
        status: string;
        createdAt: string;
    }[];
    viewings: {
        id: string;
        propertyId: string;
        status: string;
        scheduledAt: string;
    }[];
};
export type LeasePayment = {
    id: string | null;
    month: string;
    amount: number;
    paymentMethod: string | null;
    paymentDate: string | null;
    dueDate: string;
    status: PaymentState;
};
export type ClientLease = {
    id: string;
    reference: string;
    status: string;
    property: {
        id: string;
        title: string;
        address: string;
        district: string;
        city: string;
        branch: BranchRef;
    };
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
    executingStaff: {
        code: string;
        name: string;
    } | null;
    executedAt: string | null;
    payments: LeasePayment[];
    current: LeasePayment | null;
};
export type NotificationItem = {
    id: string;
    type: string;
    title: string;
    body: string;
    channel: string;
    createdAt: string;
    isRead: boolean;
};
export type MaintenanceItem = {
    id: string;
    reference: string;
    category: string;
    issue: string;
    status: string;
    propertyTitle: string;
    createdAt: string;
};
export type MessageThread = {
    key: string;
    title: string;
    staff: {
        id: string;
        name: string;
    };
    messages: {
        id: string;
        mine: boolean;
        senderName: string;
        content: string;
        createdAt: string;
    }[];
};
export type FeedbackShare = {
    metric: string;
    count: number;
    pct: number;
};
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
    feedback: FeedbackShare[];
    viewings: {
        id: string;
        date: string;
        staffName: string;
        feedbackMetric: string | null;
        notes: string | null;
    }[];
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
        history: {
            month: string;
            status: PaymentState;
        }[];
    };
};
export type OwnerOverview = {
    user: SessionUser;
    units: OwnerUnit[];
    stats: {
        collectedThisMonth: number;
        available: number;
        overdue: number;
        month: string;
    };
    payments: {
        id: string;
        date: string;
        unitTitle: string;
        leaseReference: string;
        amount: number;
        status: PaymentState;
    }[];
    earnings: {
        months: {
            month: string;
            gross: number;
            fee: number;
            net: number;
        }[];
        ytdNet: number;
        feeRate: number;
    };
    pendingSignatures: {
        leaseId: string;
        reference: string;
        unitTitle: string;
        clientCode: string;
        monthlyRent: number;
        startDate: string;
        termMonths: number;
    }[];
    profile: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        nationalId: string;
        bankName: string;
        accountNumber: string;
        mfaEnabled: boolean;
    };
};
export type RegisterPropertyBody = {
    title: string;
    house: string;
    goalhi: string;
    district: string;
    propertyType: PropertyType;
    roomCount: number;
    monthlyRent: number;
};
export type BranchScope = 'all' | BranchName;
export type StaffOverview = {
    scope: BranchScope;
    queues: {
        pendingRegistrations: number;
        pendingApplications: number;
        viewingsToday: number;
        openMaintenance: number;
    };
    branches: {
        branch: BranchRef;
        properties: number;
        occupancy: number;
        avgRent: number;
    }[];
};
export type QueueItem = {
    id: string;
    kind: 'PROPERTY' | 'APPLICATION';
    reference: string;
    title: string;
    subtitle: string;
    branch: BranchRef;
    createdAt: string;
    fields: {
        label: string;
        value: string;
    }[];
    checks: string[];
};
export type StaffViewing = {
    id: string;
    date: string;
    status: string;
    client: {
        id: string;
        code: string;
    };
    property: {
        id: string;
        title: string;
    };
    staff: {
        id: string;
        name: string;
    } | null;
    feedbackMetric: string | null;
    notes: string | null;
};
export type StaffOptions = {
    clients: {
        id: string;
        code: string;
        name: string;
    }[];
    properties: {
        id: string;
        title: string;
        monthlyRent: number;
        status: string;
    }[];
    specialists: {
        id: string;
        name: string;
    }[];
    feedbackMetrics: string[];
};
export type MatchResult = {
    listings: {
        id: string;
        title: string;
        city: string;
        roomCount: number;
        monthlyRent: number;
    }[];
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
    property: {
        id: string;
        title: string;
    };
    client: {
        id: string;
        code: string;
    };
    monthlyRent: number;
    securityDeposit: number;
    startDate: string;
    expiryDate: string;
    renewalReminder: string;
    paymentMethod: string;
    clientSigned: boolean;
    ownerSigned: boolean;
    executingStaff: {
        code: string;
        name: string;
    } | null;
};
export type CreateLeaseBody = {
    propertyId: string;
    clientId: string;
    monthlyRent: number;
    securityDeposit: number;
    startDate: string;
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
    routedTo: {
        id: string;
        name: string;
    } | null;
};
export type BranchReport = {
    scope: BranchScope;
    month: string;
    figures: {
        listedUnits: number;
        occupancy: number;
        viewings: number;
        leasesExecuted: number;
        rentCollected: number;
    };
    occupancy: {
        branch: BranchRef;
        pct: number;
    }[];
    staff: {
        id: string;
        name: string;
        role: StaffRole;
        registrations: number;
        viewings: number;
        leases: number;
    }[];
};
export type StaffAccount = {
    id: string;
    code: string;
    name: string;
    email: string;
    role: StaffRole;
    branch: BranchRef | null;
    mfaEnabled: boolean;
};
export type AuditEntry = {
    id: string;
    createdAt: string;
    actor: {
        code: string;
        name: string;
    } | null;
    action: string;
    description: string;
    branch: string;
};
export declare const DISTRICTS: readonly ["Henveiru · Malé", "Machangolhi · Malé", "Maafannu · Malé", "Galolhu · Malé", "Phase 1 · Hulhumalé", "Phase 2 · Hulhumalé", "Villingili"];
export declare const FEEDBACK_METRICS: readonly ["None", "Financial constraint (\"Little expensive\")", "Location (\"Too far from work/school\")", "Size (\"Rooms too small\")", "Furnishing (\"Needs more furniture\")"];
export declare const MAINTENANCE_CATEGORIES: readonly ["Plumbing", "Electrical", "Air conditioning", "Furniture", "Other"];
export declare const QUEUE_CHECKS: {
    readonly PROPERTY: readonly ["Ownership documents verified", "Unit inspected and furnished", "Rent within area guidance"];
    readonly APPLICATION: readonly ["National ID verified", "Employment letter received", "Reference contacted"];
};
export declare const MANAGEMENT_FEE_RATE = 0.1;
