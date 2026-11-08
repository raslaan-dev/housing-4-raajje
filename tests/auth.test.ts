import type { NextFunction, Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyToken } = vi.hoisted(() => ({ verifyToken: vi.fn() }));
vi.mock('@clerk/backend', () => ({ verifyToken }));

import { requireAuth } from '../apps/api/src/middleware/auth.js';
import { issueDemoSessionToken } from '../apps/api/src/lib/demo-session.js';

const originalNodeEnv = process.env.NODE_ENV;
const originalClerkSecretKey = process.env.CLERK_SECRET_KEY;
const originalStaffOtpSecret = process.env.STAFF_OTP_SECRET;

function invokeAuth(headers: Request['headers']) {
  const req = { headers } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;

  return { req, res, next, promise: requireAuth(req, res, next) };
}

describe('requireAuth', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CLERK_SECRET_KEY = 'test-secret';
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalClerkSecretKey === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = originalClerkSecretKey;
    if (originalStaffOtpSecret === undefined) delete process.env.STAFF_OTP_SECRET;
    else process.env.STAFF_OTP_SECRET = originalStaffOtpSecret;
  });

  it('rejects an invalid bearer token without falling back to caller identity headers', async () => {
    process.env.NODE_ENV = 'development';
    verifyToken.mockRejectedValue(new Error('Token verification failed'));
    const { req, res, next, promise } = invokeAuth({
      authorization: 'Bearer forged.token.value',
      'x-user-id': 'admin',
      'x-user-email': 'attacker@example.com',
      'x-user-role': 'SYSTEM_ADMIN'
    });

    await promise;

    expect(verifyToken).toHaveBeenCalledWith('forged.token.value', { secretKey: 'test-secret' });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(req.user).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });

  it('uses only claims from a verified Clerk token', async () => {
    process.env.NODE_ENV = 'production';
    verifyToken.mockResolvedValue({ sub: 'user_verified', email: 'verified@example.com', role: 'SYSTEM_ADMIN' });
    const { req, next, promise } = invokeAuth({ authorization: 'Bearer valid.token.value' });

    await promise;

    expect(req.user).toEqual({ id: 'user_verified', email: 'verified@example.com', role: 'CLIENT' });
    expect(next).toHaveBeenCalledOnce();
  });

  it('accepts identity headers only in explicit development mode', async () => {
    process.env.NODE_ENV = 'preview';
    const { req, res, next, promise } = invokeAuth({
      'x-user-id': 'demo-user',
      'x-user-email': 'demo@example.com',
      'x-user-role': 'CLIENT'
    });

    await promise;

    expect(res.status).toHaveBeenCalledWith(401);
    expect(req.user).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });

  it('retains development header authentication in explicit development mode', async () => {
    process.env.NODE_ENV = 'development';
    const { req, next, promise } = invokeAuth({
      'x-user-id': 'demo-user',
      'x-user-email': 'demo@example.com',
      'x-user-role': 'CLIENT'
    });

    await promise;

    expect(req.user).toEqual({ id: 'demo-user', email: 'demo@example.com', role: 'CLIENT', branchId: undefined });
    expect(next).toHaveBeenCalledOnce();
  });

  it('accepts signed preview demo sessions and rejects forged session tokens', async () => {
    process.env.NODE_ENV = 'preview';
    process.env.STAFF_OTP_SECRET = 'preview-demo-session-secret-with-at-least-32-characters';
    const token = issueDemoSessionToken({
      id: 'verified-staff',
      email: 'staff@example.com',
      role: { name: 'SYSTEM_ADMIN' },
      branchId: 'branch-1'
    });
    expect(token).toBeDefined();

    const valid = invokeAuth({ authorization: `Bearer ${token}` });
    await valid.promise;
    expect(valid.req.user).toEqual({
      id: 'verified-staff',
      email: 'staff@example.com',
      role: 'SYSTEM_ADMIN',
      branchId: 'branch-1'
    });
    expect(valid.next).toHaveBeenCalledOnce();

    const forged = invokeAuth({ authorization: `Bearer ${token}forged` });
    await forged.promise;
    expect(forged.res.status).toHaveBeenCalledWith(401);
    expect(forged.req.user).toBeUndefined();
    expect(forged.next).not.toHaveBeenCalled();
  });
});
