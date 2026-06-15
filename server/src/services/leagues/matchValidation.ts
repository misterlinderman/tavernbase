import type { IMatch } from '../../models/leagues/Match';
import { createError } from '../../middleware/errorHandler';

export function validateMatchParticipants(match: Pick<
  IMatch,
  'homeTeamId' | 'awayTeamId' | 'homePlayerId' | 'awayPlayerId'
>): void {
  const hasTeams = Boolean(match.homeTeamId && match.awayTeamId);
  const hasPlayers = Boolean(match.homePlayerId && match.awayPlayerId);

  if (hasTeams && hasPlayers) {
    throw createError('Match cannot have both team and player participants', 400);
  }

  if (!hasTeams && !hasPlayers) {
    throw createError('Match must have home/away teams or home/away players', 400);
  }

  if (hasTeams && (match.homePlayerId || match.awayPlayerId)) {
    throw createError('Team matches cannot include player participant fields', 400);
  }

  if (hasPlayers && (match.homeTeamId || match.awayTeamId)) {
    throw createError('Player matches cannot include team participant fields', 400);
  }
}
