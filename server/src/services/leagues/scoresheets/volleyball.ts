import mongoose from 'mongoose';
import type { IMatch, IMatchResult, IVolleyballMatch } from '../../../models/leagues/Match';
import { isPlayerMatch } from '../matchLabels';
import type { ScoresheetPayloadValidator, ScoresheetValidationContext } from './types';

export interface VolleyballScoresheetPayload {
  homeSetWins: number;
  awaySetWins: number;
}

export function resolveVolleyballSetsToWin(match: IMatch): 2 | 3 {
  const setsToWin = (match as IVolleyballMatch).setsToWin;
  return setsToWin === 3 ? 3 : 2;
}

export function validateVolleyballScoresheetPayload(
  payload: unknown,
  setsToWin: 2 | 3
): VolleyballScoresheetPayload {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Scoresheet payload must be an object');
  }

  const data = payload as Record<string, unknown>;
  const homeSetWins = data.homeSetWins;
  const awaySetWins = data.awaySetWins;

  if (!Number.isInteger(homeSetWins) || (homeSetWins as number) < 0) {
    throw new Error('homeSetWins must be a non-negative integer');
  }

  if (!Number.isInteger(awaySetWins) || (awaySetWins as number) < 0) {
    throw new Error('awaySetWins must be a non-negative integer');
  }

  const home = homeSetWins as number;
  const away = awaySetWins as number;

  if (home === 0 && away === 0) {
    throw new Error('At least one team must have set wins');
  }

  if (home === away) {
    throw new Error('Set wins cannot be tied — one team must win the match');
  }

  const winnerSets = Math.max(home, away);
  const loserSets = Math.min(home, away);

  if (winnerSets !== setsToWin) {
    throw new Error(`Winning team must have ${setsToWin} set wins for this match format`);
  }

  if (loserSets >= setsToWin) {
    throw new Error('Invalid set score — both teams cannot reach the sets required to win');
  }

  const totalSets = home + away;

  if (totalSets < setsToWin || totalSets > 2 * setsToWin - 1) {
    throw new Error('Invalid set count for this match format');
  }

  return { homeSetWins: home, awaySetWins: away };
}

function volleyballPayloadsMatch(
  left: Record<string, unknown>,
  right: Record<string, unknown>
): boolean {
  try {
    const aHome = left.homeSetWins;
    const aAway = left.awaySetWins;
    const bHome = right.homeSetWins;
    const bAway = right.awaySetWins;

    return (
      Number.isInteger(aHome) &&
      Number.isInteger(aAway) &&
      Number.isInteger(bHome) &&
      Number.isInteger(bAway) &&
      aHome === bHome &&
      aAway === bAway
    );
  } catch {
    return false;
  }
}

function volleyballToMatchResult(match: IMatch, payload: Record<string, unknown>): IMatchResult {
  const setsToWin = resolveVolleyballSetsToWin(match);
  const { homeSetWins, awaySetWins } = validateVolleyballScoresheetPayload(payload, setsToWin);

  let winnerTeamId: mongoose.Types.ObjectId | undefined;
  let winnerPlayerId: mongoose.Types.ObjectId | undefined;

  if (homeSetWins > awaySetWins) {
    if (isPlayerMatch(match)) {
      winnerPlayerId = match.homePlayerId;
    } else {
      winnerTeamId = match.homeTeamId;
    }
  } else if (awaySetWins > homeSetWins) {
    if (isPlayerMatch(match)) {
      winnerPlayerId = match.awayPlayerId;
    } else {
      winnerTeamId = match.awayTeamId;
    }
  }

  return {
    winnerTeamId,
    winnerPlayerId,
    homeScore: homeSetWins,
    awayScore: awaySetWins,
  };
}

export const volleyballScoresheetValidator: ScoresheetPayloadValidator = {
  sport: 'volleyball',
  validate(payload: unknown, context?: ScoresheetValidationContext): Record<string, unknown> {
    if (!context?.match) {
      throw new Error('Match context is required to validate volleyball scoresheets');
    }

    const setsToWin = resolveVolleyballSetsToWin(context.match);
    const validated = validateVolleyballScoresheetPayload(payload, setsToWin);
    return { ...validated };
  },
  payloadsMatch: volleyballPayloadsMatch,
  toMatchResult: volleyballToMatchResult,
};
