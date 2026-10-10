import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export const notFound = (what = 'Record') => new HttpError(404, `${what} not found.`);

/** Express 4 does not forward rejected promises; route them to the error middleware. */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const path = issue?.path.join('.') ?? '';
    return res.status(400).json({ message: path ? `${path}: ${issue.message}` : (issue?.message ?? 'Invalid input.') });
  }
  if (err && typeof err === 'object' && (err as { type?: string }).type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON body.' });
  }
  console.error(err);
  return res.status(500).json({ message: 'Internal server error.' });
}

/** Route params are typed string | string[] by @types/express 5; normalise to a string. */
export function param(req: Request, name: string): string {
  const v = (req.params as Record<string, string | string[] | undefined>)[name];
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}
