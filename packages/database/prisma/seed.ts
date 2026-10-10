// Seed for Housing_4_Raajje. Every person, address and record here is fictional.
// The dataset is written as of 4 October 2026 and is idempotent: all tables are wiped first.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Local (Maldives time) date. Month is 1-based. */
const d = (y: number, m: number, day: number, h = 10, min = 0) => new Date(y, m - 1, day, h, min);

const ROLES = ['SYSTEM_ADMIN', 'BRANCH_MANAGER', 'PROPERTY_SPECIALIST', 'RECEPTIONIST', 'OWNER', 'CLIENT'] as const;
type Role = (typeof ROLES)[number];
type BranchName = 'Male' | 'Hulhumale' | 'Villingili';

const METRIC = {
  None: 'None',
  Financial: 'Financial constraint ("Little expensive")',
  Location: 'Location ("Too far from work/school")',
  Size: 'Size ("Rooms too small")',
  Furnishing: 'Furnishing ("Needs more furniture")'
} as const;
type MetricKey = keyof typeof METRIC;

const METRIC_NOTE: Record<MetricKey, string> = {
  None: 'No concerns raised.',
  Financial: 'Felt the rent was above their budget.',
  Location: 'Prefers somewhere closer to work.',
  Size: 'Rooms smaller than they need.',
  Furnishing: 'Would need more furniture before moving in.'
};

const BRANCH_LABEL: Record<BranchName, string> = { Male: 'Branch 1', Hulhumale: 'Branch 2', Villingili: 'Branch 3' };

async function wipe() {
  // Children before parents.
  await prisma.leaseSignature.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.ownerPayout.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.viewing.deleteMany();
  await prisma.application.deleteMany();
  await prisma.rejectionReason.deleteMany();
  await prisma.propertyNote.deleteMany();
  await prisma.propertyImage.deleteMany();
  await prisma.propertyStatusHistory.deleteMany();
  await prisma.property.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.ownerProfile.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.role.deleteMany();
}

