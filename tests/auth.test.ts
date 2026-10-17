import type { NextFunction, Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyToken } = vi.hoisted(() => ({ verifyToken: vi.fn() }));
vi.mock('@clerk/backend', () => ({ verifyToken }));

import { requireAuth } from '../apps/api/src/middleware/auth.js';

const originalNodeEnv = process.env.NODE_ENV;
const originalClerkSecretKey = process.env.CLERK_SECRET_KEY;

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
});
