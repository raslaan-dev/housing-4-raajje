import { describe, expect, it } from 'vitest';
import { findMatchingProperties } from '../apps/api/src/services/matching.js';

describe('matching logic', () => {
  it('matches a property when rent and location are within the client preference', () => {
    const properties = [
      { id: '1', location: 'Male', monthlyRent: 18000, branchName: 'Male', roomCount: 2 },
      { id: '2', location: 'Hulhumale', monthlyRent: 22000, branchName: 'Hulhumale', roomCount: 3 }
    ];

    const matches = findMatchingProperties(properties, { preferredLocation: 'Male', maxRent: 20000, roomCount: 2 });

    expect(matches).toHaveLength(1);
    expect(matches[0].reason).toContain('location = Male');
  });

  it('excludes properties outside the maximum rent preference', () => {
    const properties = [{ id: '1', location: 'Male', monthlyRent: 25000, branchName: 'Male', roomCount: 2 }];
    const matches = findMatchingProperties(properties, { preferredLocation: 'Male', maxRent: 20000, roomCount: 2 });

    expect(matches).toHaveLength(0);
  });
});
