import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateBracketPairings } from '../../services/leagues/schedule/bracket';
import {
  validateDartsScoresheetPayload,
  dartsScoresheetValidator,
} from '../../services/leagues/scoresheets/darts';

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

interface MockPlayerMatch {
  _id: mongoose.Types.ObjectId;
  sport: 'darts';
  status: 'scheduled' | 'final' | 'cancelled';
  homePlayerId: mongoose.Types.ObjectId;
  awayPlayerId: mongoose.Types.ObjectId;
  leagueId: mongoose.Types.ObjectId;
  divisionId: mongoose.Types.ObjectId;
  dartsFormat: '501';
  legsToWin: 2;
  isDoubles: false;
  result?: {
    winnerPlayerId?: mongoose.Types.ObjectId;
    homeScore: number;
    awayScore: number;
  };
  save: ReturnType<typeof vi.fn>;
}

function createSheet(overrides: Partial<MockScoresheet>): MockScoresheet {
  return {
    submittedBy: 'home',
    status: 'submitted',
    payload: { homeLegsWon: 2, awayLegsWon: 1 },
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createPlayerMatch(overrides: Partial<MockPlayerMatch> = {}): MockPlayerMatch {
  const homePlayerId = new mongoose.Types.ObjectId();
  const awayPlayerId = new mongoose.Types.ObjectId();

  return {
    _id: new mongoose.Types.ObjectId(),
    sport: 'darts',
    status: 'scheduled',
    homePlayerId,
    awayPlayerId,
    leagueId: new mongoose.Types.ObjectId(),
    divisionId: new mongoose.Types.ObjectId(),
    dartsFormat: '501',
    legsToWin: 2,
    isDoubles: false,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('darts 501 singles tournament', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecomputeStandingsAfterMatch.mockResolvedValue(undefined);
  });

  it('builds a seven-match bracket for eight players', () => {
    const playerIds = Array.from({ length: 8 }, (_, index) => `player-${index + 1}`);
    const pairings = generateBracketPairings(playerIds);

    expect(pairings).toHaveLength(7);
    expect(new Set(pairings.map((pairing) => pairing.roundNumber))).toEqual(new Set([1, 2, 3]));
    expect(pairings.filter((pairing) => pairing.roundNumber === 1)).toHaveLength(4);
    expect(pairings.filter((pairing) => pairing.roundNumber === 3)).toHaveLength(1);
  });

  it('finalizes a player match with winnerPlayerId from matching leg scores', () => {
    const match = createPlayerMatch();
    const payload = validateDartsScoresheetPayload({ homeLegsWon: 2, awayLegsWon: 1 });
    const result = dartsScoresheetValidator.toMatchResult(match, payload);

    expect(result.homeScore).toBe(2);
    expect(result.awayScore).toBe(1);
    expect(result.winnerPlayerId?.equals(match.homePlayerId)).toBe(true);
    expect(result.winnerTeamId).toBeUndefined();
  });

  it('finalizes when both players submit matching 501 leg scores', async () => {
    const match = createPlayerMatch();
    const homeSheet = createSheet({ submittedBy: 'home', status: 'submitted' });
    const awaySheet = createSheet({ submittedBy: 'away', status: 'submitted' });

    mockMatchFindById.mockResolvedValue(match);
    mockScoresheetFind.mockResolvedValue([homeSheet, awaySheet]);

    const resolution = await evaluateScoresheets(match._id);

    expect(resolution).toBe('final');
    expect(homeSheet.status).toBe('approved');
    expect(awaySheet.status).toBe('approved');
    expect(match.status).toBe('final');
    expect(match.result?.winnerPlayerId?.equals(match.homePlayerId)).toBe(true);
    expect(match.result?.homeScore).toBe(2);
    expect(match.result?.awayScore).toBe(1);
    expect(mockRecomputeStandingsAfterMatch).toHaveBeenCalledWith(match.leagueId, match.divisionId);
  });
});
