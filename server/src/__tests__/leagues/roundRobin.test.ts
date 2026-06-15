import { describe, expect, it } from 'vitest';
import { generateRoundRobinPairings } from '../../services/leagues/schedule/roundRobin';

function pairKey(homeTeamId: string, awayTeamId: string): string {
  return [homeTeamId, awayTeamId].sort().join('|');
}

describe('generateRoundRobinPairings', () => {
  it('returns 6 pairings for 4 teams with each team playing every other team once', () => {
    const teamIds = ['team-a', 'team-b', 'team-c', 'team-d'];
    const pairings = generateRoundRobinPairings(teamIds);

    expect(pairings).toHaveLength(6);

    const uniquePairs = new Set(
      pairings.map((pairing) => pairKey(pairing.homeTeamId, pairing.awayTeamId))
    );

    expect(uniquePairs.size).toBe(6);

    for (const teamId of teamIds) {
      const appearances = pairings.filter(
        (pairing) => pairing.homeTeamId === teamId || pairing.awayTeamId === teamId
      ).length;

      expect(appearances).toBe(3);
    }

    const roundNumbers = new Set(pairings.map((pairing) => pairing.roundNumber));
    expect(roundNumbers.size).toBeGreaterThanOrEqual(3);
  });

  it('returns empty array when fewer than two teams', () => {
    expect(generateRoundRobinPairings([])).toEqual([]);
    expect(generateRoundRobinPairings(['solo'])).toEqual([]);
  });
});
