import type { BranchName } from '@housing/shared';

export type MatchProperty = {
  id: string;
  location: string;
  monthlyRent: number;
  branchName?: string;
  roomCount?: number;
};

export function findMatchingProperties(
  properties: MatchProperty[],
  client: { preferredLocation?: string; maxRent: number; roomCount?: number },
  branchFilter?: BranchName
) {
  return properties.filter((property) => {
    const matchesLocation = !client.preferredLocation || property.location.toLowerCase().includes(client.preferredLocation.toLowerCase());
    const matchesRent = property.monthlyRent <= client.maxRent;
    const matchesRoom = !client.roomCount || !property.roomCount || property.roomCount >= client.roomCount;
    const matchesBranch = !branchFilter || property.branchName === branchFilter;

    return matchesLocation && matchesRent && matchesRoom && matchesBranch;
  }).map((property) => ({
    ...property,
    reason: `Matched because location = ${property.location} and monthly rent = MVR ${property.monthlyRent} <= client maximum MVR ${client.maxRent}.`
  }));
}
