import { describe, expect, it } from 'vitest';
import { calculateLeaseExpiry, isLeaseReadyForActivation, matchesRentPreference } from '../packages/shared/src/index.ts';

describe('lease and rent rules', () => {
  it('calculates expiry after a fixed tenure', () => {
    const start = new Date('2026-01-15T00:00:00.000Z');
    const expiry = calculateLeaseExpiry(start, 12);

    expect(expiry.getUTCMonth()).toBe(0);
    expect(expiry.getUTCFullYear()).toBe(2027);
  });

  it('allows activation only after both signatures are present', () => {
    expect(isLeaseReadyForActivation({ ownerSigned: true, clientSigned: true })).toBe(true);
    expect(isLeaseReadyForActivation({ ownerSigned: true, clientSigned: false })).toBe(false);
  });

  it('respects maximum rent preference', () => {
    expect(matchesRentPreference(18000, 20000)).toBe(true);
    expect(matchesRentPreference(22000, 20000)).toBe(false);
  });
});
