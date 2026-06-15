import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTeamFind = vi.fn();
const mockMatchFind = vi.fn();

vi.mock('../../models', () => ({
  Team: {
    find: (...args: unknown[]) => mockTeamFind(...args),
  },
  Match: {
    find: (...args: unknown[]) => mockMatchFind(...args),
  },
}));

import { computePoolDivisionStandings } from '../../services/leagues/standings/PoolStandingsEngine';

function leanQuery<T>(result: T) {
  return {
    sort: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(result),
    }),
    lean: vi.fn().mockResolvedValue(result),
  };
}

describe('computePoolDivisionStandings', () => {
  const leagueId = new mongoose.Types.ObjectId();
  const divisionId = new mongoose.Types.ObjectId();

  const teamAlphaId = new mongoose.Types.ObjectId();
  const teamBetaId = new mongoose.Types.ObjectId();
  const teamCharlieId = new mongoose.Types.ObjectId();
  const teamDeltaId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();

    mockTeamFind.mockReturnValue(
      leanQuery([
        { _id: teamAlphaId, name: 'Alpha' },
        { _id: teamBetaId, name: 'Beta' },
        { _id: teamCharlieId, name: 'Charlie' },
        { _id: teamDeltaId, name: 'Delta' },
      ])
    );
  });

  it('ranks teams from partial round-robin final results', async () => {
    mockMatchFind.mockReturnValue(
      leanQuery([
        {
          homeTeamId: teamAlphaId,
          awayTeamId: teamBetaId,
          status: 'final',
          result: { homeScore: 5, awayScore: 3 },
        },
        {
          homeTeamId: teamCharlieId,
          awayTeamId: teamDeltaId,
          status: 'final',
          result: { homeScore: 4, awayScore: 2 },
        },
        {
          homeTeamId: teamAlphaId,
          awayTeamId: teamCharlieId,
          status: 'final',
          result: { homeScore: 3, awayScore: 3 },
        },
        {
          homeTeamId: teamBetaId,
          awayTeamId: teamDeltaId,
          status: 'final',
          result: { homeScore: 5, awayScore: 2 },
        },
      ])
    );

    const standings = await computePoolDivisionStandings(leagueId, divisionId);

    expect(standings).toHaveLength(4);
    expect(standings[0].teamName).toBe('Alpha');
    expect(standings[0].points).toBe(3);
    expect(standings[0].wins).toBe(1);
    expect(standings[0].ties).toBe(1);
    expect(standings[1].teamName).toBe('Charlie');
    expect(standings[1].points).toBe(3);
    expect(standings[2].teamName).toBe('Beta');
    expect(standings[2].points).toBe(2);
    expect(standings[3].teamName).toBe('Delta');
    expect(standings[3].points).toBe(0);
  });

  it('breaks ties by points, then wins, then fewer losses, then team name', async () => {
    mockTeamFind.mockReturnValue(
      leanQuery([
        { _id: teamAlphaId, name: 'Alpha' },
        { _id: teamBetaId, name: 'Beta' },
      ])
    );

    mockMatchFind.mockReturnValue(
      leanQuery([
        {
          homeTeamId: teamAlphaId,
          awayTeamId: teamBetaId,
          status: 'final',
          result: { homeScore: 5, awayScore: 3 },
        },
        {
          homeTeamId: teamBetaId,
          awayTeamId: teamAlphaId,
          status: 'final',
          result: { homeScore: 5, awayScore: 3 },
        },
      ])
    );

    const standings = await computePoolDivisionStandings(leagueId, divisionId);

    expect(standings).toHaveLength(2);
    expect(standings[0].teamName).toBe('Alpha');
    expect(standings[1].teamName).toBe('Beta');
    expect(standings[0].points).toBe(2);
    expect(standings[0].wins).toBe(1);
    expect(standings[0].losses).toBe(1);
    expect(standings[1].points).toBe(2);
    expect(standings[1].wins).toBe(1);
    expect(standings[1].losses).toBe(1);
  });
});
