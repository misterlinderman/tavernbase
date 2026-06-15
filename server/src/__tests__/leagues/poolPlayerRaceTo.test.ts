import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { DEFAULT_POOL_PLAYER_RACE_TO } from '../../constants/leagues';
import type { IPoolMatch } from '../../models/leagues/Match';
import { validatePoolScoresheetPayload } from '../../services/leagues/scoresheets/pool';

function createPlayerPoolMatch(raceTo = DEFAULT_POOL_PLAYER_RACE_TO): IPoolMatch {
  return {
    homePlayerId: new mongoose.Types.ObjectId(),
    awayPlayerId: new mongoose.Types.ObjectId(),
    raceTo,
  } as IPoolMatch;
}

describe('validatePoolScoresheetPayload (player raceTo)', () => {
  const match = createPlayerPoolMatch(5);

  it('accepts a valid race-to-5 result', () => {
    const payload = validatePoolScoresheetPayload(
      { homeRaceWins: 5, awayRaceWins: 3 },
      { match }
    );

    expect(payload).toEqual({ homeRaceWins: 5, awayRaceWins: 3 });
  });

  it('accepts 5–4 when winner reaches raceTo', () => {
    const payload = validatePoolScoresheetPayload(
      { homeRaceWins: 4, awayRaceWins: 5 },
      { match }
    );

    expect(payload).toEqual({ homeRaceWins: 4, awayRaceWins: 5 });
  });

  it('rejects when winner has not reached raceTo', () => {
    expect(() =>
      validatePoolScoresheetPayload({ homeRaceWins: 4, awayRaceWins: 3 }, { match })
    ).toThrow(/at least 5 games won/i);
  });

  it('rejects ties', () => {
    expect(() =>
      validatePoolScoresheetPayload({ homeRaceWins: 5, awayRaceWins: 5 }, { match })
    ).toThrow(/tie/i);
  });

  it('does not enforce raceTo for team matches', () => {
    const teamMatch = {
      homeTeamId: new mongoose.Types.ObjectId(),
      awayTeamId: new mongoose.Types.ObjectId(),
      raceTo: 5,
    } as IPoolMatch;

    const payload = validatePoolScoresheetPayload(
      { homeRaceWins: 4, awayRaceWins: 3 },
      { match: teamMatch }
    );

    expect(payload).toEqual({ homeRaceWins: 4, awayRaceWins: 3 });
  });
});
