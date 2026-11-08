import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { HttpError } from './http.js';

const SESSION_LIFETIME_SECONDS = 8 * 60 * 60;
const STAFF_ROLES = ['SYSTEM_ADMIN', 'BRANCH_MANAGER', 'PROPERTY_SPECIALIST', 'RECEPTIONIST'];
const ALL_ROLES = [...STAFF_ROLES, 'CLIENT', 'OWNER'];

type DemoSessionPayload = {
  sub: string;
  email: string;
  role: string;
  branchId: string | null;
  exp: number;
  jti: string;
};

type DemoSessionUser = {
  id: string;
  email: string;
  role: { name: string } | null;
  branchId: string | null;
};

function signingSecret() {
  const secret = process.env.STAFF_OTP_SECRET;
  if (!secret || secret.length < 32) throw new HttpError(503, 'Preview sign-in is not configured.');
  return secret;
}

function signature(input: string) {
  return createHmac('sha256', signingSecret()).update(input).digest('base64url');
}

export function issueDemoSessionToken(user: DemoSessionUser): string | undefined {
  if (process.env.NODE_ENV !== 'preview') return undefined;
  const payload: DemoSessionPayload = {
    sub: user.id,
    email: user.email,
    role: user.role?.name ?? 'CLIENT',
    branchId: user.branchId,
    exp: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
    jti: randomUUID()
  };
  if (!ALL_ROLES.includes(payload.role)) throw new HttpError(403, 'Account role is not supported.');

  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const input = `h4rdemo.${encoded}`;
  return `${input}.${signature(input)}`;
}

export function verifyDemoSessionToken(token: string): DemoSessionPayload | null {
  if (process.env.NODE_ENV !== 'preview') return null;
  const [prefix, encoded, suppliedSignature, ...rest] = token.split('.');
  if (prefix !== 'h4rdemo' || !encoded || !suppliedSignature || rest.length > 0) return null;

  let expected: Buffer;
  let supplied: Buffer;
  try {
    expected = Buffer.from(signature(`${prefix}.${encoded}`), 'base64url');
    supplied = Buffer.from(suppliedSignature, 'base64url');
  } catch {
    return null;
  }
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<DemoSessionPayload>;
    if (
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      typeof payload.email !== 'string' ||
      !payload.email ||
      typeof payload.role !== 'string' ||
      !ALL_ROLES.includes(payload.role) ||
      (payload.branchId !== null && typeof payload.branchId !== 'string') ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Math.floor(Date.now() / 1000) ||
      typeof payload.jti !== 'string' ||
      !payload.jti
    ) {
      return null;
    }
    return payload as DemoSessionPayload;
  } catch {
    return null;
  }
}
