import type { Request } from 'express';
import type { BranchScope } from '@housing/shared';
import { prisma } from './prisma.js';
import { HttpError } from './http.js';
import { isBranchName } from './serialize.js';

export type ResolvedScope = {
  scope: BranchScope;
  /** null means every branch (system admin with scope "all"). */
  branchId: string | null;
  /** Prisma where fragment for models with a branchId column. */
  where: { branchId?: string };
};

/**
 * SYSTEM_ADMIN may pick ?branch=all|Male|Hulhumale|Villingili (default all).
 * Every other staff role is pinned to the branch stored on their user row; the x-user-branch header is ignored.
 */
export async function resolveScope(req: Request): Promise<ResolvedScope> {
  if (!req.user) throw new HttpError(401, 'Authentication required.');

  if (req.user.role === 'SYSTEM_ADMIN') {
    const requested = typeof req.query.branch === 'string' ? req.query.branch : 'all';
    if (requested === 'all' || requested === '') return { scope: 'all', branchId: null, where: {} };
    if (!isBranchName(requested)) throw new HttpError(400, 'branch must be all, Male, Hulhumale or Villingili.');
    const branch = await prisma.branch.findUnique({ where: { name: requested } });
    if (!branch) throw new HttpError(404, 'Branch not found.');
    return { scope: requested, branchId: branch.id, where: { branchId: branch.id } };
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { branch: true } });
  if (!user?.branch || !isBranchName(user.branch.name)) throw new HttpError(403, 'Your account is not assigned to a branch.');
  return { scope: user.branch.name, branchId: user.branch.id, where: { branchId: user.branch.id } };
}

/** Throws 403 when a branch-bound staff member touches a record outside their branch. */
export function assertInScope(scope: ResolvedScope, branchId: string) {
  if (scope.branchId && scope.branchId !== branchId) throw new HttpError(403, 'This record belongs to another branch.');
}
