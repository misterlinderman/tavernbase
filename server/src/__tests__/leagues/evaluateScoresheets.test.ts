import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMatchFindById = vi.fn();
const mockScoresheetFind = vi.fn();
const mockRecomputeStandingsAfterMatch = vi.fn();

vi.mock('../../models', () => ({
  Match: {
    findById: (...args: unknown[]) => mockMatchFindById(...args),
  },
  Scoresheet: {
    find: (...args: unknown[]) => mockScoresheetFind(...args),
  },
}));

vi.mock('../../services/leagues/standings', () => ({
  recomputeStandingsAfterMatch: (...args: unknown[]) => mockRecomputeStandingsAfterMatch(...args),
}));

import { evaluateScoresheets } from '../../services/leagues/scoresheet';

interface MockScoresheet {
  submittedBy: 'home' | 'away';
  status: 'draft' | 'submitted' | 'approved' | 'disputed';
  payload: Record<string, unknown>;
  save: ReturnType<typeof vi.fn>;
}

interface MockMatch {
  _id: mongoose.Types.ObjectId;
  sport: 'pool';
  status: 'scheduled' | 'final' | 'cancelled';
  homeTeamId: mongoose.Types.ObjectId;
  awayTeamId: mongoose.Types.ObjectId;
  leagueId: mongoose.Types.ObjectId;
  divisionId: mongoose.Types.ObjectId;
  result?: {
    winnerTeamId?: mongoose.Types.ObjectId;
    homeScore: number;
    awayScore: number;
  };
  save: ReturnType<typeof vi.fn>;
}

function createSheet(overrides: Partial<MockScoresheet>): MockScoresheet {
  return {
    submittedBy: 'home',
    status: 'submitted',
    payload: { homeRaceWins: 5, awayRaceWins: 3 },
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createMatch(overrides: Partial<MockMatch> = {}): MockMatch {
  return {
    _id: new mongoose.Types.ObjectId(),
    sport: 'pool',
    status: 'scheduled',
    homeTeamId: new mongoose.Types.ObjectId(),
    awayTeamId: new mongoose.Types.ObjectId(),
    leagueId: new mongoose.Types.ObjectId(),
    divisionId: new mongoose.Types.ObjectId(),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('evaluateScoresheets (pool)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecomputeStandingsAfterMatch.mockResolvedValue(undefined);
  });

  it('returns pending when only one captain has submitted', async () => {
    const match = createMatch();
    const homeSheet = createSheet({ submittedBy: 'home', status: 'submitted' });

    mockMatchFindById.mockResolvedValue(match);
    mockScoresheetFind.mockResolvedValue([homeSheet]);

    const result = await evaluateScoresheets(match._id);

    expect(result).toBe('pending');
    expect(homeSheet.save).not.toHaveBeenCalled();
    expect(match.save).not.toHaveBeenCalled();
    expect(mockRecomputeStandingsAfterMatch).not.toHaveBeenCalled();
  });

  it('finalizes the match and recomputes standings when both captains submit matching scores', async () => {
    const match = createMatch();
    const payload = { homeRaceWins: 5, awayRaceWins: 3 };
    const homeSheet = createSheet({ submittedBy: 'home', status: 'submitted', payload });
    const awaySheet = createSheet({ submittedBy: 'away', status: 'submitted', payload });

    mockMatchFindById.mockResolvedValue(match);
    mockScoresheetFind.mockResolvedValue([homeSheet, awaySheet]);

    const result = await evaluateScoresheets(match._id);

    expect(result).toBe('final');
    expect(homeSheet.status).toBe('approved');
    expect(awaySheet.status).toBe('approved');
    expect(homeSheet.save).toHaveBeenCalledOnce();
    expect(awaySheet.save).toHaveBeenCalledOnce();
    expect(match.status).toBe('final');
    expect(match.result).toEqual({
      winnerTeamId: match.homeTeamId,
      homeScore: 5,
      awayScore: 3,
    });
    expect(match.save).toHaveBeenCalledOnce();
    expect(mockRecomputeStandingsAfterMatch).toHaveBeenCalledWith(
      match.leagueId,
      match.divisionId
    );
  });

  it('marks scoresheets disputed when captains submit mismatched scores', async () => {
    const match = createMatch();
    const homeSheet = createSheet({
      submittedBy: 'home',
      status: 'submitted',
      payload: { homeRaceWins: 5, awayRaceWins: 3 },
    });
    const awaySheet = createSheet({
      submittedBy: 'away',
      status: 'submitted',
      payload: { homeRaceWins: 4, awayRaceWins: 3 },
    });

    mockMatchFindById.mockResolvedValue(match);
    mockScoresheetFind.mockResolvedValue([homeSheet, awaySheet]);

    const result = await evaluateScoresheets(match._id);

    expect(result).toBe('disputed');
    expect(homeSheet.status).toBe('disputed');
    expect(awaySheet.status).toBe('disputed');
    expect(match.status).toBe('scheduled');
    expect(match.result).toBeUndefined();
    expect(match.save).not.toHaveBeenCalled();
    expect(mockRecomputeStandingsAfterMatch).not.toHaveBeenCalled();
  });
});
