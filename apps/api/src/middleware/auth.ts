import type { NextFunction, Request, Response } from 'express';
import { createClerkClient } from '@clerk/backend';

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY ?? 'sk_test_fake_placeholder',
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? 'pk_test_fake_placeholder'
});

export type AppUser = {
  id: string;
  email: string;
  role?: string;
  branchId?: string | null;
};

export function getCurrentUserFromHeaders(req: Request): AppUser | null {
  const userId = req.headers['x-user-id'];
  const email = req.headers['x-user-email'];
  const role = req.headers['x-user-role'];

  if (typeof userId === 'string' && typeof email === 'string') {
    return {
      id: userId,
      email,
      role: typeof role === 'string' ? role : undefined,
      branchId: typeof req.headers['x-user-branch'] === 'string' ? req.headers['x-user-branch'] : undefined
    };
  }

  return null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const devUser = getCurrentUserFromHeaders(req);

  if (process.env.CLERK_SECRET_KEY && authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const clerkClient = clerk as any;
      const session = clerkClient.verifyToken ? await clerkClient.verifyToken({ token }) : null;

      if (session) {
        req.user = {
          id: String(session.sub ?? 'clerk-user'),
          email: session.email ?? 'clerk-user@example.com',
          role: 'CLIENT'
        };
        return next();
      }

      const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64').toString('utf8'));
      req.user = {
        id: String(payload.sub ?? 'clerk-user'),
        email: payload.email ?? 'clerk-user@example.com',
        role: payload.role ?? 'CLIENT'
      };
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid Clerk token.' });
    }
  }

  if (devUser) {
    req.user = devUser;
    return next();
  }

  return res.status(401).json({ message: 'Authentication required.' });
}
