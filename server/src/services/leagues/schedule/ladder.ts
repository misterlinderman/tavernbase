export interface SchedulePairing {
  roundNumber: number;
  homeTeamId: string;
  awayTeamId: string;
}

/**
 * Ladder-style mirror pairings: each round rotates the ordered list, then pairs
 * top vs bottom rungs (with byes when team count is odd).
 */
export function generateLadderPairings(teamIds: string[]): SchedulePairing[] {
  if (teamIds.length < 2) {
    return [];
  }

  const pairings: SchedulePairing[] = [];
  const rounds = teamIds.length - 1;

  for (let round = 1; round <= rounds; round += 1) {
    const offset = (round - 1) % teamIds.length;
    const rotated = [...teamIds.slice(offset), ...teamIds.slice(0, offset)];
    const matchCount = Math.floor(rotated.length / 2);

    for (let index = 0; index < matchCount; index += 1) {
      const top = rotated[index];
      const bottom = rotated[rotated.length - 1 - index];

      if (top === bottom) {
        continue;
      }

      pairings.push({
        roundNumber: round,
        homeTeamId: bottom,
        awayTeamId: top,
      });
    }
  }

  return pairings;
}
