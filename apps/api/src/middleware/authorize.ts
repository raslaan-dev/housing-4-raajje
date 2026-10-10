import type { NextFunction, Request, Response } from 'express';

export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const currentRole = req.user?.role ?? 'CLIENT';

    if (allowedRoles.includes(currentRole)) {
      return next();
    }

    return res.status(403).json({ message: 'Forbidden: insufficient permissions.' });
  };
}
