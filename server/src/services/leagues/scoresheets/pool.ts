import mongoose from 'mongoose';
import { DEFAULT_POOL_PLAYER_RACE_TO } from '../../../constants/leagues';
import type { IMatch, IMatchResult, IPoolMatch } from '../../../models/leagues/Match';
import { isPlayerMatch } from '../matchLabels';
import type { ScoresheetPayloadValidator, ScoresheetValidationContext } from './types';

export interface PoolScoresheetPayload {
  homeRaceWins: number;
  awayRaceWins: number;
}

function resolvePoolRaceTo(match?: IMatch): number | undefined {
  if (!match || !isPlayerMatch(match)) {
    return undefined;
  }

  const poolMatch = match as IPoolMatch;
  return poolMatch.raceTo ?? DEFAULT_POOL_PLAYER_RACE_TO;
}

export function validatePoolScoresheetPayload(
  payload: unknown,
  context?: ScoresheetValidationContext
): PoolScoresheetPayload {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Scoresheet payload must be an object');
  }

  const data = payload as Record<string, unknown>;
  const homeRaceWins = data.homeRaceWins;
  const awayRaceWins = data.awayRaceWins;

  if (!Number.isInteger(homeRaceWins) || (homeRaceWins as number) < 0) {
    throw new Error('homeRaceWins must be a non-negative integer');
  }

  if (!Number.isInteger(awayRaceWins) || (awayRaceWins as number) < 0) {
    throw new Error('awayRaceWins must be a non-negative integer');
  }

  if ((homeRaceWins as number) === 0 && (awayRaceWins as number) === 0) {
    throw new Error('At least one side must have games won');
  }

  const raceTo = resolvePoolRaceTo(context?.match);

  if (raceTo !== undefined) {
    if ((homeRaceWins as number) === (awayRaceWins as number)) {
      throw new Error('Match cannot end in a tie');
    }

    const winnerScore = Math.max(homeRaceWins as number, awayRaceWins as number);
    const loserScore = Math.min(homeRaceWins as number, awayRaceWins as number);

    if (winnerScore < raceTo) {
      throw new Error(`Winner must have at least ${raceTo} games won (race to ${raceTo})`);
    }

    if (loserScore >= raceTo) {
      throw new Error(`Loser cannot have ${raceTo} or more games won in a race to ${raceTo}`);
    }
  }

  return {
    homeRaceWins: homeRaceWins as number,
    awayRaceWins: awayRaceWins as number,
  };
}

function poolPayloadsMatch(
  left: Record<string, unknown>,
  right: Record<string, unknown>
): boolean {
  try {
    const a = validatePoolScoresheetPayload(left);
    const b = validatePoolScoresheetPayload(right);
    return a.homeRaceWins === b.homeRaceWins && a.awayRaceWins === b.awayRaceWins;
  } catch {
    return false;
  }
}

function poolToMatchResult(match: IMatch, payload: Record<string, unknown>): IMatchResult {
  const { homeRaceWins, awayRaceWins } = validatePoolScoresheetPayload(payload, { match });

  let winnerTeamId: mongoose.Types.ObjectId | undefined;
  let winnerPlayerId: mongoose.Types.ObjectId | undefined;

  if (homeRaceWins > awayRaceWins) {
    if (isPlayerMatch(match)) {
      winnerPlayerId = match.homePlayerId;
    } else {
      winnerTeamId = match.homeTeamId;
    }
  } else if (awayRaceWins > homeRaceWins) {
    if (isPlayerMatch(match)) {
      winnerPlayerId = match.awayPlayerId;
    } else {
      winnerTeamId = match.awayTeamId;
    }
  }

  return {
    winnerTeamId,
    winnerPlayerId,
    homeScore: homeRaceWins,
    awayScore: awayRaceWins,
  };
}

export const poolScoresheetValidator: ScoresheetPayloadValidator = {
  sport: 'pool',
  validate(payload: unknown, context?: ScoresheetValidationContext): Record<string, unknown> {
    const validated = validatePoolScoresheetPayload(payload, context);
    return { ...validated };
  },
  payloadsMatch: poolPayloadsMatch,
  toMatchResult: poolToMatchResult,
};
