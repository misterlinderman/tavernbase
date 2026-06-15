import { describe, expect, it, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import {
  computeBracketPlacements,
  computeTournamentPlacement,
} from '../../services/leagues/standings/TournamentPlacementEngine';

const mockDivisionFindOne = vi.fn();
const mockMatchFind = vi.fn();
const mockPlayerFind = vi.fn();
const mockTeamFind = vi.fn();

vi.mock('../../models', () => ({
  Division: {
    findOne: (...args: unknown[]) => mockDivisionFindOne(...args),
  },
  Match: {
    find: (...args: unknown[]) => mockMatchFind(...args),
  },
  Player: {
    find: (...args: unknown[]) => mockPlayerFind(...args),
  },
  Team: {
    find: (...args: unknown[]) => mockTeamFind(...args),
  },
}));

function leanQuery<T>(result: T) {
  return {
    sort: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(result),
    }),
    lean: vi.fn().mockResolvedValue(result),
  };
}

describe('TournamentPlacementEngine', () => {
  const leagueId = new mongoose.Types.ObjectId();
  const divisionId = new mongoose.Types.ObjectId();

  const players = Array.from({ length: 8 }, () => ({
    _id: new mongoose.Types.ObjectId(),
    name: '',
  }));

  players.forEach((player, index) => {
    player.name = `Player ${index + 1}`;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assigns placements 1–8 from a completed eight-player bracket', () => {
    const [p1, p2, p3, p4, p5, p6, p7, p8] = players.map((player) => player._id);
    const baseTime = new Date('2026-06-15T19:00:00Z').getTime();

    const matches = [
      {
        roundNumber: 1,
        scheduledAt: new Date(baseTime),
        homePlayerId: p1,
        awayPlayerId: p8,
        result: { winnerPlayerId: p1, homeScore: 2, awayScore: 0 },
      },
      {
        roundNumber: 1,
        scheduledAt: new Date(baseTime + 3_600_000),
        homePlayerId: p4,
        awayPlayerId: p5,
        result: { winnerPlayerId: p4, homeScore: 2, awayScore: 1 },
      },
      {
        roundNumber: 1,
        scheduledAt: new Date(baseTime + 7_200_000),
        homePlayerId: p2,
        awayPlayerId: p7,
        result: { winnerPlayerId: p2, homeScore: 2, awayScore: 0 },
      },
      {
        roundNumber: 1,
        scheduledAt: new Date(baseTime + 10_800_000),
        homePlayerId: p3,
        awayPlayerId: p6,
        result: { winnerPlayerId: p3, homeScore: 2, awayScore: 1 },
      },
      {
        roundNumber: 2,
        scheduledAt: new Date(baseTime + 86_400_000),
        homePlayerId: p1,
        awayPlayerId: p4,
        result: { winnerPlayerId: p1, homeScore: 2, awayScore: 0 },
      },
      {
        roundNumber: 2,
        scheduledAt: new Date(baseTime + 90_000_000),
        homePlayerId: p2,
        awayPlayerId: p3,
        result: { winnerPlayerId: p2, homeScore: 2, awayScore: 1 },
      },
      {
        roundNumber: 3,
        scheduledAt: new Date(baseTime + 172_800_000),
        homePlayerId: p1,
        awayPlayerId: p2,
        result: { winnerPlayerId: p1, homeScore: 2, awayScore: 1 },
      },
    ];

    const placements = computeBracketPlacements(matches);

    expect(placements.get(String(p1))).toBe(1);
    expect(placements.get(String(p2))).toBe(2);
    expect(placements.get(String(p4))).toBe(3);
    expect(placements.get(String(p3))).toBe(4);
    expect(placements.get(String(p8))).toBe(5);
    expect(placements.get(String(p5))).toBe(6);
    expect(placements.get(String(p7))).toBe(7);
    expect(placements.get(String(p6))).toBe(8);
  });

  it('returns sorted placement entries for player divisions', async () => {
    const playerIds = players.map((player) => player._id);

    mockDivisionFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ playerIds }),
    });

    mockMatchFind.mockReturnValue(
      leanQuery([
        {
          roundNumber: 1,
          scheduledAt: new Date('2026-06-15T19:00:00Z'),
          homePlayerId: playerIds[0],
          awayPlayerId: playerIds[7],
          status: 'final',
          result: { winnerPlayerId: playerIds[0], homeScore: 2, awayScore: 0 },
        },
        {
          roundNumber: 1,
          scheduledAt: new Date('2026-06-15T20:00:00Z'),
          homePlayerId: playerIds[3],
          awayPlayerId: playerIds[4],
          status: 'final',
          result: { winnerPlayerId: playerIds[3], homeScore: 2, awayScore: 1 },
        },
        {
          roundNumber: 1,
          scheduledAt: new Date('2026-06-15T21:00:00Z'),
          homePlayerId: playerIds[1],
          awayPlayerId: playerIds[6],
          status: 'final',
          result: { winnerPlayerId: playerIds[1], homeScore: 2, awayScore: 0 },
        },
        {
          roundNumber: 1,
          scheduledAt: new Date('2026-06-15T22:00:00Z'),
          homePlayerId: playerIds[2],
          awayPlayerId: playerIds[5],
          status: 'final',
          result: { winnerPlayerId: playerIds[2], homeScore: 2, awayScore: 1 },
        },
        {
          roundNumber: 2,
          scheduledAt: new Date('2026-06-16T19:00:00Z'),
          homePlayerId: playerIds[0],
          awayPlayerId: playerIds[3],
          status: 'final',
          result: { winnerPlayerId: playerIds[0], homeScore: 2, awayScore: 0 },
        },
        {
          roundNumber: 2,
          scheduledAt: new Date('2026-06-16T20:00:00Z'),
          homePlayerId: playerIds[1],
          awayPlayerId: playerIds[2],
          status: 'final',
          result: { winnerPlayerId: playerIds[1], homeScore: 2, awayScore: 1 },
        },
        {
          roundNumber: 3,
          scheduledAt: new Date('2026-06-17T19:00:00Z'),
          homePlayerId: playerIds[0],
          awayPlayerId: playerIds[1],
          status: 'final',
          result: { winnerPlayerId: playerIds[0], homeScore: 2, awayScore: 1 },
        },
      ])
    );

    mockPlayerFind.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(players),
      }),
    });

    const standings = await computeTournamentPlacement(leagueId, divisionId, 'player');

    expect(standings).toHaveLength(8);
    expect(standings[0].placement).toBe(1);
    expect(standings[0].teamName).toBe('Player 1');
    expect(standings[1].placement).toBe(2);
    expect(standings[7].placement).toBe(8);
    expect(standings.every((entry) => entry.wins === 0 && entry.points === 0)).toBe(true);
  });
});
