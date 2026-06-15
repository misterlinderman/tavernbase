import {
  type EntrantType,
  type LeagueFormat,
  type LeagueKind,
  type PoolFormat,
  type Sport,
} from '../../constants/leagues';
import { createError } from '../../middleware/errorHandler';

export const TOURNAMENT_WARN_DAYS = 14;
export const TOURNAMENT_MAX_DAYS = 60;

export const MAX_DIVISION_ENTRANTS = 64;

export function seasonSpanDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.ceil(ms / 86_400_000);
}

export function resolveLeagueKind(kind?: LeagueKind): LeagueKind {
  return kind ?? 'league';
}

export function resolveEntrantType(entrantType?: EntrantType): EntrantType {
  return entrantType ?? 'team';
}

export function validateLeagueFields(input: {
  kind: LeagueKind;
  entrantType: EntrantType;
  format: LeagueFormat;
  seasonStart: Date;
  seasonEnd: Date;
}): void {
  if (input.kind === 'tournament' && input.format !== 'bracket') {
    throw createError('Tournaments must use bracket format', 400);
  }

  if (input.kind === 'tournament') {
    const days = seasonSpanDays(input.seasonStart, input.seasonEnd);

    if (days > TOURNAMENT_MAX_DAYS) {
      throw createError(
        `Tournament date range cannot exceed ${TOURNAMENT_MAX_DAYS} days`,
        400
      );
    }
  }
}

export function defaultPoolFormatForLeague(
  kind: LeagueKind,
  sport: Sport,
  poolFormat?: PoolFormat
): PoolFormat | undefined {
  if (sport !== 'pool') {
    return undefined;
  }

  if (kind === 'tournament') {
    return poolFormat ?? '9_ball';
  }

  return poolFormat ?? '8_ball';
}
