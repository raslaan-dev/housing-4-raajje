import type { ReviewFeedback } from '@housing/shared';
import { prisma } from './prisma.js';

/** Append an audit row. `branchLabel` is "Branch 1".."Branch 3" or "All". */
export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  description: string,
  branchLabel: string
) {
  await prisma.auditLog.create({
    data: { actorId, action, entity, entityId, metadata: JSON.stringify({ description, branch: branchLabel }) }
  });
}

export function parseAuditMetadata(metadata: string | null): { description: string; branch: string } {
  if (!metadata) return { description: '', branch: 'All' };
  try {
    const parsed = JSON.parse(metadata) as { description?: unknown; branch?: unknown; message?: unknown };
    return {
      description: String(parsed.description ?? parsed.message ?? ''),
      branch: String(parsed.branch ?? 'All')
    };
  } catch {
    return { description: metadata, branch: 'All' };
  }
}

export function parseReviewFeedback(raw: string | null): ReviewFeedback | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ReviewFeedback>;
    return {
      passed: Array.isArray(parsed.passed) ? parsed.passed.map(String) : [],
      missing: Array.isArray(parsed.missing) ? parsed.missing.map(String) : [],
      returnedAt: String(parsed.returnedAt ?? '')
    };
  } catch {
    return null;
  }
}