async function main() {
  await wipe();

  const role: Record<string, string> = {};
  for (const name of ROLES) role[name] = (await prisma.role.create({ data: { name } })).id;

  const branch: Record<BranchName, string> = {
    Male: (await prisma.branch.create({ data: { name: 'Male', city: 'Malé' } })).id,
    Hulhumale: (await prisma.branch.create({ data: { name: 'Hulhumale', city: 'Hulhumalé' } })).id,
    Villingili: (await prisma.branch.create({ data: { name: 'Villingili', city: 'Villingili' } })).id
  };

  /* ---------- People ---------- */

  const users: Record<string, string> = {}; // code -> id
  const emailFor = (first: string, last: string) => `${first}.${last}@housing-4-raajje.test`.toLowerCase();

  async function createUser(u: {
    code: string;
    first: string;
    last: string;
    role: Role;
    branch?: BranchName;
    email?: string;
    phone?: string;
    mfa?: boolean;
    createdAt?: Date;
  }) {
    const row = await prisma.user.create({
      data: {
        code: u.code,
        email: u.email ?? emailFor(u.first, u.last),
        firstName: u.first,
        lastName: u.last,
        phone: u.phone,
        roleId: role[u.role],
        branchId: u.branch ? branch[u.branch] : null,
        mfaEnabled: u.mfa ?? false,
        status: 'ACTIVE',
        createdAt: u.createdAt
      }
    });
    users[u.code] = row.id;
    return row;
  }

  const staff: [string, string, string, Role, BranchName][] = [
    ['STF-001', 'Shiham', 'Ali', 'SYSTEM_ADMIN', 'Male'],
    ['STF-002', 'Hassan', 'Zameel', 'BRANCH_MANAGER', 'Male'],
    ['STF-007', 'Mariyam', 'Leena', 'RECEPTIONIST', 'Male'],
    ['STF-009', 'Aminath', 'Rasha', 'PROPERTY_SPECIALIST', 'Hulhumale'],
    ['STF-011', 'Ibrahim', 'Shafeeu', 'BRANCH_MANAGER', 'Hulhumale'],
    ['STF-014', 'Ahmed', 'Afzal', 'PROPERTY_SPECIALIST', 'Male'],
    ['STF-016', 'Mohamed', 'Muaz', 'PROPERTY_SPECIALIST', 'Male'],
    ['STF-019', 'Hussain', 'Nimal', 'PROPERTY_SPECIALIST', 'Villingili']
  ];
  const DEPARTMENT: Record<string, string> = {
    SYSTEM_ADMIN: 'System Admin',
    BRANCH_MANAGER: 'Branch Manager',
    PROPERTY_SPECIALIST: 'Property Specialist',
    RECEPTIONIST: 'Receptionist'
  };
  for (const [code, first, last, r, b] of staff) {
    const u = await createUser({ code, first, last, role: r, branch: b, mfa: true, createdAt: d(2025, 11, 1) });
    await prisma.staffProfile.create({ data: { userId: u.id, employeeCode: code, department: DEPARTMENT[r] } });
  }

  const owners: { code: string; first: string; last: string; phone: string; nationalId: string; bank: string; account: string; email?: string }[] = [
    { code: 'OWN-20418', first: 'Ibrahim', last: 'Hassan', phone: '777 4180', nationalId: 'A204183', bank: 'Bank of Maldives', account: '7730 0000 4182 001', email: 'owner@housing-4-raajje.test' },
    { code: 'OWN-20577', first: 'Hussain', last: 'Riyaz', phone: '778 2210', nationalId: 'A157702', bank: 'Bank of Maldives', account: '7730 0000 5771 002' },
    { code: 'OWN-20612', first: 'Aminath', last: 'Shaheema', phone: '793 4408', nationalId: 'A261209', bank: 'Maldives Islamic Bank', account: '9010 2261 2001' },
    { code: 'OWN-20390', first: 'Ali', last: 'Waheed', phone: '777 3390', nationalId: 'A093904', bank: 'Bank of Maldives', account: '7730 0000 3904 001' }
  ];
  for (const o of owners) {
    const u = await createUser({ code: o.code, first: o.first, last: o.last, role: 'OWNER', email: o.email, phone: o.phone, createdAt: d(2025, 11, 15) });
    await prisma.ownerProfile.create({
      data: { userId: u.id, nationalId: o.nationalId, bankName: o.bank, accountNumber: o.account, payoutMethod: 'Bank transfer' }
    });
  }

  const clients: {
    code: string;
    first: string;
    last: string;
    pref: BranchName;
    rooms: number;
    maxRent: number;
    sex: 'Female' | 'Male';
    dob?: Date;
    phone: string;
    email?: string;
  }[] = [
    { code: 'CL-3092', first: 'Aishath', last: 'Shifa', pref: 'Hulhumale', rooms: 2, maxRent: 15000, sex: 'Female', dob: d(1994, 6, 18, 0), phone: '791 2044', email: 'client@housing-4-raajje.test' },
    { code: 'CL-3096', first: 'Ismail', last: 'Faiz', pref: 'Hulhumale', rooms: 3, maxRent: 18000, sex: 'Male', phone: '765 3307' },
    { code: 'CL-3099', first: 'Shifza', last: 'Mohamed', pref: 'Male', rooms: 2, maxRent: 13000, sex: 'Female', phone: '797 2215' },
    { code: 'CL-3101', first: 'Ahmed', last: 'Naseer', pref: 'Male', rooms: 3, maxRent: 20000, sex: 'Male', phone: '773 5012' },
    { code: 'CL-3104', first: 'Zeena', last: 'Abdulla', pref: 'Hulhumale', rooms: 3, maxRent: 18500, sex: 'Female', phone: '790 4471' },
    { code: 'CL-3108', first: 'Fathimath', last: 'Nuha', pref: 'Male', rooms: 1, maxRent: 9500, sex: 'Female', dob: d(1997, 9, 3, 0), phone: '782 5531' },
    { code: 'CL-3110', first: 'Ali', last: 'Shareef', pref: 'Hulhumale', rooms: 2, maxRent: 14000, sex: 'Male', dob: d(1990, 2, 11, 0), phone: '760 1182' },
    { code: 'CL-3115', first: 'Mariyam', last: 'Saeed', pref: 'Villingili', rooms: 2, maxRent: 12000, sex: 'Female', phone: '795 8840' },
    { code: 'CL-3119', first: 'Hassan', last: 'Rasheed', pref: 'Male', rooms: 2, maxRent: 12000, sex: 'Male', phone: '778 9063' }
  ];
  for (const c of clients) {
    const u = await createUser({ code: c.code, first: c.first, last: c.last, role: 'CLIENT', email: c.email, phone: c.phone, createdAt: d(2026, 1, 5) });
    await prisma.clientProfile.create({
      data: { userId: u.id, preferredLocation: c.pref, roomCount: c.rooms, maxRent: c.maxRent, sex: c.sex, dateOfBirth: c.dob ?? null }
    });
  }

  /* ---------- Properties ---------- */

  const props: Record<string, string> = {}; // title -> id
  const propBranch: Record<string, BranchName> = {};
  const words = ['', 'One', 'Two', 'Three', 'Four', 'Five'];

  async function createProperty(p: {
    title: string;
    house: string;
    goalhi: string;
    district: string;
    type: 'Apartment' | 'Flat';
    rooms: number;
    rent: number;
    owner: string;
    status: 'AVAILABLE' | 'RENTED' | 'UNDER_MAINTENANCE' | 'PENDING_APPROVAL';
    approval?: 'APPROVED' | 'PENDING';
    createdAt: Date;
    reference?: string;
  }) {
    const b: BranchName = p.district.includes('Hulhumal') ? 'Hulhumale' : p.district.includes('Villingili') ? 'Villingili' : 'Male';
    const area = p.district.split(' · ')[0];
    const row = await prisma.property.create({
      data: {
        title: p.title,
        description: `${words[p.rooms]}-room ${p.type.toLowerCase()} on ${p.goalhi}, ${area === 'Villingili' ? 'Villingili' : area}.`,
        location: p.district,
        address: `${p.house}, ${p.goalhi}`,
        district: p.district,
        propertyType: p.type,
        reference: p.reference ?? null,
        roomCount: p.rooms,
        monthlyRent: p.rent,
        status: p.status,
        approvalStatus: p.approval ?? 'APPROVED',
        ownerId: users[p.owner],
        branchId: branch[b],
        createdAt: p.createdAt,
        history: { create: { status: p.status, reason: 'Seeded state', createdAt: p.createdAt } }
      }
    });
    props[p.title] = row.id;
    propBranch[p.title] = b;
    return row;
  }

  // Ibrahim Hassan (OWN-20418)
  await createProperty({ title: 'Sea Breeze 3B', house: 'Fehivinaresge', goalhi: 'Orchid Magu', district: 'Machangolhi · Malé', type: 'Apartment', rooms: 3, rent: 18500, owner: 'OWN-20418', status: 'AVAILABLE', createdAt: d(2026, 5, 20) });
  await createProperty({ title: 'Kanamana Residence 2A', house: 'Kanamana', goalhi: 'Nirolhu Magu', district: 'Phase 2 · Hulhumalé', type: 'Flat', rooms: 2, rent: 14000, owner: 'OWN-20418', status: 'RENTED', createdAt: d(2026, 1, 10) });
  await createProperty({ title: 'Villingili Vista G4', house: 'Fenfushige', goalhi: 'Bahaaru Higun', district: 'Villingili', type: 'Apartment', rooms: 4, rent: 22750, owner: 'OWN-20418', status: 'UNDER_MAINTENANCE', createdAt: d(2026, 4, 2) });
  await createProperty({ title: 'Coral Court 1C', house: 'Coralvilla', goalhi: 'Kaneeru Goalhi', district: 'Maafannu · Malé', type: 'Flat', rooms: 1, rent: 9800, owner: 'OWN-20418', status: 'RENTED', createdAt: d(2025, 12, 1) });

  // Ali Waheed (OWN-20390)
  await createProperty({ title: 'Nirolhu Heights 5A', house: 'Muraka', goalhi: 'Nirolhu Magu', district: 'Phase 2 · Hulhumalé', type: 'Apartment', rooms: 2, rent: 13200, owner: 'OWN-20390', status: 'AVAILABLE', createdAt: d(2026, 9, 18) });
  await createProperty({ title: 'Bahaaru View 2B', house: 'Reendhooge', goalhi: 'Bahaaru Higun', district: 'Villingili', type: 'Flat', rooms: 2, rent: 11500, owner: 'OWN-20390', status: 'AVAILABLE', createdAt: d(2026, 8, 22) });
  await createProperty({ title: 'Hiyaa Residence 7C', house: 'Hiyaage', goalhi: 'Ameenee Magu', district: 'Phase 1 · Hulhumalé', type: 'Flat', rooms: 3, rent: 16750, owner: 'OWN-20390', status: 'RENTED', createdAt: d(2026, 8, 5) });
  await createProperty({ title: 'Henveiru Loft 1A', house: 'Dhonbileege', goalhi: 'Majeedhee Magu', district: 'Henveiru · Malé', type: 'Flat', rooms: 1, rent: 8900, owner: 'OWN-20390', status: 'AVAILABLE', createdAt: d(2026, 9, 10) });
  await createProperty({ title: 'Sandbank 6F', house: 'Feyrumaage', goalhi: 'Hulhumeedhoo Goalhi', district: 'Phase 2 · Hulhumalé', type: 'Apartment', rooms: 4, rent: 21000, owner: 'OWN-20390', status: 'AVAILABLE', createdAt: d(2026, 9, 24) });
  await createProperty({ title: 'Galolhu Garden 2C', house: 'Hithigasdhoshuge', goalhi: 'Sosun Magu', district: 'Galolhu · Malé', type: 'Flat', rooms: 2, rent: 12800, owner: 'OWN-20390', status: 'AVAILABLE', createdAt: d(2026, 7, 14) });
  await createProperty({ title: 'Coral Point 8B', house: 'Kaneerumaage', goalhi: 'Nirolhu Magu', district: 'Phase 2 · Hulhumalé', type: 'Apartment', rooms: 3, rent: 17900, owner: 'OWN-20390', status: 'AVAILABLE', createdAt: d(2026, 9, 27) });
  await createProperty({ title: 'Maafannu Court 3A', house: 'Asurumaage', goalhi: 'Kaneeru Goalhi', district: 'Maafannu · Malé', type: 'Flat', rooms: 2, rent: 12500, owner: 'OWN-20390', status: 'RENTED', createdAt: d(2026, 6, 30) });
  await createProperty({ title: 'Lagoon View 1B', house: 'Hilaalige', goalhi: 'Dhanburu Goalhi', district: 'Villingili', type: 'Flat', rooms: 2, rent: 11800, owner: 'OWN-20390', status: 'RENTED', createdAt: d(2026, 7, 3) });

  // Pending registrations
  await createProperty({ title: 'Orchid Court 4D', house: 'Finivaage', goalhi: 'Orchid Magu', district: 'Machangolhi · Malé', type: 'Apartment', rooms: 4, rent: 24000, owner: 'OWN-20577', status: 'PENDING_APPROVAL', approval: 'PENDING', reference: 'APT-0331', createdAt: d(2026, 10, 2, 10, 20) });
  await createProperty({ title: 'Villingili Shore 3A', house: 'Asrafeege', goalhi: 'Fehi Higun', district: 'Villingili', type: 'Apartment', rooms: 3, rent: 14500, owner: 'OWN-20612', status: 'PENDING_APPROVAL', approval: 'PENDING', reference: 'APT-0332', createdAt: d(2026, 10, 1, 15, 5) });

  /* ---------- Applications ---------- */

  const apps: [string, string, number, string, 'PENDING' | 'APPROVED', Date][] = [
    ['CL-3092', 'Kanamana Residence 2A', 12, 'APP-0302', 'APPROVED', d(2026, 3, 2, 11, 30)],
    ['CL-3115', 'Lagoon View 1B', 12, 'APP-0395', 'APPROVED', d(2026, 9, 4, 9, 40)],
    ['CL-3096', 'Hiyaa Residence 7C', 12, 'APP-0401', 'APPROVED', d(2026, 9, 6, 13, 10)],
    ['CL-3099', 'Maafannu Court 3A', 12, 'APP-0409', 'APPROVED', d(2026, 9, 17, 10, 0)],
    ['CL-3108', 'Henveiru Loft 1A', 6, 'APP-0415', 'PENDING', d(2026, 9, 30, 16, 45)],
    ['CL-3104', 'Coral Point 8B', 12, 'APP-0417', 'APPROVED', d(2026, 10, 1, 11, 25)],
    ['CL-3110', 'Nirolhu Heights 5A', 12, 'APP-0418', 'PENDING', d(2026, 10, 2, 9, 5)]
  ];
  for (const [client, title, term, reference, status, createdAt] of apps) {
    await prisma.application.create({ data: { userId: users[client], propertyId: props[title], termMonths: term, reference, status, createdAt } });
  }

  /* ---------- Viewings ---------- */

  async function viewing(title: string, date: Date, client: string, staffCode: string | null, metric: MetricKey | null, notes?: string, status = 'ATTENDED') {
    await prisma.viewing.create({
      data: {
        propertyId: props[title],
        clientId: users[client],
        staffId: staffCode ? users[staffCode] : null,
        scheduledAt: date,
        status,
        feedbackMetric: metric ? METRIC[metric] : null,
        notes: notes ?? (metric ? METRIC_NOTE[metric] : null),
        createdAt: date
      }
    });
  }

  const rota = ['CL-3101', 'CL-3108', 'CL-3110', 'CL-3115', 'CL-3119', 'CL-3096', 'CL-3099', 'CL-3104'];

  // Sea Breeze 3B: 14 attended viewings, mostly price-related.
  await viewing('Sea Breeze 3B', d(2026, 9, 28, 11), 'CL-3101', 'STF-014', 'Financial', 'Liked the layout, asked whether rent is negotiable.');
  await viewing('Sea Breeze 3B', d(2026, 9, 21, 16), 'CL-3119', 'STF-016', 'None', 'Second viewing requested by client.');
  await viewing('Sea Breeze 3B', d(2026, 9, 14, 10), 'CL-3110', 'STF-014', 'Location', 'Works in Hulhumalé, commute too long.');
  const seaBreezeHistory: [Date, MetricKey, string][] = [
    [d(2026, 9, 7, 15), 'Financial', 'STF-016'],
    [d(2026, 9, 2, 11), 'Financial', 'STF-014'],
    [d(2026, 8, 24, 16), 'Size', 'STF-016'],
    [d(2026, 8, 16, 10), 'Financial', 'STF-014'],
    [d(2026, 8, 3, 14), 'Location', 'STF-014'],
    [d(2026, 7, 27, 11), 'Financial', 'STF-016'],
    [d(2026, 7, 19, 15), 'Furnishing', 'STF-014'],
    [d(2026, 7, 6, 10), 'Financial', 'STF-016'],
    [d(2026, 6, 28, 16), 'None', 'STF-014'],
    [d(2026, 6, 15, 11), 'Financial', 'STF-014'],
    [d(2026, 6, 7, 10), 'Location', 'STF-016']
  ];
  for (const [i, [date, metric, s]] of seaBreezeHistory.entries()) await viewing('Sea Breeze 3B', date, rota[i % rota.length], s, metric);
  // Scheduled for today.
  await viewing('Sea Breeze 3B', d(2026, 10, 4, 16), 'CL-3092', 'STF-016', null, 'Viewing confirmed with client.', 'SCHEDULED');

  // Kanamana Residence 2A: 9 viewings before it was let.
  const kanamana: [Date, MetricKey, string][] = [
    [d(2026, 2, 3, 10), 'Size', 'STF-009'],
    [d(2026, 2, 8, 15), 'Size', 'STF-009'],
    [d(2026, 2, 14, 11), 'Financial', 'STF-014'],
    [d(2026, 2, 19, 16), 'Size', 'STF-009'],
    [d(2026, 2, 24, 10), 'None', 'STF-014'],
    [d(2026, 3, 1, 14), 'Size', 'STF-009'],
    [d(2026, 3, 4, 11), 'Location', 'STF-009'],
    [d(2026, 3, 7, 15), 'Financial', 'STF-014']
  ];
  for (const [i, [date, metric, s]] of kanamana.entries()) await viewing('Kanamana Residence 2A', date, rota[i % rota.length], s, metric);
  await viewing('Kanamana Residence 2A', d(2026, 3, 9, 10), 'CL-3092', 'STF-014', 'None', 'Ready to apply.');

  // Villingili Vista G4: 6 viewings.
  const vista: [Date, MetricKey][] = [
    [d(2026, 5, 9, 10), 'Financial'],
    [d(2026, 6, 13, 11), 'Location'],
    [d(2026, 7, 11, 15), 'Financial'],
    [d(2026, 8, 8, 10), 'Location'],
    [d(2026, 9, 5, 14), 'Financial'],
    [d(2026, 9, 12, 11), 'Location']
  ];
  for (const [i, [date, metric]] of vista.entries()) await viewing('Villingili Vista G4', date, rota[(i + 3) % rota.length], 'STF-019', metric);

  // Coral Court 1C: 5 viewings before it was let.
  const coral: [Date, MetricKey, string][] = [
    [d(2025, 12, 6, 10), 'Size', 'STF-014'],
    [d(2025, 12, 13, 15), 'Financial', 'STF-016'],
    [d(2025, 12, 27, 11), 'Furnishing', 'STF-014'],
    [d(2026, 1, 10, 16), 'Size', 'STF-016']
  ];
  for (const [i, [date, metric, s]] of coral.entries()) await viewing('Coral Court 1C', date, rota[i % rota.length], s, metric);
  await viewing('Coral Court 1C', d(2026, 1, 17, 10), 'CL-3119', 'STF-014', 'None', 'Wants to move in on 1 February.');

  // Other September viewings.
  await viewing('Nirolhu Heights 5A', d(2026, 9, 25, 16), 'CL-3092', 'STF-016', 'None', 'Wants a second visit with family.');
  await viewing('Henveiru Loft 1A', d(2026, 9, 21, 11), 'CL-3119', 'STF-014', 'Size', 'Needs space for two.');
  await viewing('Bahaaru View 2B', d(2026, 9, 26, 10), 'CL-3092', 'STF-019', 'Financial', 'Asked about a longer term at a lower rent.');
  await viewing('Lagoon View 1B', d(2026, 9, 3, 15), 'CL-3115', 'STF-019', 'None', 'Ready to apply.');
  await viewing('Hiyaa Residence 7C', d(2026, 9, 5, 11), 'CL-3096', 'STF-009', 'None', 'Ready to apply.');
  await viewing('Coral Point 8B', d(2026, 9, 29, 10), 'CL-3104', 'STF-009', 'None', 'Will apply this week.');
  await viewing('Coral Point 8B', d(2026, 9, 30, 15), 'CL-3110', 'STF-009', 'Financial');
  await viewing('Sandbank 6F', d(2026, 9, 27, 11), 'CL-3101', 'STF-009', 'Financial');
  await viewing('Maafannu Court 3A', d(2026, 9, 16, 16), 'CL-3099', 'STF-016', 'None', 'Ready to apply.');
  await viewing('Galolhu Garden 2C', d(2026, 9, 19, 10), 'CL-3108', 'STF-016', 'Financial');

  /* ---------- Leases, signatures and payments ---------- */

  async function lease(l: {
    reference: string;
    title: string;
    owner: string;
    client: string;
    start: Date;
    term: number;
    rent: number;
    deposit: number;
    method: string;
    staff: string;
    clientSigned: Date;
    ownerSigned: Date;
    executed: Date;
    paid: [month: string, date: Date, method: string][];
  }) {
    const expiry = new Date(l.start);
    expiry.setMonth(expiry.getMonth() + l.term);
    expiry.setDate(expiry.getDate() - 1);
    const row = await prisma.lease.create({
      data: {
        reference: l.reference,
        propertyId: props[l.title],
        clientId: users[l.client],
        executingStaffId: users[l.staff],
        startDate: l.start,
        expiryDate: expiry,
        termMonths: l.term,
        monthlyRent: l.rent,
        advancePayment: l.rent,
        securityDeposit: l.deposit,
        paymentMethod: l.method,
        status: 'ACTIVE',
        clientSigned: true,
        ownerSigned: true,
        executedAt: l.executed,
        createdAt: new Date(l.clientSigned.getTime() - 2 * 86400000),
        signatures: {
          create: [
            { role: 'CLIENT', signerId: users[l.client], signedAt: l.clientSigned, status: 'SIGNED' },
            { role: 'OWNER', signerId: users[l.owner], signedAt: l.ownerSigned, status: 'SIGNED' }
          ]
        }
      }
    });
    for (const [month, date, method] of l.paid) {
      const fee = Math.round(l.rent * 0.1);
      await prisma.payment.create({
        data: {
          leaseId: row.id,
          userId: users[l.client],
          month,
          amount: l.rent,
          paymentMethod: method,
          paymentDate: date,
          status: 'PAID',
          managementFee: fee,
          ownerPayoutAmount: l.rent - fee,
          payoutPeriod: month,
          createdAt: date
        }
      });
    }
    return row;
  }

  await lease({
    reference: 'LSE-2026-0412',
    title: 'Kanamana Residence 2A',
    owner: 'OWN-20418',
    client: 'CL-3092',
    start: d(2026, 3, 15, 0),
    term: 12,
    rent: 14000,
    deposit: 9000,
    method: 'Bank deposit',
    staff: 'STF-014',
    clientSigned: d(2026, 3, 12, 14, 10),
    ownerSigned: d(2026, 3, 13, 9, 45),
    executed: d(2026, 3, 14, 11, 0),
    paid: [
      ['2026-03', d(2026, 3, 14, 11, 30), 'Bank deposit'],
      ['2026-04', d(2026, 4, 2, 10), 'Bank deposit'],
      ['2026-05', d(2026, 5, 3, 10), 'Bank deposit'],
      ['2026-06', d(2026, 6, 2, 10), 'Bank deposit'],
      ['2026-07', d(2026, 7, 2, 10), 'Bank deposit'],
      ['2026-08', d(2026, 8, 3, 9, 20), 'Online transfer'],
      ['2026-09', d(2026, 9, 3, 9, 15), 'Online transfer']
    ]
  });

  await lease({
    reference: 'LSE-2026-0107',
    title: 'Coral Court 1C',
    owner: 'OWN-20418',
    client: 'CL-3119',
    start: d(2026, 2, 1, 0),
    term: 12,
    rent: 9800,
    deposit: 9800,
    method: 'Bank deposit',
    staff: 'STF-014',
    clientSigned: d(2026, 1, 21, 15),
    ownerSigned: d(2026, 1, 22, 10),
    executed: d(2026, 1, 23, 11),
    paid: [
      ['2026-02', d(2026, 2, 3, 10), 'Bank deposit'],
      ['2026-03', d(2026, 3, 2, 10), 'Bank deposit'],
      ['2026-04', d(2026, 4, 3, 10), 'Bank deposit'],
      ['2026-06', d(2026, 6, 3, 10), 'Bank deposit'],
      ['2026-07', d(2026, 7, 2, 10), 'Bank deposit'],
      ['2026-08', d(2026, 8, 3, 10), 'Bank deposit']
    ]
  });

  await lease({
    reference: 'LSE-2026-0519',
    title: 'Lagoon View 1B',
    owner: 'OWN-20390',
    client: 'CL-3115',
    start: d(2026, 9, 15, 0),
    term: 12,
    rent: 11800,
    deposit: 11800,
    method: 'Cash at branch',
    staff: 'STF-019',
    clientSigned: d(2026, 9, 8, 11),
    ownerSigned: d(2026, 9, 8, 16),
    executed: d(2026, 9, 9, 10),
    paid: [['2026-09', d(2026, 9, 14, 12), 'Cash at branch']]
  });

  await lease({
    reference: 'LSE-2026-0528',
    title: 'Hiyaa Residence 7C',
    owner: 'OWN-20390',
    client: 'CL-3096',
    start: d(2026, 10, 1, 0),
    term: 12,
    rent: 16750,
    deposit: 16750,
    method: 'Online transfer',
    staff: 'STF-009',
    clientSigned: d(2026, 9, 10, 15),
    ownerSigned: d(2026, 9, 11, 10),
    executed: d(2026, 9, 12, 11),
    paid: []
  });

  await lease({
    reference: 'LSE-2026-0541',
    title: 'Maafannu Court 3A',
    owner: 'OWN-20390',
    client: 'CL-3099',
    start: d(2026, 10, 1, 0),
    term: 12,
    rent: 12500,
    deposit: 12500,
    method: 'Bank deposit',
    staff: 'STF-016',
    clientSigned: d(2026, 9, 22, 14),
    ownerSigned: d(2026, 9, 23, 10),
    executed: d(2026, 9, 24, 11),
    paid: []
  });

  /* ---------- Maintenance ---------- */

  await prisma.maintenanceRequest.create({
    data: {
      reference: 'MR-0218',
      category: 'Air conditioning',
      issue: 'Bedroom unit leaking',
      propertyId: props['Kanamana Residence 2A'],
      clientId: users['CL-3092'],
      ownerId: users['OWN-20418'],
      assignedStaffId: users['STF-009'],
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      createdAt: d(2026, 9, 22, 8, 40)
    }
  });
  await prisma.maintenanceRequest.create({
    data: {
      reference: 'MR-0194',
      category: 'Plumbing',
      issue: 'Kitchen tap loose',
      propertyId: props['Kanamana Residence 2A'],
      clientId: users['CL-3092'],
      ownerId: users['OWN-20418'],
      assignedStaffId: users['STF-009'],
      status: 'RESOLVED',
      priority: 'LOW',
      createdAt: d(2026, 8, 2, 19, 10),
      resolvedAt: d(2026, 8, 5, 12)
    }
  });

  /* ---------- Messages ---------- */

  async function message(threadKey: string, from: string, to: string, content: string, at: Date) {
    await prisma.message.create({ data: { senderId: users[from], recipientId: users[to], subject: threadKey, threadKey, content, createdAt: at } });
  }
  await message('Kanamana Residence 2A', 'OWN-20418', 'CL-3092', 'The AC service is booked for Thursday morning.', d(2026, 10, 4, 10, 2));
  await message('Kanamana Residence 2A', 'CL-3092', 'STF-014', 'Thank you. Will someone let them in?', d(2026, 10, 4, 10, 15));
  await message('Kanamana Residence 2A', 'STF-014', 'CL-3092', 'Yes, I will meet the technician at 9:00.', d(2026, 10, 4, 10, 21));
  await message('Sea Breeze 3B viewing', 'STF-016', 'CL-3092', 'Viewing confirmed for Saturday 4 Oct, 16:00.', d(2026, 10, 3, 15, 40));
  await message('Sea Breeze 3B viewing', 'CL-3092', 'STF-016', 'Is the third room furnished?', d(2026, 10, 3, 18, 5));
  await message('Bahaaru View 2B', 'STF-019', 'CL-3092', 'The owner can offer a 2-year term at MVR 11,000.', d(2026, 9, 28, 11, 30));

  /* ---------- Notifications ---------- */

  async function notification(code: string, type: string, title: string, body: string, channel: string, at: Date, isRead = false) {
    await prisma.notification.create({ data: { userId: users[code], type, title, body, channel, createdAt: at, isRead } });
  }
  await notification('CL-3092', 'RENT_DUE', 'Rent due', 'October rent of MVR 14,000 due on 5 Oct.', 'SMS', d(2026, 10, 1, 8, 30));
  await notification('CL-3092', 'MAINTENANCE', 'Maintenance update', 'Maintenance request MR-0218 received by owner.', 'Email', d(2026, 9, 22, 9, 5), true);
  await notification('CL-3092', 'PAYMENT', 'Payment received', 'Payment of MVR 14,000 received for September.', 'SMS + Email', d(2026, 9, 3, 9, 16), true);
  await notification('OWN-20418', 'MAINTENANCE', 'Maintenance request MR-0218', 'Air conditioning at Kanamana Residence 2A: Bedroom unit leaking.', 'Email', d(2026, 9, 22, 8, 41), true);
  await notification('OWN-20418', 'PAYMENT', 'Rent received', 'Rent of MVR 14,000 for Kanamana Residence 2A (September 2026) was received. Your payout is MVR 12,600.', 'Email', d(2026, 9, 3, 9, 16), true);
  await notification('CL-3119', 'RENT_DUE', 'Rent overdue', 'September rent of MVR 9,800 for Coral Court 1C is overdue.', 'SMS', d(2026, 9, 6, 8, 30));

  /* ---------- Inquiries ---------- */

  const inquiries: [string, string, string, string, BranchName, Date, string | null][] = [
    ['Ali Shareef', '760 1182', 'Two-room flats in Hulhumalé under MVR 14,000', 'Walk-in', 'Male', d(2026, 10, 4, 9, 15), null],
    ['Owner OWN-20612', '793 4408', 'Listing a second unit in Villingili', 'Phone', 'Villingili', d(2026, 10, 4, 8, 50), null],
    ['Nashwa Ibrahim', '771 0923', 'Viewing for Sea Breeze 3B this weekend', 'Web', 'Male', d(2026, 10, 3, 17, 20), null],
    ['Yoosuf Rameez', '748 6610', 'Lease renewal for Coral Court 1C', 'Phone', 'Male', d(2026, 10, 2, 14, 0), 'STF-014']
  ];
  for (const [name, phone, about, channel, b, createdAt, routed] of inquiries) {
    await prisma.inquiry.create({ data: { name, phone, about, channel, branchId: branch[b], createdAt, routedToId: routed ? users[routed] : null } });
  }

  /* ---------- Audit log ---------- */

  async function log(code: string | null, action: string, entity: string, description: string, branchLabel: string, at: Date, entityId: string | null = null) {
    await prisma.auditLog.create({
      data: { actorId: code ? users[code] : null, action, entity, entityId, metadata: JSON.stringify({ description, branch: branchLabel }), createdAt: at }
    });
  }

  // September registration approvals (registrations handled before this dataset's listings were entered).
  const approvals: [string, BranchName, number][] = [
    ['STF-014', 'Male', 6],
    ['STF-016', 'Male', 4],
    ['STF-009', 'Hulhumale', 5],
    ['STF-019', 'Villingili', 2]
  ];
  let ref = 314;
  for (const [code, b, count] of approvals) {
    for (let i = 0; i < count; i++) {
      const at = d(2026, 9, 2 + i * 5 + (ref % 3), 10 + (i % 5), 15);
      await log(code, 'property.approved', 'Property', `Approved property registration APT-0${ref}`, BRANCH_LABEL[b], at, `APT-0${ref}`);
      ref++;
    }
  }

  // Lease executions in the dataset.
  await log('STF-014', 'lease.activated', 'Lease', 'Executed lease LSE-2026-0107', 'Branch 1', d(2026, 1, 23, 11));
  await log('STF-014', 'lease.activated', 'Lease', 'Executed lease LSE-2026-0412', 'Branch 2', d(2026, 3, 14, 11));
  await log('STF-019', 'lease.activated', 'Lease', 'Executed lease LSE-2026-0519', 'Branch 3', d(2026, 9, 9, 10));
  await log('STF-009', 'lease.activated', 'Lease', 'Executed lease LSE-2026-0528', 'Branch 2', d(2026, 9, 12, 11));
  await log('STF-016', 'lease.activated', 'Lease', 'Executed lease LSE-2026-0541', 'Branch 1', d(2026, 9, 24, 11));

  await log(null, 'system.backup', 'System', 'Nightly database backup completed', 'All', d(2026, 10, 1, 2, 0));
  await log(null, 'notification.rent_due', 'Notification', 'Sent rent-due reminders by SMS', 'All', d(2026, 10, 1, 8, 30));
  await log('STF-007', 'inquiry.routed', 'Inquiry', 'Routed inquiry from Owner OWN-20577', 'Branch 1', d(2026, 10, 1, 14, 47));
  await log('STF-001', 'staff.role_changed', 'User', 'Changed role of STF-019 to Property Specialist', 'Branch 3', d(2026, 10, 2, 11, 3));
  await log('STF-002', 'report.exported', 'Report', 'Exported September branch report', 'Branch 1', d(2026, 10, 2, 16, 55));
  await log('STF-009', 'application.approved', 'Application', 'Approved client application CL-3104', 'Branch 2', d(2026, 10, 3, 9, 12));
  await log('STF-014', 'viewing.logged', 'Viewing', 'Logged viewing CL-3101 at Sea Breeze 3B', 'Branch 1', d(2026, 10, 3, 9, 41));

  const counts = {
    users: await prisma.user.count(),
    properties: await prisma.property.count(),
    viewings: await prisma.viewing.count(),
    leases: await prisma.lease.count(),
    payments: await prisma.payment.count(),
    audit: await prisma.auditLog.count()
  };
  console.log('Seed data loaded', counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
