import mongoose from 'mongoose';
import type { IMatch, IMatchResult } from '../../../models/leagues/Match';
import { isPlayerMatch } from '../matchLabels';
import type { ScoresheetPayloadValidator, ScoresheetValidationContext } from './types';

export interface DartsScoresheetPayload {
  homeLegsWon: number;
  awayLegsWon: number;
}

export function validateDartsScoresheetPayload(payload: unknown): DartsScoresheetPayload {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Scoresheet payload must be an object');
  }

  const data = payload as Record<string, unknown>;
  const homeLegsWon = data.homeLegsWon;
  const awayLegsWon = data.awayLegsWon;

  if (!Number.isInteger(homeLegsWon) || (homeLegsWon as number) < 0) {
    throw new Error('homeLegsWon must be a non-negative integer');
  }

  if (!Number.isInteger(awayLegsWon) || (awayLegsWon as number) < 0) {
    throw new Error('awayLegsWon must be a non-negative integer');
  }

  if ((homeLegsWon as number) === 0 && (awayLegsWon as number) === 0) {
    throw new Error('At least one team must have legs won');
  }

  return {
    homeLegsWon: homeLegsWon as number,
    awayLegsWon: awayLegsWon as number,
  };
}

function dartsPayloadsMatch(
  left: Record<string, unknown>,
  right: Record<string, unknown>
): boolean {
  try {
    const a = validateDartsScoresheetPayload(left);
    const b = validateDartsScoresheetPayload(right);
    return a.homeLegsWon === b.homeLegsWon && a.awayLegsWon === b.awayLegsWon;
  } catch {
    return false;
  }
}

function dartsToMatchResult(match: IMatch, payload: Record<string, unknown>): IMatchResult {
  const { homeLegsWon, awayLegsWon } = validateDartsScoresheetPayload(payload);

  let winnerTeamId: mongoose.Types.ObjectId | undefined;
  let winnerPlayerId: mongoose.Types.ObjectId | undefined;

  if (homeLegsWon > awayLegsWon) {
    if (isPlayerMatch(match)) {
      winnerPlayerId = match.homePlayerId;
    } else {
      winnerTeamId = match.homeTeamId;
    }
  } else if (awayLegsWon > homeLegsWon) {
    if (isPlayerMatch(match)) {
      winnerPlayerId = match.awayPlayerId;
    } else {
      winnerTeamId = match.awayTeamId;
    }
  }

  return {
    winnerTeamId,
    winnerPlayerId,
    homeScore: homeLegsWon,
    awayScore: awayLegsWon,
  };
}

export const dartsScoresheetValidator: ScoresheetPayloadValidator = {
  sport: 'darts',
  validate(payload: unknown, _context?: ScoresheetValidationContext): Record<string, unknown> {
    const validated = validateDartsScoresheetPayload(payload);
    return { ...validated };
  },
  payloadsMatch: dartsPayloadsMatch,
  toMatchResult: dartsToMatchResult,
};
