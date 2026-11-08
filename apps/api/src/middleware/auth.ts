import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '@clerk/backend';
import { verifyDemoSessionToken } from '../lib/demo-session.js';

export type AppUser = {
  id: string;
  email?: string;
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

  if (authHeader !== undefined) {
    const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
    if (!match) return res.status(401).json({ message: 'Invalid authentication credentials.' });

    if (match[1].startsWith('h4rdemo.')) {
      const demoSession = verifyDemoSessionToken(match[1]);
      if (!demoSession) return res.status(401).json({ message: 'Invalid or expired session.' });
      req.user = {
        id: demoSession.sub,
        email: demoSession.email,
        role: demoSession.role,
        branchId: demoSession.branchId
      };
      return next();
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) return res.status(401).json({ message: 'Invalid authentication credentials.' });

    try {
      const verifiedToken = await verifyToken(match[1], { secretKey });
      if (typeof verifiedToken.sub !== 'string' || verifiedToken.sub.length === 0) {
        return res.status(401).json({ message: 'Invalid Clerk token.' });
      }

      req.user = {
        id: verifiedToken.sub,
        ...(typeof verifiedToken.email === 'string' ? { email: verifiedToken.email } : {}),
        role: 'CLIENT'
      };
      return next();
    } catch {
      return res.status(401).json({ message: 'Invalid Clerk token.' });
    }
  }

  if (process.env.NODE_ENV === 'development') {
    const devUser = getCurrentUserFromHeaders(req);
    if (devUser) {
      req.user = devUser;
      return next();
    }
  }

  return res.status(401).json({ message: 'Authentication required.' });
}
