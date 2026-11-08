import type { Branch, Property, PropertyImage, Role, User } from '@prisma/client';
import type { BranchName, BranchRef, Listing, ListingImage, PropertyType, RoleName, SessionUser, StaffRole } from '@housing/shared';

const BRANCH_META: Record<BranchName, { city: string; number: 1 | 2 | 3 }> = {
  Male: { city: 'Malé', number: 1 },
  Hulhumale: { city: 'Hulhumalé', number: 2 },
  Villingili: { city: 'Villingili', number: 3 }
};

const MALDIVES_LISTING_IMAGES: ListingImage[] = [
  {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c4/Apartment_Blocks_-_Hulhumale_-_Maldives_%2814111148798%29.jpg/1280px-Apartment_Blocks_-_Hulhumale_-_Maldives_%2814111148798%29.jpg',
    caption: 'Representative Maldives apartment photography · Apartment blocks, Hulhumalé',
    credit: 'Adam Jones / Wikimedia Commons · CC BY-SA 2.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Apartment_Blocks_-_Hulhumale_-_Maldives_(14111148798).jpg'
  },
  {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Detail_of_Apartment_Blocks_-_Hulhumale_-_Maldives_%2814295828132%29.jpg/1280px-Detail_of_Apartment_Blocks_-_Hulhumale_-_Maldives_%2814295828132%29.jpg',
    caption: 'Representative Maldives apartment photography · Apartment detail, Hulhumalé',
    credit: 'Adam Jones / Wikimedia Commons · CC BY-SA 2.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Detail_of_Apartment_Blocks_-_Hulhumale_-_Maldives_(14295828132).jpg'
  },
  {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/Architecture_-_Hulhumale_-_Maldives_%2814295830842%29.jpg/1280px-Architecture_-_Hulhumale_-_Maldives_%2814295830842%29.jpg',
    caption: 'Representative Maldives apartment photography · Architecture, Hulhumalé',
    credit: 'Adam Jones / Wikimedia Commons · CC BY-SA 2.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Architecture_-_Hulhumale_-_Maldives_(14295830842).jpg'
  }
];

function listingImages(images: PropertyImage[] | undefined): ListingImage[] {
  if (!images?.length) return MALDIVES_LISTING_IMAGES;

  return images.map((image) => {
    const knownImage = MALDIVES_LISTING_IMAGES.find((photo) => photo.url === image.url);
    return knownImage
      ? { ...knownImage, caption: image.caption ?? knownImage.caption }
      : {
          url: image.url,
          caption: image.caption ?? 'Property photo',
          credit: 'Image provided with this listing',
          sourceUrl: image.url
        };
  });
}

export const STAFF_ROLES: StaffRole[] = ['SYSTEM_ADMIN', 'BRANCH_MANAGER', 'PROPERTY_SPECIALIST', 'RECEPTIONIST'];

export function isBranchName(value: unknown): value is BranchName {
  return value === 'Male' || value === 'Hulhumale' || value === 'Villingili';
}

export function branchCity(name: string): string {
  return isBranchName(name) ? BRANCH_META[name].city : name;
}

/** Map a display city (Malé / Hulhumalé / Villingili, accents optional) or stored name to the branch name. */
export function cityToBranch(city: string): BranchName | null {
  const c = city
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (c === 'male') return 'Male';
  if (c === 'hulhumale') return 'Hulhumale';
  if (c === 'villingili') return 'Villingili';
  return null;
}

/** Branch for a DISTRICTS value: contains 'Hulhumal' → Hulhumale, 'Villingili' → Villingili, else Male. */
export function districtToBranch(district: string): BranchName {
  if (district.includes('Hulhumal')) return 'Hulhumale';
  if (district.includes('Villingili')) return 'Villingili';
  return 'Male';
}

export function toBranchRef(branch: Pick<Branch, 'id' | 'name'>): BranchRef {
  const name: BranchName = isBranchName(branch.name) ? branch.name : 'Male';
  return { id: branch.id, name, city: BRANCH_META[name].city, number: BRANCH_META[name].number };
}

/** "Branch 1 · Malé" */
export function branchDisplay(branch: Pick<Branch, 'id' | 'name'>): string {
  const ref = toBranchRef(branch);
  return `Branch ${ref.number} · ${ref.city}`;
}

/** "Branch 1" — the label stored in audit metadata. */
export function branchLabel(branch: Pick<Branch, 'id' | 'name'> | null | undefined): string {
  return branch ? `Branch ${toBranchRef(branch).number}` : 'All';
}

export function fullName(user: Pick<User, 'firstName' | 'lastName' | 'email'>): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email;
}

export type UserWithRole = User & { role: Role | null; branch: Branch | null };

export const userInclude = { role: true, branch: true } as const;

export function toSessionUser(user: UserWithRole): SessionUser {
  return {
    id: user.id,
    code: user.code ?? '',
    email: user.email,
    name: fullName(user),
    role: (user.role?.name ?? 'CLIENT') as RoleName,
    branch: user.branch ? toBranchRef(user.branch) : null,
    mfaEnabled: user.mfaEnabled
  };
}

export function asPropertyType(value: string): PropertyType {
  return value === 'Flat' ? 'Flat' : 'Apartment';
}

export function asStaffRole(value: string | null | undefined): StaffRole {
  return (STAFF_ROLES as string[]).includes(value ?? '') ? (value as StaffRole) : 'RECEPTIONIST';
}

export function toListing(p: Property & { branch: Branch; images?: PropertyImage[] }): Listing {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    address: p.address ?? '',
    district: p.district ?? p.location,
    city: branchCity(p.branch.name),
    images: listingImages(p.images),
    branch: toBranchRef(p.branch),
    propertyType: asPropertyType(p.propertyType),
    roomCount: p.roomCount,
    monthlyRent: p.monthlyRent,
    status: p.status,
    approvalStatus: p.approvalStatus,
    createdAt: p.createdAt.toISOString()
  };
}
